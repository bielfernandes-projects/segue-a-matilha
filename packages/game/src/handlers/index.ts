import type { Request, Response, NextFunction } from 'express';
import { GameError, buildPublicRoom } from '@segue/game';
import { getSession, withRoom } from '@segue/game';
import type { GameRoom } from '@segue/game';

export interface SessionData {
  token: string;
  roomCode: string;
  playerId: string;
}

export async function requireSession(req: Request): Promise<SessionData> {
  const token = String(req.body?.token ?? req.query?.token ?? '').trim();
  if (!token) throw new GameError('Sessão expirada. Entre na sala novamente.', 'bad_token');
  const session = await getSession(token);
  if (!session) throw new GameError('Sessão expirada. Entre na sala novamente.', 'bad_token');
  return { token, roomCode: session.roomCode, playerId: session.playerId };
}

export function roomCodeOf(req: Request, session: { roomCode: string }): string {
  const code = String(req.params.code ?? '').trim().toUpperCase();
  if (!code || code !== session.roomCode) throw new GameError('Sala não encontrada.', 'room_not_found');
  return code;
}

export function err(res: Response, e: unknown): void {
  if (e instanceof GameError) {
    const status = e.code === 'room_not_found' ? 404 : e.code === 'bad_token' ? 401 : 400;
    res.status(status).json({ ok: false, error: { message: e.message, code: e.code } });
    return;
  }
  res.status(500).json({ ok: false, error: { message: (e as Error).message ?? 'Erro interno.' } });
}

export async function emitRoom(
  code: string,
  res: Response,
  state: GameRoom,
  viewerId: string,
  broadcast = true
): Promise<void> {
  const publicRoom = buildPublicRoom(state, viewerId);
  res.json({ ok: true, room: publicRoom });
}
