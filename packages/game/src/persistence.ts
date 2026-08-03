import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LIMITS } from '@segue/shared';
import type { Question, QuestionStatus } from '@segue/shared';
import { config } from './config';
import { isDuplicateText } from './questions';
import { GameError, reapStale } from './state';
import type { GameRoom } from './state';

export type QuestionRow = {
  id: string;
  text: string;
  status: QuestionStatus;
  author: string | null;
  category: string | null;
  created_at: number;
};

type RoomRow = {
  code: string;
  state: GameRoom;
  phase: string;
  version: number;
  updated_at: number;
  created_at: number;
};

type SessionRow = {
  token: string;
  room_code: string;
  player_id: string;
  created_at: number;
};

interface QuestionTable {
  Row: QuestionRow;
  Insert: Pick<QuestionRow, 'id' | 'text' | 'status'> & Partial<Omit<QuestionRow, 'id' | 'text' | 'status'>>;
  Update: Partial<QuestionRow>;
  Relationships: [];
}

interface RoomTable {
  Row: RoomRow;
  Insert: Pick<RoomRow, 'code' | 'state' | 'phase' | 'updated_at' | 'created_at'>;
  Update: Partial<RoomRow>;
  Relationships: [];
}

interface SessionTable {
  Row: SessionRow;
  Insert: SessionRow;
  Update: Partial<SessionRow>;
  Relationships: [];
}

interface Database {
  public: {
    Tables: {
      questions: QuestionTable;
      rooms: RoomTable;
      sessions: SessionTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

type Db = SupabaseClient<Database, 'public'>;

let supabase: Db | null = null;

export function getSupabase(): Db {
  if (!supabase) {
    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios no .env');
    }
    supabase = createClient<Database, 'public'>(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return supabase;
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string }).code === '23505';
}

// ---------------------------------------------------------------------------
// Perguntas
// ---------------------------------------------------------------------------

function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    text: row.text,
    status: row.status,
    author: row.author ?? undefined,
    category: row.category ?? undefined,
    createdAt: row.created_at,
  };
}

export async function countQuestions(): Promise<number> {
  const { count, error } = await getSupabase().from('questions').select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function listQuestions(status?: QuestionStatus): Promise<Question[]> {
  let query = getSupabase().from('questions').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toQuestion);
}

export async function getApprovedQuestions(): Promise<Question[]> {
  const { data, error } = await getSupabase()
    .from('questions')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []).map(toQuestion);
}

/** True se ja existe pergunta com o mesmo texto normalizado (qualquer status). */
export async function questionTextExists(text: string): Promise<boolean> {
  const { data, error } = await getSupabase().from('questions').select('text').limit(2000);
  if (error) throw error;
  return isDuplicateText(text, (data ?? []).map((q) => q.text));
}

export async function insertQuestion(input: {
  text: string;
  status: QuestionStatus;
  author?: string;
  category?: string;
}): Promise<Question> {
  const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const row: QuestionRow = {
    id,
    text: input.text,
    status: input.status,
    author: input.author ?? 'Jogador',
    category: input.category ?? 'Geral',
    created_at: Date.now(),
  };
  const { error } = await getSupabase().from('questions').insert(row);
  if (error) throw error;
  return toQuestion(row);
}

export async function updateQuestionStatus(id: string, status: QuestionStatus): Promise<void> {
  const { error } = await getSupabase().from('questions').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await getSupabase().from('questions').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Salas (estado JSONB + concorrencia otimista via version)
// ---------------------------------------------------------------------------

export interface RoomRef {
  code: string;
  version: number;
  state: GameRoom;
}

export async function insertRoom(state: GameRoom, now: number): Promise<boolean> {
  const { error } = await getSupabase().from('rooms').insert({
    code: state.code,
    state,
    phase: state.phase,
    updated_at: now,
    created_at: now,
  });
  if (!error) return true;
  if (isUniqueViolation(error)) return false;
  throw error;
}

export async function readRoom(code: string): Promise<RoomRef | null> {
  const { data, error } = await getSupabase().from('rooms').select('state, version').eq('code', code).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const state = data.state as GameRoom;
  const now = Date.now();
  const allGone = state.players.every((p) => !p.connected);
  if (state.players.length === 0 || (allGone && now - state.updatedAt > LIMITS.ROOM_EXPIRE_MS)) {
    await deleteRoom(code).catch(() => {});
    return null;
  }
  for (const p of state.players) {
    if (p.perdidosCount == null) {
      p.perdidosCount = p.roundScores.filter((s) => s === LIMITS.POINTS_PERDIDOS).length;
    }
  }
  return { code, version: data.version, state };
}

export async function writeRoom(ref: RoomRef, now: number): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('rooms')
    .update({
      state: ref.state,
      phase: ref.state.phase,
      updated_at: now,
      version: ref.version + 1,
    })
    .eq('code', ref.code)
    .eq('version', ref.version)
    .select('code')
    .maybeSingle();
  if (error) throw error;
  return data != null;
}

export async function deleteRoom(code: string): Promise<void> {
  await getSupabase().from('rooms').delete().eq('code', code);
}

export async function countRooms(): Promise<number> {
  const { count, error } = await getSupabase().from('rooms').select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export interface WithRoomResult<T> {
  result: T;
  state: GameRoom;
}

/**
 * Le a sala, aplica `fn` no estado (com reap de desconectados) e persiste com
 * concorrencia otimista. Se outra instancia serverless ganhar a escrita, rele
 * e re-aplica. Retorna null se a sala nao existe.
 */
export async function withRoom<T>(
  code: string,
  fn: (state: GameRoom, now: number) => T | Promise<T>,
  opts: { reap?: boolean; maxRetries?: number; detectChanges?: boolean } = {}
): Promise<WithRoomResult<T> | null> {
  const maxRetries = opts.maxRetries ?? 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const ref = await readRoom(code);
    if (!ref) return null;
    const now = Date.now();
    if (opts.reap !== false) reapStale(ref.state, now);
    const before = opts.detectChanges ? JSON.stringify(ref.state) : null;
    const result = await fn(ref.state, now);
    if (opts.detectChanges && before === JSON.stringify(ref.state)) {
      return { result, state: ref.state };
    }
    if (await writeRoom(ref, now)) return { result, state: ref.state };
  }
  throw new GameError('Conflito de concorrência. Tente novamente.', 'concurrency');
}

// ---------------------------------------------------------------------------
// Sessoes (token <-> sala/jogador)
// ---------------------------------------------------------------------------

export async function createSession(token: string, roomCode: string, playerId: string, now: number): Promise<void> {
  const { error } = await getSupabase()
    .from('sessions')
    .insert({ token, room_code: roomCode, player_id: playerId, created_at: now });
  if (error) throw error;
}

export async function getSession(token: string): Promise<{ roomCode: string; playerId: string } | null> {
  const { data, error } = await getSupabase()
    .from('sessions')
    .select('room_code, player_id')
    .eq('token', token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { roomCode: data.room_code, playerId: data.player_id };
}

export async function deleteSession(token: string): Promise<void> {
  await getSupabase().from('sessions').delete().eq('token', token);
}

export async function deletePlayerSessions(roomCode: string, playerId: string): Promise<void> {
  await getSupabase().from('sessions').delete().eq('room_code', roomCode).eq('player_id', playerId);
}
