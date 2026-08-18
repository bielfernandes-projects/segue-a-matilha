import crypto from 'node:crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { SERVER_EVENTS } from '@segue/shared';
import type { RoomSettings } from '@segue/shared';
import {
  createRoomState,
  joinRoomState,
  reconnectPlayerState,
  markDisconnectedState,
  removePlayerState,
  buildPublicRoom,
  CONNECTED_STALE_MS,
  GameError,
} from '../state';
import type { GameRoom } from '../state';
import {
  insertRoom,
  createSession,
  getSession,
  withRoom,
  readRoom,
  deleteRoom,
  deleteSession,
  deletePlayerSessions,
} from '../persistence';
import { broadcastRoom, broadcastRoomState } from '../realtime';
import { requireSession, roomCodeOf, err } from './index';
import { config } from '../config';

export const roomRoutes = Router();

async function broadcastNamed(code: string, event: string, publicRoom: unknown): Promise<void> {
  await broadcastRoom(code, event, { room: publicRoom });
}

roomRoutes.post('/rooms', async (req, res) => {
  try {
    const hostName = String(req.body?.hostName ?? '').trim();
    if (!hostName) throw new GameError('Digite seu nome.', 'bad_input');
    const avatarId = String(req.body?.avatarId ?? 'husky');

    let created: { state: GameRoom; playerId: string } | null = null;
    for (let i = 0; i < 6 && !created; i++) {
      const candidate = createRoomState(hostName, avatarId, req.body?.settings as Partial<RoomSettings> | undefined);
      if (!/^[A-Z]{4}$/.test(candidate.state.code)) continue;
      if (await insertRoom(candidate.state, Date.now())) created = candidate;
    }
    if (!created) throw new GameError('Não foi possível criar a sala. Tente novamente.', 'code_collision');

    const now = Date.now();
    const token = crypto.randomUUID();
    await createSession(token, created.state.code, created.playerId, now);
    const publicRoom = buildPublicRoom(created.state, created.playerId);
    res.json({
      ok: true,
      room: publicRoom,
      joined: { roomCode: created.state.code, playerId: created.playerId, token },
    });
  } catch (e) {
    err(res, e);
  }
});

roomRoutes.post('/rooms/:code/join', async (req, res) => {
  try {
    const code = String(req.params.code ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) throw new GameError('Código de sala inválido.', 'bad_input');
    const playerName = String(req.body?.playerName ?? '').trim();
    if (!playerName) throw new GameError('Digite seu nome.', 'bad_input');
    const avatarId = String(req.body?.avatarId ?? 'golden');

    const result = await withRoom(code, (state, now) => {
      const player = joinRoomState(state, playerName, avatarId);
      player.lastSeenAt = now;
      return player.id;
    });
    if (!result) throw new GameError('Sala não encontrada. Verifique o código.', 'room_not_found');

    const token = crypto.randomUUID();
    await createSession(token, code, result.result, Date.now());
    const publicRoom = buildPublicRoom(result.state, result.result);
    await broadcastRoomState(code, publicRoom);
    res.json({ ok: true, room: publicRoom, joined: { roomCode: code, playerId: result.result, token } });
  } catch (e) {
    err(res, e);
  }
});

roomRoutes.post('/rooms/:code/rejoin', async (req, res) => {
  try {
    const code = String(req.params.code ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) throw new GameError('Código de sala inválido.', 'bad_input');
    const playerName = String(req.body?.playerName ?? '').trim();
    if (!playerName) throw new GameError('Digite seu nome.', 'bad_input');
    const avatarId = String(req.body?.avatarId ?? '');

    const result = await withRoom(code, (state, now) => {
      const matches = state.players.filter((p) => p.name.toLowerCase() === playerName.toLowerCase());
      if (matches.length === 0) {
        throw new GameError('Perfil não encontrado nesta sala. Volte apenas se já participava desta partida.', 'player_not_found');
      }
      const player = matches.length === 1 ? matches[0] : matches.find((p) => avatarId && p.avatarId === avatarId) ?? matches[0];
      reconnectPlayerState(state, player.id);
      player.lastSeenAt = now;
      return player.id;
    });
    if (!result) throw new GameError('Sala não encontrada. Verifique o código.', 'room_not_found');

    const token = crypto.randomUUID();
    await createSession(token, code, result.result, Date.now());
    const publicRoom = buildPublicRoom(result.state, result.result);
    await broadcastRoomState(code, publicRoom);
    res.json({ ok: true, room: publicRoom, joined: { roomCode: code, playerId: result.result, token } });
  } catch (e) {
    err(res, e);
  }
});

