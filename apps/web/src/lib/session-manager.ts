import type { Room, RoomSettings } from '@segue/shared';
import type { RoomResponse, Joined } from './api';
import { apiRequest } from './api';
import { subscribeRoom, unsubscribeRoom } from './realtime';

const TOKEN_KEY = 'segue-matilha-token';

export function loadStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export interface SessionContext {
  setRoom: (room: Room) => void;
  setPlayerId: (id: string) => void;
  setToken: (token: string) => void;
  setError: (msg: string) => void;
  setConnected: (v: boolean) => void;
  reset: () => void;
}

function applyJoined(ctx: SessionContext, data: RoomResponse, joined: Joined): void {
  saveToken(joined.token);
  ctx.setRoom(data.room);
  ctx.setPlayerId(joined.playerId);
  ctx.setToken(joined.token);
  subscribeRoom(joined.roomCode);
}

export async function createRoom(
  ctx: SessionContext,
  hostName: string,
  avatarId: string,
  settings: Partial<RoomSettings>
): Promise<{ ok: boolean; error?: string }> {
  const res = await apiRequest<RoomResponse>('/api/rooms', { body: { hostName, avatarId, settings } });
  if (res.ok) {
    applyJoined(ctx, res.data, res.data.joined!);
    return { ok: true };
  }
  ctx.setError(res.error);
  return { ok: false, error: res.error };
}

export async function joinRoom(
  ctx: SessionContext,
  roomCode: string,
  playerName: string,
  avatarId: string
): Promise<{ ok: boolean; error?: string }> {
  const code = String(roomCode ?? '').trim().toUpperCase().slice(0, 4);
  const res = await apiRequest<RoomResponse>(`/api/rooms/${code}/join`, { body: { playerName, avatarId } });
  if (res.ok) {
    applyJoined(ctx, res.data, res.data.joined!);
    return { ok: true };
  }
  if (res.code === 'room_started') {
    const re = await apiRequest<RoomResponse>(`/api/rooms/${code}/rejoin`, { body: { playerName, avatarId } });
    if (re.ok) {
      applyJoined(ctx, re.data, re.data.joined!);
      return { ok: true };
    }
    ctx.setError(re.error);
    return { ok: false, error: re.error };
  }
  ctx.setError(res.error);
  return { ok: false, error: res.error };
}

export async function rejoin(ctx: SessionContext): Promise<{ ok: boolean }> {
  const token = loadStoredToken();
  if (!token) {
    ctx.setToken('');
    return { ok: false };
  }
  const res = await apiRequest<RoomResponse>('/api/rooms/rejoin', { body: { token } });
  if (res.ok) {
    applyJoined(ctx, res.data, res.data.joined!);
    return { ok: true };
  }
  clearToken();
  ctx.setToken('');
  return { ok: false };
}

export function leaveRoom(ctx: SessionContext, room: { code: string } | null, token: string | null): void {
  if (room && token) {
    void apiRequest(`/api/rooms/${room.code}/leave`, { body: { token } });
  }
  clearToken();
  unsubscribeRoom();
  ctx.reset();
}

export async function heartbeat(ctx: SessionContext, room: { code: string } | null, token: string | null): Promise<void> {
  if (!room || !token) return;
  const res = await apiRequest<RoomResponse>(`/api/rooms/${room.code}/heartbeat`, { body: { token } });
  if (res.ok) {
    ctx.setRoom(res.data.room);
    ctx.setConnected(true);
  }
}
