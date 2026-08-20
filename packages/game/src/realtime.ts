import { SERVER_EVENTS } from '@segue/shared';
import type { Room } from '@segue/shared';
import { getSupabase } from './persistence';

const BROADCAST_TIMEOUT_MS = 1500;

// Pool de canais persistentes por room code
const channelPool = new Map<string, { channel: any; refCount: number }>();

/**
 * Obtém ou cria um canal persistente para o room code.
 * Reutiliza conexão existente se já existir.
 */
function getOrCreateChannel(code: string) {
  const existing = channelPool.get(code);
  if (existing) {
    existing.refCount++;
    return existing.channel;
  }

  const client = getSupabase();
  const channel = client.channel(`room:${code}`);
  channelPool.set(code, { channel, refCount: 1 });
  return channel;
}

/**
 * Libera referência ao canal. Remove do pool se ninguém mais usa.
 */
function releaseChannel(code: string) {
  const existing = channelPool.get(code);
  if (!existing) return;
  
  existing.refCount--;
  if (existing.refCount <= 0) {
    existing.channel.unsubscribe().catch(() => {});
    channelPool.delete(code);
  }
}

/**
 * Envia um broadcast para o canal Realtime da sala usando canal persistente.
 * Reutiliza conexão WebSocket existente - elimina overhead de create/destroy.
 */
export async function broadcastRoom(
  code: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const channel = getOrCreateChannel(code);
  
  try {
    // Canal persistente - não precisa de subscribe/unsubscribe a cada broadcast
    // Apenas garante que está subscrito
    if (channel.state !== 'joined' && channel.state !== 'joining') {
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
    }
    
    await channel.send({ type: 'broadcast', event, payload });
  } catch {
    // best-effort - não quebra o jogo se realtime falhar
  }
  // NÃO remove channel - mantém persistente para próximo broadcast
}

export async function broadcastRoomState(code: string, publicRoom: Room): Promise<void> {
  await broadcastRoom(code, SERVER_EVENTS.ROOM_STATE, { room: publicRoom });
}