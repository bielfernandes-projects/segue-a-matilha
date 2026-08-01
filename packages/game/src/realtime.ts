import { SERVER_EVENTS } from '@segue/shared';
import type { Room } from '@segue/shared';
import { getSupabase } from './persistence';

const BROADCAST_TIMEOUT_MS = 4000;

/**
 * Envia um broadcast para o canal Realtime da sala usando a service role.
 * Best-effort: se o realtime falhar, o cliente resincroniza via heartbeat/state.
 */
export async function broadcastRoom(
  code: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const client = getSupabase();
  const channel = client.channel(`room:${code}`);
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('realtime_timeout')), BROADCAST_TIMEOUT_MS);
      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timer);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timer);
          reject(err ?? new Error(status));
        }
      });
    });
    await channel.send({ type: 'broadcast', event, payload });
  } catch {
    // best-effort
  } finally {
    await client.removeChannel(channel).catch(() => {});
  }
}

export async function broadcastRoomState(code: string, publicRoom: Room): Promise<void> {
  await broadcastRoom(code, SERVER_EVENTS.ROOM_STATE, { room: publicRoom });
}
