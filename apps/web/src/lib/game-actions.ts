import type { RoomResponse } from './api';
import { apiRequest } from './api';

export interface GameActionContext {
  getCode: () => string | null;
  getToken: () => string | null;
  getPlayerId: () => string | null;
  getRoom: () => { code: string; phase?: string } | null;
  setRoom: (room: { phase?: string }) => void;
  setJudging: (v: boolean) => void;
  setLoadingReveal: (v: boolean) => void;
  setError: (msg: string) => void;
  setPendingAnswer: (answer: string | null) => void;
  setOptimisticAnswer: (playerId: string, answer: string, answeredCount: number) => void;
}

async function fetchRoom(ctx: GameActionContext, endpoint: string, body?: Record<string, unknown>): Promise<RoomResponse | null> {
  const code = ctx.getCode();
  const token = ctx.getToken();
  if (!code || !token) return null;
  const res = await apiRequest<RoomResponse>(`/api/rooms/${code}/${endpoint}`, { body: { token, ...body } });
  if (res.ok) return res.data;
  ctx.setError(res.error);
  return null;
}

export async function submitAnswer(ctx: GameActionContext, answer: string): Promise<boolean> {
  const room = ctx.getRoom();
  const playerId = ctx.getPlayerId();
  if (!room || !playerId) return false;

  ctx.setPendingAnswer(answer);
  ctx.setOptimisticAnswer(playerId, answer, (room as { answeredCount?: number }).answeredCount ?? 0);

  const data = await fetchRoom(ctx, 'answer', { answer });
  if (!data) {
    ctx.setPendingAnswer(null);
    return false;
  }
  ctx.setRoom(data.room);
  ctx.setPendingAnswer(null);
  return true;
}

export async function forceReveal(ctx: GameActionContext): Promise<boolean> {
  ctx.setLoadingReveal(true);
  const data = await fetchRoom(ctx, 'reveal', { force: true });
  if (!data) {
    ctx.setLoadingReveal(false);
    return false;
  }
  ctx.setRoom(data.room);
  ctx.setLoadingReveal(false);
  return true;
}

export async function autoReveal(ctx: GameActionContext): Promise<boolean> {
  ctx.setLoadingReveal(true);
  const data = await fetchRoom(ctx, 'reveal');
  if (!data) {
    ctx.setLoadingReveal(false);
    return false;
  }
  ctx.setRoom(data.room);
  ctx.setLoadingReveal(false);
  return true;
}

export async function nextStep(ctx: GameActionContext): Promise<boolean> {
  const data = await fetchRoom(ctx, 'next');
  if (!data) return false;
  ctx.setRoom(data.room);
  return true;
}

export async function playAgain(ctx: GameActionContext): Promise<boolean> {
  const data = await fetchRoom(ctx, 'play-again');
  if (!data) return false;
  ctx.setRoom(data.room);
  return true;
}

export async function startGame(ctx: GameActionContext): Promise<boolean> {
  const data = await fetchRoom(ctx, 'start');
  if (!data) return false;
  ctx.setRoom(data.room);
  return true;
}
