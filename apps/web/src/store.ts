import { create } from 'zustand';
import type { Room, RoomSettings } from '@segue/shared';
import { emitAck } from './lib/socket';
import { CLIENT_EVENTS } from '@segue/shared';

interface GameState {
  room: Room | null;
  playerId: string | null;
  token: string | null;
  connected: boolean;
  error: string;

  setRoom: (room: Room) => void;
  setJoined: (payload: { roomCode: string; playerId: string; token: string }) => void;
  setConnected: (v: boolean) => void;
  setError: (msg: string) => void;
  clearError: () => void;
  reset: () => void;

  createRoom: (hostName: string, avatarId: string, settings: Partial<RoomSettings>) => Promise<{ ok: boolean }>;
  joinRoom: (roomCode: string, playerName: string, avatarId: string) => Promise<{ ok: boolean }>;
  leaveRoom: () => void;
  startGame: () => Promise<{ ok: boolean }>;
  submitAnswer: (answer: string) => Promise<{ ok: boolean }>;
  forceReveal: () => Promise<{ ok: boolean }>;
  nextStep: () => Promise<{ ok: boolean }>;
  playAgain: () => Promise<{ ok: boolean }>;
}

const TOKEN_KEY = 'segue-matilha-token';

function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function loadStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  room: null,
  playerId: null,
  token: null,
  connected: false,
  error: '',

  setRoom: (room) => set({ room }),
  setJoined: ({ playerId, token }) => {
    saveToken(token);
    set({ playerId, token });
  },
  setConnected: (connected) => set({ connected }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: '' }),
  reset: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    set({ room: null, playerId: null, token: null, error: '' });
  },

  createRoom: async (hostName, avatarId, settings) => {
    const res = await emitAck(CLIENT_EVENTS.CREATE_ROOM, { hostName, avatarId, settings });
    if (!res.ok) set({ error: res.error || 'Erro ao criar sala.' });
    return res;
  },

  joinRoom: async (roomCode, playerName, avatarId) => {
    const res = await emitAck(CLIENT_EVENTS.JOIN_ROOM, { roomCode, playerName, avatarId });
    if (!res.ok) set({ error: res.error || 'Erro ao entrar na sala.' });
    return res;
  },

  leaveRoom: () => {
    void emitAck(CLIENT_EVENTS.LEAVE_ROOM, {});
    get().reset();
  },

  startGame: async () => {
    const res = await emitAck(CLIENT_EVENTS.START_GAME, {});
    if (!res.ok) set({ error: res.error || 'Erro ao iniciar a partida.' });
    return res;
  },

  submitAnswer: async (answer) => {
    const res = await emitAck(CLIENT_EVENTS.SUBMIT_ANSWER, { answer });
    if (!res.ok) set({ error: res.error || 'Erro ao enviar resposta.' });
    return res;
  },

  forceReveal: async () => {
    const res = await emitAck(CLIENT_EVENTS.FORCE_REVEAL, {});
    if (!res.ok) set({ error: res.error || 'Erro ao revelar.' });
    return res;
  },

  nextStep: async () => {
    const res = await emitAck(CLIENT_EVENTS.NEXT_ROUND, {});
    if (!res.ok) set({ error: res.error || 'Erro ao avançar.' });
    return res;
  },

  playAgain: async () => {
    const res = await emitAck(CLIENT_EVENTS.PLAY_AGAIN, {});
    if (!res.ok) set({ error: res.error || 'Erro ao reiniciar.' });
    return res;
  },
}));
