import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@segue/shared';
import type { JoinedPayload, Room } from '@segue/shared';
import { loadStoredToken, useGameStore } from '../store';
import { playRevealChime, playVictoryFanfare } from '../services/sound';

let socket: Socket | null = null;

const SERVER_URL: string | undefined = import.meta.env.VITE_SERVER_URL as string | undefined;

export function connectSocket(): void {
  if (socket) return;

  const storedToken = loadStoredToken();
  if (storedToken) {
    useGameStore.setState({ token: storedToken });
  }

  socket = SERVER_URL ? io(SERVER_URL) : io();

  socket.on('connect', () => {
    useGameStore.getState().setConnected(true);
    const token = useGameStore.getState().token;
    if (token) {
      socket!.emit(CLIENT_EVENTS.REJOIN_ROOM, { token }, (resp: { ok?: boolean }) => {
        if (resp && resp.ok === false) {
          useGameStore.getState().reset();
        }
      });
    }
  });

  socket.on('disconnect', () => {
    useGameStore.getState().setConnected(false);
  });

  socket.on('connect_error', () => {
    useGameStore.getState().setConnected(false);
  });

  socket.on(SERVER_EVENTS.JOINED, (payload: JoinedPayload) => {
    useGameStore.getState().setJoined(payload);
  });

  socket.on(SERVER_EVENTS.ROOM_STATE, (room: Room) => {
    useGameStore.getState().setRoom(room);
  });

  socket.on(SERVER_EVENTS.ERROR, (payload: { message: string }) => {
    useGameStore.getState().setError(payload.message);
  });

  socket.on(SERVER_EVENTS.REVEAL, () => {
    playRevealChime();
  });

  socket.on(SERVER_EVENTS.GAME_OVER, () => {
    playVictoryFanfare();
  });
}

export function emit(event: string, payload?: unknown): void {
  socket?.emit(event, payload);
}

export interface AckResult {
  ok: boolean;
  error?: string;
}

export function emitAck(event: string, payload?: unknown): Promise<AckResult> {
  return new Promise((resolve) => {
    if (!socket || !socket.connected) {
      resolve({ ok: false, error: 'Sem conexão com o servidor.' });
      return;
    }
    socket.emit(event, payload, (resp: { ok?: boolean; error?: { message?: string } } | null) => {
      if (resp && resp.ok) {
        resolve({ ok: true });
      } else {
        resolve({ ok: false, error: resp?.error?.message || 'Erro.' });
      }
    });
  });
}
