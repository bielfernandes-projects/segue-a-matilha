import { Router } from 'express';
import { SERVER_EVENTS } from '@segue/shared';
import { isGameOver } from '@segue/shared';
import {
  buildPublicRoom,
  GameError,
  submitAnswerState,
  processRevealState,
  forceRevealState,
  nextStepState,
  playAgainState,
  considerClustersState,
} from '../state';
import { withRoom, getApprovedQuestions } from '../persistence';
import { broadcastRoom, broadcastRoomState } from '../realtime';
import { requireSession, roomCodeOf, err } from './index';

export const gameRoutes = Router();

async function broadcastNamed(code: string, event: string, publicRoom: unknown): Promise<void> {
  await broadcastRoom(code, event, { room: publicRoom });
}

gameRoutes.post('/rooms/:code/start', async (req, res) => {
  try {
    const session = await requireSession(req);
    const code = roomCodeOf(req, session);
    const result = await withRoom(code, async (state, now) => {
      const pool = await getApprovedQuestions();
      const { startGameState } = await import('../state');
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

gameRoutes.post('/rooms/:code/answer', async (req, res) => {
  try {
    const session = await requireSession(req);
    const code = roomCodeOf(req, session);
    const result = await withRoom(code, async (state, now) => {
      const { needsReveal } = submitAnswerState(state, session.playerId, String(req.body?.answer ?? ''));
      const player = state.players.find((p) => p.id === session.playerId);
      if (player) player.lastSeenAt = now;
      if (needsReveal) {
        await broadcastNamed(code, SERVER_EVENTS.JUDGING, buildPublicRoom(state, session.playerId));
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

gameRoutes.post('/rooms/:code/reveal', async (req, res) => {
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
      await broadcastNamed(code, SERVER_EVENTS.JUDGING, buildPublicRoom(state, session.playerId));
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

gameRoutes.post('/rooms/:code/consider', async (req, res) => {
  try {
    const session = await requireSession(req);
    const code = roomCodeOf(req, session);
    const clustersInput = req.body?.clusters;
    if (!clustersInput || !Array.isArray(clustersInput)) {
      throw new GameError('Clusters inválidos.', 'bad_input');
    }
    const result = await withRoom(code, (state) => {
      return considerClustersState(state, session.playerId, clustersInput);
    });
    if (!result) throw new GameError('Sala não encontrada.', 'room_not_found');
    const publicRoom = buildPublicRoom(result.state, session.playerId);
    await broadcastNamed(code, SERVER_EVENTS.REVEAL, publicRoom);
    await broadcastRoomState(code, publicRoom);
    res.json({ ok: true, room: publicRoom });
  } catch (e) {
    err(res, e);
  }
});

gameRoutes.post('/rooms/:code/next', async (req, res) => {
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

gameRoutes.post('/rooms/:code/play-again', async (req, res) => {
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
