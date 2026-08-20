import { create } from 'zustand';
import type { Room, RoomSettings, Player, Phase } from '@segue/shared';
import { subscribeRoom, unsubscribeRoom } from './lib/realtime';
import * as session from './lib/session-manager';
import * as game from './lib/game-actions';

interface GameState {
  room: Room | null;
  playerId: string | null;
  token: string | null;
  connected: boolean;
  judging: boolean;
  loadingReveal: boolean;
  error: string;
  pendingAnswer: string | null;

  setRoom: (room: Room) => void;
  mergeRoom: (incoming: Room) => void;
  setConnected: (v: boolean) => void;
  setJudging: (v: boolean) => void;
  setLoadingReveal: (v: boolean) => void;
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

function sessionCtx(set: (partial: Partial<GameState>) => void): session.SessionContext {
  return {
    setRoom: (room) => set({ room }),
    setPlayerId: (id) => set({ playerId: id }),
    setToken: (token) => set({ token }),
    setError: (error) => set({ error }),
    setConnected: (connected) => set({ connected }),
    reset: () => set({ room: null, playerId: null, token: null, connected: false, judging: false, loadingReveal: false, error: '', pendingAnswer: null }),
  };
}

function gameCtx(get: () => GameState, set: (partial: Partial<GameState>) => void): game.GameActionContext {
  return {
    getCode: () => get().room?.code ?? null,
    getToken: () => get().token,
    getPlayerId: () => get().playerId,
    getRoom: () => get().room,
    setRoom: (room) => set({ room: room as Room }),
    setJudging: (v) => set({ judging: v }),
    setLoadingReveal: (v) => set({ loadingReveal: v }),
    setError: (msg) => set({ error: msg }),
    setPendingAnswer: (v) => set({ pendingAnswer: v }),
    setOptimisticAnswer: (playerId, answer, answeredCount) => {
      const current = get().room;
      if (!current) return;
      set({
        pendingAnswer: answer,
        room: {
          ...current,
          answeredCount: answeredCount + 1,
          players: current.players.map((p: Player) =>
            p.id === playerId ? { ...p, hasAnswered: true, currentAnswer: answer } : p
          ),
        },
      });
    },
  };
}

const TOKEN_KEY = 'segue-matilha-token';
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

function debug(...args: unknown[]) {
  if (DEBUG) {
    console.log('[STORE DEBUG]', ...args);
  }
}

function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  room: null,
  playerId: null,
  token: null,
  connected: false,
  judging: false,
  loadingReveal: false,
  error: '',
  pendingAnswer: null,

  setRoom: (room) => set({ room }),
  setConnected: (connected) => set({ connected }),
  setJudging: (judging) => set({ judging }),
  setLoadingReveal: (loadingReveal) => set({ loadingReveal }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: '' }),
  reset: () => {
    clearStoredToken();
    unsubscribeRoom();
    set({ room: null, playerId: null, token: null, connected: false, judging: false, loadingReveal: false, error: '', pendingAnswer: null });
  },

  mergeRoom: (incoming) => {
    const { playerId, pendingAnswer } = get();
    const validPhases: Phase[] = ['lobby', 'question', 'reveal', 'leaderboard', 'paused', 'finished'];
    const hasValidPhase = validPhases.includes(incoming.phase as Phase);

    if (incoming.phase === 'reveal') {
      set({ loadingReveal: false });
    }
    if (!hasValidPhase) {
      debug(`mergeRoom: skipping room update, invalid phase: ${incoming.phase}`);
      return;
    }
    if (!pendingAnswer || !playerId) {
      set({ room: incoming });
      return;
    }
    const me = incoming.players.find((p: Player) => p.id === playerId);
    if (!me || me.hasAnswered || incoming.phase !== 'question') {
      set({ room: incoming, pendingAnswer: null });
      return;
    }
    set({
      room: {
        ...incoming,
        answeredCount: incoming.answeredCount + 1,
        players: incoming.players.map((p: Player) =>
          p.id === playerId ? { ...p, hasAnswered: true, currentAnswer: pendingAnswer } : p
        ),
      },
    });
  },

  createRoom: async (hostName, avatarId, settings) => {
    const ctx = sessionCtx(set);
    return session.createRoom(ctx, hostName, avatarId, settings);
  },
  joinRoom: async (roomCode, playerName, avatarId) => {
    const ctx = sessionCtx(set);
    return session.joinRoom(ctx, roomCode, playerName, avatarId);
  },
  rejoin: async () => {
    const ctx = sessionCtx(set);
    return session.rejoin(ctx);
  },
  leaveRoom: () => {
    const { room, token } = get();
    const ctx = sessionCtx(set);
    session.leaveRoom(ctx, room, token);
  },
  startGame: async () => {
    const ctx = gameCtx(get, set);
    const ok = await game.startGame(ctx);
    return { ok, error: ok ? undefined : get().error };
  },
  submitAnswer: async (answer) => {
    const ctx = gameCtx(get, set);
    const ok = await game.submitAnswer(ctx, answer);
    return { ok, error: ok ? undefined : get().error };
  },
  forceReveal: async () => {
    const ctx = gameCtx(get, set);
    const ok = await game.forceReveal(ctx);
    return { ok, error: ok ? undefined : get().error };
  },
  autoReveal: async () => {
    const ctx = gameCtx(get, set);
    const ok = await game.autoReveal(ctx);
    return { ok, error: ok ? undefined : get().error };
  },
  nextStep: async () => {
    const ctx = gameCtx(get, set);
    const ok = await game.nextStep(ctx);
    return { ok, error: ok ? undefined : get().error };
  },
  playAgain: async () => {
    const ctx = gameCtx(get, set);
    const ok = await game.playAgain(ctx);
    return { ok, error: ok ? undefined : get().error };
  },
  heartbeat: async () => {
    const { room, token } = get();
    const ctx = sessionCtx(set);
    await session.heartbeat(ctx, room, token);
  },
}));
