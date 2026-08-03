import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { SERVER_EVENTS } from '@segue/shared';
import type { Room } from '@segue/shared';
import { useGameStore } from '../store';
import { apiRequest } from './api';
import type { RoomResponse } from './api';
import { playRevealChime, playVictoryFanfare } from '../services/sound';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const FALLBACK_SYNC_INTERVAL_MS = 4000;

let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;
let fallbackTimer: number | null = null;

export function getRealtimeClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return client;
}

function clearFallbackSync(): void {
  if (fallbackTimer != null) {
    window.clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
}

/** Resync via /state quando o Realtime esta indisponivel (broadcast nao e garantido). */
function startFallbackSync(code: string): void {
  clearFallbackSync();
  const poll = async () => {
    const { token } = useGameStore.getState();
    if (!token) return;
    const res = await apiRequest<RoomResponse>(
      `/api/rooms/${code}/state?token=${encodeURIComponent(token)}`,
      { method: 'GET' }
    );
    if (res.ok) useGameStore.getState().setRoom(res.data.room);
  };
  void poll();
  fallbackTimer = window.setInterval(poll, FALLBACK_SYNC_INTERVAL_MS);
}

interface BroadcastPayload {
  payload?: { room?: Room; message?: string };
}

/** Assina o canal Realtime da sala (snapshot + eventos de som). */
export function subscribeRoom(code: string): void {
  unsubscribeRoom();
  const c = getRealtimeClient();
  if (!c) return;

  channel = c.channel(`room:${code}`);
  channel
    .on('broadcast', { event: SERVER_EVENTS.ROOM_STATE }, ({ payload }: BroadcastPayload) => {
      if (payload?.room) {
        useGameStore.getState().setJudging(false);
        useGameStore.getState().setRoom(payload.room);
      }
    })
    .on('broadcast', { event: SERVER_EVENTS.JUDGING }, ({ payload }: BroadcastPayload) => {
      useGameStore.getState().setJudging(true);
      if (payload?.room) useGameStore.getState().setRoom(payload.room);
    })
    .on('broadcast', { event: SERVER_EVENTS.REVEAL }, () => {
      useGameStore.getState().setJudging(false);
      playRevealChime();
    })
    .on('broadcast', { event: SERVER_EVENTS.GAME_OVER }, () => {
      useGameStore.getState().setJudging(false);
      playVictoryFanfare();
    })
    .on('broadcast', { event: SERVER_EVENTS.PLAYER_REMOVED }, ({ payload }: BroadcastPayload) => {
      if (payload?.message) useGameStore.getState().setError(payload.message);
    });

  channel.subscribe((status) => {
    const subscribed = status === 'SUBSCRIBED';
    useGameStore.getState().setConnected(subscribed);
    if (subscribed) {
      clearFallbackSync();
    } else {
      startFallbackSync(code);
    }
  });
}

export function unsubscribeRoom(): void {
  clearFallbackSync();
  if (channel && client) {
    client.removeChannel(channel).catch(() => {});
  }
  channel = null;
  useGameStore.getState().setConnected(false);
}
