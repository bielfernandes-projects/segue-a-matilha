import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { SERVER_EVENTS } from '@segue/shared';
import type { Room } from '@segue/shared';

const FALLBACK_SYNC_INTERVAL_MS = 1000;

interface BroadcastPayload {
  payload?: { room?: Room; message?: string };
}

export interface RealtimeCallbacks {
  onRoomState: (room: Room) => void;
  onJudging: (room: Room | null) => void;
  onReveal: () => void;
  onGameOver: () => void;
  onError: (message: string) => void;
  setConnected: (v: boolean) => void;
  mergeRoom: (room: Room) => void;
  getState: () => { token?: string | null };
  apiRequest: (path: string, opts?: { method?: string }) => Promise<{ ok: boolean; data?: Room; error?: string }>;
}

export class RealtimeAdapter {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private fallbackTimer: number | null = null;
  private callbacks: RealtimeCallbacks;

  constructor(callbacks: RealtimeCallbacks) {
    this.callbacks = callbacks;
  }

  private getClient(): SupabaseClient | null {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (!url || !key) return null;
    if (!this.client) {
      this.client = createClient(url, key, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 10 } },
      });
    }
    return this.client;
  }

  private clearFallback(): void {
    if (this.fallbackTimer != null) {
      window.clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  private startFallback(code: string): void {
    this.clearFallback();
    const poll = async () => {
      const { token } = this.callbacks.getState();
      if (!token) return;
      const res = await this.callbacks.apiRequest(
        `/api/rooms/${code}/state?token=${encodeURIComponent(token)}`,
        { method: 'GET' }
      );
      if (res.ok && res.data) {
        console.log('[FALLBACK] API ok, merging room');
        this.callbacks.mergeRoom(res.data);
      } else if (res.ok && !res.data) {
        console.log('[FALLBACK] API ok but no data');
      } else {
        console.log(`[FALLBACK] API not ok, error: ${res.error}`);
      }
    };
    void poll();
    this.fallbackTimer = window.setInterval(poll, FALLBACK_SYNC_INTERVAL_MS);
  }

  subscribe(code: string): void {
    this.unsubscribe();
    const c = this.getClient();
    if (!c) return;

    this.channel = c.channel(`room:${code}`);
    this.channel
      .on('broadcast', { event: SERVER_EVENTS.ROOM_STATE }, ({ payload }: BroadcastPayload) => {
        if (payload?.room) {
          console.log('[REALTIME] ROOM_STATE broadcast received');
          this.callbacks.setConnected(true);
          this.callbacks.mergeRoom(payload.room);
        }
      })
      .on('broadcast', { event: SERVER_EVENTS.JUDGING }, ({ payload }: BroadcastPayload) => {
        if (payload?.room) this.callbacks.onJudging(payload.room);
      })
      .on('broadcast', { event: SERVER_EVENTS.REVEAL }, () => {
        this.callbacks.onReveal();
      })
      .on('broadcast', { event: SERVER_EVENTS.GAME_OVER }, () => {
        this.callbacks.onGameOver();
      })
      .on('broadcast', { event: SERVER_EVENTS.PLAYER_REMOVED }, ({ payload }: BroadcastPayload) => {
        if (payload?.message) this.callbacks.onError(payload.message);
      });

    this.channel.subscribe((status) => {
      const subscribed = status === 'SUBSCRIBED';
      this.callbacks.setConnected(subscribed);
      if (subscribed) {
        this.clearFallback();
      } else {
        this.startFallback(code);
      }
    });
  }

  unsubscribe(): void {
    this.clearFallback();
    if (this.channel && this.client) {
      this.client.removeChannel(this.channel).catch(() => {});
    }
    this.channel = null;
    this.callbacks.setConnected(false);
  }
}
