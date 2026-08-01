import crypto from 'node:crypto';
import express from 'express';
import type { Request, Response } from 'express';
import { SERVER_EVENTS } from '@segue/shared';
import type { QuestionStatus, RoomSettings } from '@segue/shared';
import { isGameOver } from '@segue/shared';
import { config } from './config';
import {
  countQuestions,
  countRooms,
  createSession,
  deletePlayerSessions,
  deleteQuestion,
  deleteRoom,
  deleteSession,
  getApprovedQuestions,
  getSession,
  insertQuestion,
  insertRoom,
  listQuestions,
  readRoom,
  updateQuestionStatus,
  withRoom,
} from './persistence';
import {
  buildPublicRoom,
  createRoomState,
  GameError,
  joinRoomState,
  markDisconnectedState,
  nextStepState,
  playAgainState,
  processRevealState,
  removePlayerState,
  reconnectPlayerState,
  submitAnswerState,
  startGameState,
} from './state';
import type { GameRoom } from './state';
import { broadcastRoom, broadcastRoomState } from './realtime';

function isQuestionStatus(v: unknown): v is QuestionStatus {
  return v === 'approved' || v === 'pending' || v === 'rejected';
}

function err(res: Response, e: unknown): void {
  if (e instanceof GameError) {
    const status = e.code === 'room_not_found' ? 404 : e.code === 'bad_token' ? 401 : 400;
    res.status(status).json({ ok: false, error: { message: e.message, code: e.code } });
    return;
  }
  res.status(500).json({ ok: false, error: { message: (e as Error).message ?? 'Erro interno.' } });
}

async function requireSession(req: Request): Promise<{ token: string; roomCode: string; playerId: string }> {
  const token = String(req.body?.token ?? req.query?.token ?? '').trim();
  if (!token) throw new GameError('Sessão expirada. Entre na sala novamente.', 'bad_token');
  const session = await getSession(token);
  if (!session) throw new GameError('Sessão expirada. Entre na sala novamente.', 'bad_token');
  return { token, roomCode: session.roomCode, playerId: session.playerId };
}

function roomCodeOf(req: Request, session: { roomCode: string }): string {
  const code = String(req.params.code ?? '').trim().toUpperCase();
  if (!code || code !== session.roomCode) throw new GameError('Sala não encontrada.', 'room_not_found');
  return code;
}

async function broadcastNamed(code: string, event: string, publicRoom: unknown): Promise<void> {
  await broadcastRoom(code, event, { room: publicRoom });
}

