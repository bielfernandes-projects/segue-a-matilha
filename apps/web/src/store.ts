import { create } from 'zustand';
import type { Room, RoomSettings } from '@segue/shared';
import { apiRequest } from './lib/api';
import type { Joined, RoomResponse } from './lib/api';
import { subscribeRoom, unsubscribeRoom } from './lib/realtime';

interface GameState {
  room: Room | null;
  playerId: string | null;
  token: string | null;
  connected: boolean;
  judging: boolean;
  error: string;
  pendingAnswer: string | null;

  setRoom: (room: Room) => void;
  mergeRoom: (room: Room) => void;
  setConnected: (v: boolean) => void;
  setJudging: (v: boolean) => void;
  setError: (msg: string) => void;
  clearError: () => void;
  reset: () => void;

  createRoom: (hostName: string, avatarId: string, settings: Partial<RoomSettings>) => Promise<{ ok: boolean; error?: string }>;
  joinRoom: (roomCode: string, playerName: string, avatarId: string) => Promise<{ ok: boolean; error?: string }>;
  rejoin: () => Promise<{ ok: boolean }>;
  leaveRoom: () => void;
  startGame: () => Promise<{ ok: boolean; error?: string }>;
  submitAnswer: (answer: string) => Promise<{ ok: boolean; error?: string }>;
  forceReveal: () => Promise<{ ok: boolean; error?: string }>;
  autoReveal: () => Promise<{ ok: boolean; error?: string }>;
  nextStep: () => Promise<{ ok: boolean; error?: string }>;
  playAgain: () => Promise<{ ok: boolean; error?: string }>;
  heartbeat: () => Promise<void>;
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

function applyJoined(set: (partial: Partial<GameState>) => void, data: RoomResponse, joined: Joined): void {
  saveToken(joined.token);
  set({ room: data.room, playerId: joined.playerId, token: joined.token });
  subscribeRoom(joined.roomCode);
}

export const useGameStore = create<GameState>((set, get) => ({
  room: null,
  playerId: null,
  token: null,
  connected: false,
  judging: false,
  error: '',
  pendingAnswer: null,

  setRoom: (room) => set({ room }),

  /**
   * Merge de snapshots recebidos por broadcast/resync.
   * Enquanto a resposta do jogador local ainda nao foi confirmada pelo servidor
   * (pendingAnswer), preserva o estado otimista de hasAnswered/currentAnswer para
   * que a tela nao "volte para o input" por causa de um broadcast intermediario.
   */
  mergeRoom: (incoming) => {
    const { playerId, pendingAnswer } = get();
    if (!pendingAnswer || !playerId) {
      set({ room: incoming });
      return;
    }
    const me = incoming.players.find((p) => p.id === playerId);
    if (!me || me.hasAnswered || incoming.phase !== 'question') {
      set({ room: incoming, pendingAnswer: null });
      return;
    }
    set({
      room: {
        ...incoming,
        answeredCount: incoming.answeredCount + 1,
        players: incoming.players.map((p) =>
          p.id === playerId ? { ...p, hasAnswered: true, currentAnswer: pendingAnswer } : p
        ),
      },
    });
  },

  setConnected: (connected) => set({ connected }),
  setJudging: (judging) => set({ judging }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: '' }),
  reset: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    unsubscribeRoom();
    set({ room: null, playerId: null, token: null, connected: false, judging: false, error: '', pendingAnswer: null });
  },

  createRoom: async (hostName, avatarId, settings) => {
    const res = await apiRequest<RoomResponse>('/api/rooms', { body: { hostName, avatarId, settings } });
    if (res.ok) {
      applyJoined(set, res.data, res.data.joined!);
      return { ok: true };
    }
    set({ error: res.error });
    return { ok: false, error: res.error };
  },

  joinRoom: async (roomCode, playerName, avatarId) => {
    const code = String(roomCode ?? '').trim().toUpperCase().slice(0, 4);
    const res = await apiRequest<RoomResponse>(`/api/rooms/${code}/join`, { body: { playerName, avatarId } });
    if (res.ok) {
      applyJoined(set, res.data, res.data.joined!);
      return { ok: true };
    }
    // Partida já em andamento: tenta voltar para a sala usando código + nome
    // (reconecta o perfil existente com o mesmo nome em vez de criar um novo).
    if (res.code === 'room_started') {
      const re = await apiRequest<RoomResponse>(`/api/rooms/${code}/rejoin`, { body: { playerName, avatarId } });
      if (re.ok) {
        applyJoined(set, re.data, re.data.joined!);
        return { ok: true };
      }
      set({ error: re.error });
      return { ok: false, error: re.error };
    }
    set({ error: res.error });
    return { ok: false, error: res.error };
  },

  rejoin: async () => {
    const token = loadStoredToken();
    if (!token) {
      set({ token: null });
      return { ok: false };
    }
    const res = await apiRequest<RoomResponse>('/api/rooms/rejoin', { body: { token } });
    if (res.ok) {
      applyJoined(set, res.data, res.data.joined!);
      return { ok: true };
    }
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    set({ token: null });
    return { ok: false };
  },

  leaveRoom: () => {
    const { room, token } = get();
    if (room && token) {
      void apiRequest(`/api/rooms/${room.code}/leave`, { body: { token } });
    }
    get().reset();
  },

  startGame: async () => {
    const { room, token } = get();
    if (!room || !token) return { ok: false };
    const res = await apiRequest<RoomResponse>(`/api/rooms/${room.code}/start`, { body: { token } });
    if (res.ok) {
      set({ room: res.data.room, error: '' });
      return { ok: true };
    }
    set({ error: res.error });
    return { ok: false, error: res.error };
  },

  submitAnswer: async (answer) => {
    const { room, token, playerId } = get();
    if (!room || !token || !playerId) return { ok: false };
    if (room.players.some((p) => p.id === playerId && p.hasAnswered)) return { ok: true };
    set({
      pendingAnswer: answer,
      room: {
        ...room,
        answeredCount: room.answeredCount + 1,
        players: room.players.map((p) =>
          p.id === playerId ? { ...p, hasAnswered: true, currentAnswer: answer } : p
        ),
      },
    });
    const res = await apiRequest<RoomResponse>(`/api/rooms/${room.code}/answer`, { body: { token, answer } });
    if (res.ok) {
      set({ room: res.data.room, error: '', judging: false, pendingAnswer: null });
      return { ok: true };
    }
    set({ error: res.error, pendingAnswer: null });
    return { ok: false, error: res.error };
  },

  forceReveal: async () => {
    const { room, token } = get();
    if (!room || !token) return { ok: false };
    const res = await apiRequest<RoomResponse>(`/api/rooms/${room.code}/reveal`, { body: { token, force: true } });
    if (res.ok) {
      set({ room: res.data.room, error: '' });
      return { ok: true };
    }
    set({ error: res.error });
    return { ok: false, error: res.error };
  },

  autoReveal: async () => {
    const { room, token } = get();
    if (!room || !token) return { ok: false };
    const res = await apiRequest<RoomResponse>(`/api/rooms/${room.code}/reveal`, { body: { token } });
    if (res.ok) {
      set({ room: res.data.room });
      return { ok: true };
    }
    if (res.error !== 'O tempo ainda não acabou.') set({ error: res.error });
    return { ok: false, error: res.error };
  },

  nextStep: async () => {
    const { room, token } = get();
    if (!room || !token) return { ok: false };
    const res = await apiRequest<RoomResponse>(`/api/rooms/${room.code}/next`, { body: { token } });
    if (res.ok) {
      set({ room: res.data.room, error: '' });
      return { ok: true };
    }
    set({ error: res.error });
    return { ok: false, error: res.error };
  },

  playAgain: async () => {
    const { room, token } = get();
    if (!room || !token) return { ok: false };
    const res = await apiRequest<RoomResponse>(`/api/rooms/${room.code}/play-again`, { body: { token } });
    if (res.ok) {
      set({ room: res.data.room, error: '' });
      return { ok: true };
    }
    set({ error: res.error });
    return { ok: false, error: res.error };
  },

  heartbeat: async () => {
    const { room, token } = get();
    if (!room || !token) return;
    const res = await apiRequest<RoomResponse>(`/api/rooms/${room.code}/heartbeat`, { body: { token } });
    if (res.ok) {
      get().mergeRoom(res.data.room);
      set({ connected: true });
    }
  },
}));
