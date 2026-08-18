import type { Room } from '@segue/shared';
import { useGameStore } from '../store';
import { apiRequest } from './api';
import type { RoomResponse } from './api';
import { RealtimeAdapter } from './realtime-adapter';

let adapter: RealtimeAdapter | null = null;

function getAdapter(): RealtimeAdapter {
  if (!adapter) {
    adapter = new RealtimeAdapter({
      onRoomState: (room) => {
        useGameStore.getState().setJudging(false);
        useGameStore.getState().mergeRoom(room);
      },
      onJudging: (room) => {
        useGameStore.getState().setJudging(true);
        if (room) useGameStore.getState().mergeRoom(room);
      },
      onReveal: () => {
        useGameStore.getState().setJudging(false);
      },
      onGameOver: () => {
        useGameStore.getState().setJudging(false);
      },
      onError: (message) => {
        useGameStore.getState().setError(message);
      },
      setConnected: (v) => {
        useGameStore.getState().setConnected(v);
      },
      mergeRoom: (room) => {
        useGameStore.getState().mergeRoom(room);
      },
      getState: () => {
        const s = useGameStore.getState();
        return { token: s.token };
      },
      apiRequest: (path, opts) => apiRequest<Room>(path, opts as { method?: string }),
    });
  }
  return adapter;
}

export function subscribeRoom(code: string): void {
  getAdapter().subscribe(code);
}

export function unsubscribeRoom(): void {
  getAdapter().unsubscribe();
}
