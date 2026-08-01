import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { SERVER_EVENTS } from '@segue/shared';
import type { Room } from '@segue/shared';
import { useGameStore } from '../store';
import { playRevealChime, playVictoryFanfare } from '../services/sound';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;

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
      if (payload?.room) useGameStore.getState().setRoom(payload.room);
    })
    .on('broadcast', { event: SERVER_EVENTS.REVEAL }, () => {
      playRevealChime();
    })
    .on('broadcast', { event: SERVER_EVENTS.GAME_OVER }, () => {
      playVictoryFanfare();
    })
    .on('broadcast', { event: SERVER_EVENTS.PLAYER_REMOVED }, ({ payload }: BroadcastPayload) => {
      if (payload?.message) useGameStore.getState().setError(payload.message);
    });

  channel.subscribe((status) => {
    useGameStore.getState().setConnected(status === 'SUBSCRIBED');
  });
}

export function unsubscribeRoom(): void {
  if (channel && client) {
    client.removeChannel(channel).catch(() => {});
  }
  channel = null;
  useGameStore.getState().setConnected(false);
}
