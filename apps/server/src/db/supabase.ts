import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Question, QuestionStatus } from '@segue/shared';
import { config } from '../config';

export type QuestionRow = {
  id: string;
  text: string;
  status: QuestionStatus;
  author: string | null;
  category: string | null;
  created_at: number;
};

interface QuestionTable {
  Row: QuestionRow;
  Insert: Pick<QuestionRow, 'id' | 'text' | 'status'> & Partial<Omit<QuestionRow, 'id' | 'text' | 'status'>>;
  Update: Partial<QuestionRow>;
  Relationships: [];
}

interface Database {
  public: {
    Tables: {
      questions: QuestionTable;
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
  const { count, error } = await getSupabase()
    .from('questions')
    .select('*', { count: 'exact', head: true });
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