export function buildApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', async (_req, res) => {
    try {
      const rooms = await countRooms();
      res.json({ ok: true, rooms, uptime: process.uptime() });
    } catch (e) {
      err(res, e);
    }
  });

  // -------------------------------------------------------------------------
  // Perguntas (sugestao publica + painel admin)
  // -------------------------------------------------------------------------

  app.post('/api/questions/suggest', async (req, res) => {
    try {
      const text = String(req.body?.text ?? '').trim();
      if (text.length < 5 || text.length > 140) {
        res.status(400).json({ error: 'A pergunta deve ter entre 5 e 140 caracteres.' });
        return;
      }
      const question = await insertQuestion({
        text,
        status: 'pending',
        author: String(req.body?.author ?? 'Jogador Anônimo').slice(0, 25),
        category: 'Geral',
      });
      res.status(201).json(question);
    } catch (e) {
      err(res, e);
    }
  });

  const admin = express.Router();
  admin.use((req: Request, res: Response, next: () => void) => {
    if (req.headers['x-admin-token'] !== config.adminToken) {
      res.status(401).json({ error: 'Nao autorizado.' });
      return;
    }
    next();
  });

  admin.get('/questions', async (_req, res) => {
    try {
      res.json(await listQuestions());
    } catch (e) {
      err(res, e);
    }
  });

  admin.post('/questions', async (req, res) => {
    try {
      const text = String(req.body?.text ?? '').trim();
      if (!text) {
        res.status(400).json({ error: 'Texto da pergunta e obrigatorio.' });
        return;
      }
      const status: QuestionStatus = isQuestionStatus(req.body?.status) ? req.body.status : 'pending';
      const question = await insertQuestion({
        text,
        status,
        author: String(req.body?.author ?? 'Painel'),
        category: String(req.body?.category ?? 'Geral'),
      });
      res.status(201).json(question);
    } catch (e) {
      err(res, e);
    }
  });

  admin.patch('/questions/:id', async (req, res) => {
    try {
      if (!isQuestionStatus(req.body?.status)) {
        res.status(400).json({ error: 'Status invalido.' });
        return;
      }
      await updateQuestionStatus(req.params.id, req.body.status);
      res.json({ ok: true });
    } catch (e) {
      err(res, e);
    }
  });

  admin.delete('/questions/:id', async (req, res) => {
    try {
      await deleteQuestion(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      err(res, e);
    }
  });

  app.use('/api/admin', admin);

  // -------------------------------------------------------------------------
  // Salas (REST + broadcast Realtime)
  // -------------------------------------------------------------------------

  app.post('/api/rooms', async (req, res) => {
    try {
      const hostName = String(req.body?.hostName ?? '').trim();
      if (!hostName) throw new GameError('Digite seu nome.', 'bad_input');
      const avatarId = String(req.body?.avatarId ?? 'husky');

      let created: { state: GameRoom; playerId: string } | null = null;
      for (let i = 0; i < 6 && !created; i++) {
        const candidate = createRoomState(hostName, avatarId, req.body?.settings as Partial<RoomSettings> | undefined);
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

  app.post('/api/rooms/:code/join', async (req, res) => {
    try {
      const code = String(req.params.code ?? '').trim().toUpperCase();
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

  app.post('/api/rooms/rejoin', async (req, res) => {
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

  app.post('/api/rooms/:code/heartbeat', async (req, res) => {
    try {
      const session = await requireSession(req);
      const code = roomCodeOf(req, session);
      const result = await withRoom(code, (state, now) => {
        const player = state.players.find((p) => p.id === session.playerId);
        if (!player) {
          markDisconnectedState(state, session.playerId);
          return false;
        }
        player.connected = true;
        player.lastSeenAt = now;
        return true;
      });
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

  app.post('/api/rooms/:code/start', async (req, res) => {
    try {
      const session = await requireSession(req);
      const code = roomCodeOf(req, session);
      const result = await withRoom(code, async (state, now) => {
        const pool = await getApprovedQuestions();
        startGameState(state, session.playerId, pool);
        const player = state.players.find((p) => p.id === session.playerId);
        if (player) player.lastSeenAt = now;
        return state.phase;
      });
      if (!result) throw new GameError('Sala não encontrada.', 'room_not_found');
      const publicRoom = buildPublicRoom(result.state, session.playerId);
      await broadcastRoomState(code, publicRoom);
      res.json({ ok: true, room: publicRoom });
    } catch (e) {
      err(res, e);
    }
  });

  app.post('/api/rooms/:code/answer', async (req, res) => {
    try {
      const session = await requireSession(req);
      const code = roomCodeOf(req, session);
      const result = await withRoom(code, async (state, now) => {
        const { needsReveal } = submitAnswerState(state, session.playerId, String(req.body?.answer ?? ''));
        const player = state.players.find((p) => p.id === session.playerId);
        if (player) player.lastSeenAt = now;
        if (needsReveal) {
          await processRevealState(state);
          return 'revealed';
        }
        return 'ok';
      });
      if (!result) throw new GameError('Sala não encontrada.', 'room_not_found');
      const publicRoom = buildPublicRoom(result.state, session.playerId);
      if (result.result === 'revealed') {
        await broadcastNamed(code, SERVER_EVENTS.REVEAL, publicRoom);
      }
      await broadcastRoomState(code, publicRoom);
      res.json({ ok: true, room: publicRoom });
    } catch (e) {
      err(res, e);
    }
  });

  app.post('/api/rooms/:code/reveal', async (req, res) => {
    try {
      const session = await requireSession(req);
      const code = roomCodeOf(req, session);
      const force = req.body?.force === true;
      const result = await withRoom(code, async (state, now) => {
        const player = state.players.find((p) => p.id === session.playerId);
        if (!player) throw new GameError('Jogador não encontrado.', 'player_not_found');
        const inQuestion =
          state.phase === 'question' || (state.phase === 'paused' && state.prevPhase === 'question');
        if (!inQuestion) return false;
        const deadlinePassed = state.deadline != null && now >= state.deadline;
        if (!force && !deadlinePassed) throw new GameError('O tempo ainda não acabou.', 'too_early');
        if (force && !player.isHost) throw new GameError('Apenas o Host pode revelar agora.', 'forbidden');
        player.lastSeenAt = now;
        await processRevealState(state);
        return true;
      });
      if (!result) throw new GameError('Sala não encontrada.', 'room_not_found');
      const publicRoom = buildPublicRoom(result.state, session.playerId);
      if (result.result === true) {
        await broadcastNamed(code, SERVER_EVENTS.REVEAL, publicRoom);
      }
      await broadcastRoomState(code, publicRoom);
      res.json({ ok: true, room: publicRoom });
    } catch (e) {
      err(res, e);
    }
  });

  app.post('/api/rooms/:code/next', async (req, res) => {
    try {
      const session = await requireSession(req);
      const code = roomCodeOf(req, session);
      const result = await withRoom(code, async (state, now) => {
        const willStartRound = state.phase === 'leaderboard' && !isGameOver(state);
        const pool = willStartRound ? await getApprovedQuestions() : [];
        nextStepState(state, session.playerId, pool);
        const player = state.players.find((p) => p.id === session.playerId);
        if (player) player.lastSeenAt = now;
        return state.phase;
      });
      if (!result) throw new GameError('Sala não encontrada.', 'room_not_found');
      const publicRoom = buildPublicRoom(result.state, session.playerId);
      if (result.result === 'finished') {
        await broadcastNamed(code, SERVER_EVENTS.GAME_OVER, publicRoom);
      }
      await broadcastRoomState(code, publicRoom);
      res.json({ ok: true, room: publicRoom });
    } catch (e) {
      err(res, e);
    }
  });

  app.post('/api/rooms/:code/play-again', async (req, res) => {
    try {
      const session = await requireSession(req);
      const code = roomCodeOf(req, session);
      const result = await withRoom(code, (state, now) => {
        playAgainState(state, session.playerId);
        return state.phase;
      });
      if (!result) throw new GameError('Sala não encontrada.', 'room_not_found');
      const publicRoom = buildPublicRoom(result.state, session.playerId);
      await broadcastRoomState(code, publicRoom);
      res.json({ ok: true, room: publicRoom });
    } catch (e) {
      err(res, e);
    }
  });

  app.post('/api/rooms/:code/leave', async (req, res) => {
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

  app.get('/api/rooms/:code/state', async (req, res) => {
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

  return app;
}