roomRoutes.post('/rooms/rejoin', async (req, res) => {
  try {
    const token = String(req.body?.token ?? '').trim();
    if (!token) throw new GameError('Sessão expirada. Entre na sala novamente.', 'bad_token');
    const session = await getSession(token);
    if (!session) throw new GameError('Sessão expirada. Entre na sala novamente.', 'bad_token');

    const result = await withRoom(session.roomCode, (state, now) => {
      const player = state.players.find((p) => p.id === session.playerId);
      if (!player) throw new GameError('Jogador não encontrado.', 'player_not_found');
      reconnectPlayerState(state, player.id);
      player.lastSeenAt = now;
      return player.id;
    });
    if (!result) throw new GameError('Sala não encontrada.', 'room_not_found');

    const publicRoom = buildPublicRoom(result.state, result.result);
    await broadcastRoomState(session.roomCode, publicRoom);
    res.json({ ok: true, room: publicRoom, joined: { roomCode: session.roomCode, playerId: session.playerId, token } });
  } catch (e) {
    err(res, e);
  }
});

roomRoutes.post('/rooms/:code/heartbeat', async (req, res) => {
  try {
    const session = await requireSession(req);
    const code = roomCodeOf(req, session);
    const result = await withRoom(code, (state, now) => {
      const player = state.players.find((p) => p.id === session.playerId);
      if (!player) {
        markDisconnectedState(state, session.playerId);
        return false;
      }
      if (player.connected && player.lastSeenAt != null && now - player.lastSeenAt < CONNECTED_STALE_MS / 2) {
        return true;
      }
      player.connected = true;
      player.lastSeenAt = now;
      return true;
    }, { detectChanges: true });
    if (!result) throw new GameError('Sala não encontrada.', 'room_not_found');
    if (!result.result) {
      await deleteSession(session.token);
      res.status(401).json({ ok: false, error: { message: 'Sessão expirada. Entre na sala novamente.', code: 'bad_token' } });
      return;
    }
    res.json({ ok: true, room: buildPublicRoom(result.state, session.playerId) });
  } catch (e) {
    err(res, e);
  }
});

roomRoutes.post('/rooms/:code/leave', async (req, res) => {
  try {
    const token = String(req.body?.token ?? '').trim();
    const session = await requireSession(req);
    const code = roomCodeOf(req, session);
    const result = await withRoom(code, (state) => {
      const r = removePlayerState(state, session.playerId);
      if (r.removed) deletePlayerSessions(code, session.playerId).catch(() => {});
      return r;
    });
    if (result) {
      if (result.result.isEmpty) {
        await deleteRoom(code);
      } else {
        const publicRoom = buildPublicRoom(result.state, session.playerId);
        await broadcastRoomState(code, publicRoom);
      }
    }
    if (token) await deleteSession(token);
    res.json({ ok: true });
  } catch (e) {
    err(res, e);
  }
});

roomRoutes.get('/rooms/:code/state', async (req, res) => {
  try {
    const session = await requireSession(req);
    const code = roomCodeOf(req, session);
    const ref = await readRoom(code);
    if (!ref) throw new GameError('Sala não encontrada.', 'room_not_found');
    res.json({ ok: true, room: buildPublicRoom(ref.state, session.playerId) });
  } catch (e) {
    err(res, e);
  }
});
