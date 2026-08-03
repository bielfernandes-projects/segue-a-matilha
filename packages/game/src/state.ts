import { LIMITS, getAvatarColor } from '@segue/shared';
import type {
  AnswerStatus,
  Phase,
  Player,
  PlayerStatus,
  Question,
  RevealAnswer,
  Room,
  RoomSettings,
  RoundReveal,
} from '@segue/shared';
import { applyRoundScore, isGameOver, scoreClusters } from '@segue/shared';
import { groupAnswers } from './judge';
import type { JudgeFn } from './judge';
import { pickQuestion } from './questions';

export class GameError extends Error {
  code: string;
  constructor(message: string, code = 'game_error') {
    super(message);
    this.code = code;
  }
}

/** Estado completo da sala (serializavel em JSONB). */
export interface GameRoom extends Room {
  prevPhase?: Phase;
  usedQuestionIds: string[];
}

const HISTORY_LIMIT = 10;

function clamp(v: unknown, min: number, max: number, def: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeSettings(input: Partial<RoomSettings> | undefined): RoomSettings {
  const mode = input?.mode === 'target' ? 'target' : 'rounds';
  return {
    mode,
    totalRounds: clamp(input?.totalRounds, LIMITS.ROUNDS_MIN, LIMITS.ROUNDS_MAX, LIMITS.ROUNDS_DEFAULT),
    targetScore: clamp(input?.targetScore, LIMITS.TARGET_MIN, LIMITS.TARGET_MAX, LIMITS.TARGET_DEFAULT),
    timeLimitSeconds: clamp(
      input?.timeLimitSeconds,
      LIMITS.TIMER_MIN_SECONDS,
      LIMITS.TIMER_MAX_SECONDS,
      LIMITS.TIMER_DEFAULT_SECONDS
    ),
  };
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makePlayer(id: string, name: string, avatarId: string, isHost: boolean): Player {
  return {
    id,
    name: name.trim().slice(0, 18),
    avatarId,
    color: getAvatarColor(avatarId),
    isHost,
    connected: true,
    score: 0,
    roundScores: [],
    streak: 0,
    bestStreak: 0,
    loneWolfCount: 0,
    perdidosCount: 0,
    hasAnswered: false,
    absentRounds: 0,
    lastSeenAt: Date.now(),
  };
}

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Gera um codigo de sala sempre com 4 LETRAS maiusculas (sem digitos, sem I/O). */
export function generateRoomCode(): string {
  return Array.from({ length: LIMITS.ROOM_CODE_LENGTH }, () =>
    ROOM_CODE_ALPHABET.charAt(Math.floor(Math.random() * ROOM_CODE_ALPHABET.length))
  ).join('');
}

export function createRoomState(
  hostName: string,
  avatarId: string,
  settings?: Partial<RoomSettings>
): { state: GameRoom; playerId: string } {
  const code = generateRoomCode();
  const playerId = newId('p');
  const now = Date.now();

  const state: GameRoom = {
    code,
    phase: 'lobby',
    hostId: playerId,
    settings: normalizeSettings(settings),
    players: [makePlayer(playerId, hostName, avatarId, true)],
    currentRound: 0,
    answeredCount: 0,
    roundHistory: [],
    createdAt: now,
    updatedAt: now,
    usedQuestionIds: [],
  };

  return { state, playerId };
}

export function joinRoomState(state: GameRoom, playerName: string, avatarId: string): Player {
  if (state.phase !== 'lobby') {
    throw new GameError('A partida já começou. Espere o próximo jogo.', 'room_started');
  }
  if (state.players.length >= LIMITS.MAX_PLAYERS) {
    throw new GameError(`A sala atingiu o limite de ${LIMITS.MAX_PLAYERS} jogadores.`, 'room_full');
  }
  const player = makePlayer(newId('p'), playerName, avatarId, false);
  state.players.push(player);
  state.updatedAt = Date.now();
  return player;
}

export function startGameState(state: GameRoom, playerId: string, pool: Question[]): void {
  if (state.hostId !== playerId) throw new GameError('Apenas o Host pode iniciar.', 'forbidden');
  if (state.phase !== 'lobby') throw new GameError('A partida já começou.', 'already_started');
  if (state.players.length < 2) {
    throw new GameError('Preciso de pelo menos 2 jogadores para começar.', 'too_few');
  }
  if (pool.length === 0) {
    throw new GameError('Não há perguntas aprovadas. Verifique o painel admin.', 'no_questions');
  }

  state.usedQuestionIds = [];
  state.roundHistory = [];
  state.currentRound = 1;
  state.phase = 'question';
  state.pausedReason = undefined;
  beginRoundState(state, pool);
}

function beginRoundState(state: GameRoom, pool: Question[]): void {
  const used = new Set(state.usedQuestionIds);
  state.question = pickQuestion(pool, used);
  state.usedQuestionIds = [...used];
  state.deadline = Date.now() + state.settings.timeLimitSeconds * 1000;
  state.answeredCount = 0;
  state.players.forEach((p) => {
    p.hasAnswered = false;
    p.currentAnswer = undefined;
  });
  state.updatedAt = Date.now();
}

export function submitAnswerState(
  state: GameRoom,
  playerId: string,
  rawAnswer: string
): { needsReveal: boolean } {
  if (state.phase !== 'question') throw new GameError('A rodada já terminou.', 'not_question');
  if (state.deadline && Date.now() >= state.deadline) {
    throw new GameError('O tempo acabou.', 'time_up');
  }

  const answer = typeof rawAnswer === 'string' ? rawAnswer.trim() : '';
  if (answer.length < LIMITS.ANSWER_MIN_LENGTH) {
    throw new GameError('Digite uma resposta de pelo menos 1 caractere.', 'answer_invalid');
  }
  if (answer.length > LIMITS.ANSWER_MAX_LENGTH) {
    throw new GameError(`Resposta muito longa (máx ${LIMITS.ANSWER_MAX_LENGTH} caracteres).`, 'answer_invalid');
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new GameError('Jogador não encontrado.', 'player_not_found');

  player.currentAnswer = answer;
  player.hasAnswered = true;
  player.absentRounds = 0;
  state.answeredCount = state.players.filter((p) => p.hasAnswered).length;
  state.updatedAt = Date.now();

  const connected = state.players.filter((p) => p.connected);
  const needsReveal = connected.length > 0 && connected.every((p) => p.hasAnswered);
  return { needsReveal };
}

export function isQuestionPhase(state: GameRoom): boolean {
  return state.phase === 'question' || (state.phase === 'paused' && state.prevPhase === 'question');
}

export async function processRevealState(
  state: GameRoom,
  judge: JudgeFn = groupAnswers
): Promise<RoundReveal | null> {
  if (!isQuestionPhase(state)) return null;

  // Marca a fase ANTES do await para evitar processamento duplicado.
  state.phase = 'reveal';
  state.prevPhase = undefined;
  state.pausedReason = undefined;
  state.updatedAt = Date.now();

  const answered = state.players.filter((p) => p.hasAnswered && p.currentAnswer);
  const answers = answered.map((p) => ({
    playerId: p.id,
    playerName: p.name,
    avatarId: p.avatarId,
    color: p.color,
    text: p.currentAnswer as string,
  }));

  const judged = await judge(state.question?.text ?? '', answers.map((a) => a.text));

  const pool = new Map<string, RevealAnswer[]>();
  for (const a of answers) {
    const key = a.text.trim().toLowerCase();
    if (!pool.has(key)) pool.set(key, []);
    pool.get(key)!.push(a);
  }

  const clustersInput: { rotulo: string; respostas: RevealAnswer[] }[] = [];
  for (const cluster of judged.clusters) {
    const respostas: RevealAnswer[] = [];
    for (const text of cluster.respostas) {
      const key = text.trim().toLowerCase();
      const entry = pool.get(key);
      if (entry && entry.length > 0) {
        respostas.push(entry.shift() as RevealAnswer);
      }
    }
    if (respostas.length > 0) {
      clustersInput.push({ rotulo: cluster.rotulo, respostas });
    }
  }
  for (const entry of pool.values()) {
    for (const leftover of entry) {
      clustersInput.push({ rotulo: leftover.text, respostas: [leftover] });
    }
  }

  const scored = scoreClusters(clustersInput);

  const pointsByPlayer = new Map<string, number>();
  for (const c of scored) {
    for (const r of c.respostas) pointsByPlayer.set(r.playerId, c.points);
  }

  const statusByPlayer: PlayerStatus[] = state.players.map((p) => {
    const answeredNow = pointsByPlayer.has(p.id);
    const status: AnswerStatus = answeredNow
      ? 'answered'
      : p.connected
        ? 'no_answer'
        : 'disconnected';
    if (answeredNow) {
      p.absentRounds = 0;
    } else if (!p.connected) {
      p.absentRounds += 1;
    }
    const points = pointsByPlayer.get(p.id) ?? LIMITS.POINTS_LOBO;
    applyRoundScore(p, points);
    return {
      playerId: p.id,
      playerName: p.name,
      avatarId: p.avatarId,
      color: p.color,
      status,
    };
  });

  const reveal: RoundReveal = {
    roundNumber: state.currentRound,
    question: state.question!,
    clusters: scored,
    offline: judged.offline,
    statusByPlayer,
  };
  state.reveal = reveal;
  state.roundHistory.push(reveal);
  if (state.roundHistory.length > HISTORY_LIMIT) state.roundHistory.shift();

  removeAbsentState(state);
  return reveal;
}

export async function forceRevealState(state: GameRoom, playerId: string): Promise<RoundReveal | null> {
  if (state.hostId !== playerId) throw new GameError('Apenas o Host pode revelar agora.', 'forbidden');
  return processRevealState(state);
}

export function nextStepState(state: GameRoom, playerId: string, pool: Question[]): void {
  if (state.hostId !== playerId) throw new GameError('Apenas o Host pode avançar.', 'forbidden');

  if (state.phase === 'reveal') {
    state.phase = 'leaderboard';
    state.updatedAt = Date.now();
    return;
  }

  if (state.phase === 'leaderboard') {
    if (isGameOver(state)) {
      state.phase = 'finished';
      state.updatedAt = Date.now();
      return;
    }
    state.currentRound += 1;
    state.phase = 'question';
    beginRoundState(state, pool);
    return;
  }

  throw new GameError('Ação inválida neste momento.', 'bad_phase');
}

export function playAgainState(state: GameRoom, playerId: string): void {
  if (state.hostId !== playerId) throw new GameError('Apenas o Host pode reiniciar.', 'forbidden');
  if (state.phase !== 'finished') throw new GameError('A partida ainda não terminou.', 'bad_phase');

  state.phase = 'lobby';
  state.currentRound = 0;
  state.roundHistory = [];
  state.reveal = undefined;
  state.question = undefined;
  state.deadline = undefined;
  state.answeredCount = 0;
  state.usedQuestionIds = [];
  state.players.forEach((p) => {
    p.score = 0;
    p.roundScores = [];
    p.streak = 0;
    p.bestStreak = 0;
    p.loneWolfCount = 0;
    p.hasAnswered = false;
    p.currentAnswer = undefined;
    p.absentRounds = 0;
  });
  state.updatedAt = Date.now();
}

export function promoteHost(state: GameRoom): void {
  const next = state.players.find((p) => p.connected) || state.players[0];
  if (!next) return;
  state.players.forEach((p) => (p.isHost = false));
  next.isHost = true;
  state.hostId = next.id;
}

function handleHostDisconnect(state: GameRoom): void {
  const host = state.players.find((p) => p.id === state.hostId);
  if (!host || host.connected) return;
  const otherConnected = state.players.some((p) => p.connected && p.id !== host.id);
  if (!otherConnected) {
    if (state.phase !== 'lobby') {
      state.prevPhase = state.phase;
      state.phase = 'paused';
      state.pausedReason = 'O Host se desconectou. Aguardando um novo Host...';
    }
  } else {
    promoteHost(state);
    resumeAfterHostPromotion(state);
  }
}

function resumeAfterHostPromotion(state: GameRoom): void {
  if (state.phase !== 'paused') return;
  state.phase = state.prevPhase || 'lobby';
  state.prevPhase = undefined;
  state.pausedReason = undefined;
}

export function markDisconnectedState(state: GameRoom, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;
  player.connected = false;
  handleHostDisconnect(state);
  state.updatedAt = Date.now();
}

export function reconnectPlayerState(state: GameRoom, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;
  player.connected = true;
  if (state.phase === 'paused') {
    promoteHost(state);
    resumeAfterHostPromotion(state);
  }
  state.updatedAt = Date.now();
}

/** Tempo sem heartbeat para considerar o jogador desconectado. */
export const CONNECTED_STALE_MS = 45_000;

/**
 * Marca como desconectados os jogadores cujo ultimo heartbeat passou do limiar.
 * So roda fora das fases 'question'/'paused' (nao atrapalha a rodada em curso).
 */
export function reapStale(state: GameRoom, now: number): void {
  if (state.phase === 'question' || state.phase === 'paused') return;
  let changed = false;
  for (const p of state.players) {
    if (p.connected && p.lastSeenAt && now - p.lastSeenAt > CONNECTED_STALE_MS) {
      p.connected = false;
      changed = true;
    }
  }
  if (changed) {
    handleHostDisconnect(state);
    state.updatedAt = now;
  }
}

export function removeAbsentState(state: GameRoom): { playerId: string; playerName: string }[] {
  const removed: { playerId: string; playerName: string }[] = [];
  const toRemove = state.players.filter((p) => p.absentRounds >= LIMITS.ABSENT_ROUNDS_BEFORE_REMOVE);
  for (const p of toRemove) {
    removed.push({ playerId: p.id, playerName: p.name });
    state.players.splice(state.players.indexOf(p), 1);
  }
  if (state.players.length === 0) return removed;
  if (!state.players.some((p) => p.isHost)) promoteHost(state);
  state.updatedAt = Date.now();
  return removed;
}

export function removePlayerState(
  state: GameRoom,
  playerId: string
): { removed: boolean; hostChanged: boolean; isEmpty: boolean } {
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return { removed: false, hostChanged: false, isEmpty: false };
  const removed = state.players[idx];
  state.players.splice(idx, 1);
  state.updatedAt = Date.now();
  if (state.players.length === 0) return { removed: true, hostChanged: false, isEmpty: true };
  if (removed.isHost) {
    promoteHost(state);
    return { removed: true, hostChanged: true, isEmpty: false };
  }
  return { removed: true, hostChanged: false, isEmpty: false };
}

/**
 * Snapshot publico enviado aos clientes (REST + broadcast).
 * Durante a fase 'question' o currentAnswer de OUTROS jogadores e omitido
 * (anti-cheat: ninguem ve a resposta alheia em tempo real).
 * roundHistory e omitido no payload (nao usado pelas telas; mantido no banco).
 */
export function buildPublicRoom(room: GameRoom, viewerId?: string): Room {
  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    settings: room.settings,
    players: room.players.map((p) => ({
      ...p,
      currentAnswer: p.id === viewerId ? p.currentAnswer : undefined,
    })),
    currentRound: room.currentRound,
    question: room.question,
    deadline: room.deadline,
    answeredCount: room.answeredCount,
    reveal: room.reveal,
    roundHistory: [],
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    pausedReason: room.pausedReason,
  };
}
