import type { Server, Socket } from 'socket.io';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@segue/shared';
import type { ErrorPayload, JoinedPayload, RoomSettings } from '@segue/shared';
import { GameError, RoomManager } from '../game/roomManager';
import { GameLoop } from '../game/gameLoop';
import { emitRoomState } from './broadcast';

type Ack = (resp: { ok: boolean; error?: { message: string; code?: string } }) => void;

export function registerSocketHandlers(io: Server, rooms: RoomManager, loop: GameLoop): void {
  io.on('connection', (socket) => {
    const fail = (ack: Ack | undefined, e: unknown) => {
      const err = e instanceof GameError ? e : new GameError((e as Error).message ?? 'Erro interno.');
      socket.emit(SERVER_EVENTS.ERROR, { message: err.message, code: err.code } satisfies ErrorPayload);
      ack?.({ ok: false, error: { message: err.message, code: err.code } });
    };

    const bind = (roomCode: string, playerId: string) => {
      socket.data.roomCode = roomCode;
      socket.data.playerId = playerId;
    };

    const emitState = (roomCode: string) => {
      const room = rooms.getRoom(roomCode);
      if (room) emitRoomState(io, room);
    };

    socket.on(CLIENT_EVENTS.CREATE_ROOM, (payload: { hostName?: string; avatarId?: string; settings?: Partial<RoomSettings> }, ack?: Ack) => {
      try {
        const hostName = String(payload?.hostName ?? '').trim();
        if (!hostName) throw new GameError('Digite seu nome.', 'bad_input');
        const { room, playerId, token } = rooms.createRoom(hostName, payload?.avatarId || 'husky', payload?.settings);
        bind(room.code, playerId);
        socket.join(room.code);
        socket.emit(SERVER_EVENTS.JOINED, { roomCode: room.code, playerId, token } satisfies JoinedPayload);
        emitRoomState(io, room);
        ack?.({ ok: true });
      } catch (e) {
        fail(ack, e);
      }
    });

    socket.on(CLIENT_EVENTS.JOIN_ROOM, (payload: { roomCode?: string; playerName?: string; avatarId?: string }, ack?: Ack) => {
      try {
        const playerName = String(payload?.playerName ?? '').trim();
        if (!playerName) throw new GameError('Digite seu nome.', 'bad_input');
        const { room, player, token } = rooms.joinRoom(payload?.roomCode ?? '', playerName, payload?.avatarId || 'golden');
        bind(room.code, player.id);
        socket.join(room.code);
        socket.emit(SERVER_EVENTS.JOINED, { roomCode: room.code, playerId: player.id, token } satisfies JoinedPayload);
        emitRoomState(io, room);
        ack?.({ ok: true });
      } catch (e) {
        fail(ack, e);
      }
    });

    socket.on(CLIENT_EVENTS.REJOIN_ROOM, (payload: { token?: string }, ack?: Ack) => {
      try {
        const session = rooms.getRoomByToken(String(payload?.token ?? ''));
        if (!session) throw new GameError('Sessão expirada. Entre na sala novamente.', 'bad_token');
        const { room, playerId } = session;
        bind(room.code, playerId);
        socket.join(room.code);
        loop.reconnectPlayer(room.code, playerId);
        socket.emit(SERVER_EVENTS.JOINED, { roomCode: room.code, playerId, token: String(payload?.token) } satisfies JoinedPayload);
        emitRoomState(io, room);
        ack?.({ ok: true });
      } catch (e) {
        fail(ack, e);
      }
    });

    socket.on(CLIENT_EVENTS.LEAVE_ROOM, (payload: unknown, ack?: Ack) => {
      const roomCode = socket.data.roomCode as string | undefined;
      const playerId = socket.data.playerId as string | undefined;
      if (!roomCode || !playerId) {
        ack?.({ ok: true });
        return;
      }
      const room = rooms.getRoom(roomCode);
      rooms.removePlayer(room!, playerId);
      socket.leave(roomCode);
      socket.data.roomCode = undefined;
      socket.data.playerId = undefined;
      emitState(roomCode);
      ack?.({ ok: true });
    });

    socket.on(CLIENT_EVENTS.START_GAME, async (payload: unknown, ack?: Ack) => {
      try {
        await loop.startGame(socket.data.roomCode, socket.data.playerId);
        ack?.({ ok: true });
      } catch (e) {
        fail(ack, e);
      }
    });

    socket.on(CLIENT_EVENTS.SUBMIT_ANSWER, (payload: { answer?: string }, ack?: Ack) => {
      try {
        loop.submitAnswer(socket.data.roomCode, socket.data.playerId, payload?.answer ?? '');
        ack?.({ ok: true });
      } catch (e) {
        fail(ack, e);
      }
    });

    socket.on(CLIENT_EVENTS.FORCE_REVEAL, async (payload: unknown, ack?: Ack) => {
      try {
        await loop.forceReveal(socket.data.roomCode, socket.data.playerId);
        ack?.({ ok: true });
      } catch (e) {
        fail(ack, e);
      }
    });

    socket.on(CLIENT_EVENTS.NEXT_ROUND, (payload: unknown, ack?: Ack) => {
      try {
        loop.nextStep(socket.data.roomCode, socket.data.playerId);
        ack?.({ ok: true });
      } catch (e) {
        fail(ack, e);
      }
    });

    socket.on(CLIENT_EVENTS.PLAY_AGAIN, (payload: unknown, ack?: Ack) => {
      try {
        loop.playAgain(socket.data.roomCode, socket.data.playerId);
        emitState(socket.data.roomCode);
        ack?.({ ok: true });
      } catch (e) {
        fail(ack, e);
      }
    });

    socket.on('disconnect', () => {
      const roomCode = socket.data.roomCode as string | undefined;
      const playerId = socket.data.playerId as string | undefined;
      if (!roomCode || !playerId) return;
      loop.markDisconnected(roomCode, playerId);
      emitState(roomCode);
    });
  });
}
