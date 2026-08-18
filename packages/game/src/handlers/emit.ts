import type { Response } from 'express';
import { buildPublicRoom } from '../state';
import type { GameRoom } from '../state';
import { broadcastRoom, broadcastRoomState } from '../realtime';
import { SERVER_EVENTS } from '@segue/shared';

/**
 * Serializa o estado, broadcasta e responde ao cliente.
 * Ponto único de saída — impossível esquecer de serializar.
 */
export async function emitRoom(
  code: string,
  res: Response,
  state: GameRoom,
  viewerId: string,
  opts: { event?: string; broadcast?: boolean } = {}
): Promise<void> {
  const publicRoom = buildPublicRoom(state, viewerId);
  if (opts.event) {
    await broadcastRoom(code, opts.event, { room: publicRoom }).catch(() => {});
  }
  if (opts.broadcast !== false) {
    await broadcastRoomState(code, publicRoom).catch(() => {});
  }
  res.json({ ok: true, room: publicRoom });
}

export async function emitNamed(
  code: string,
  event: string,
  state: GameRoom,
  viewerId: string
): Promise<void> {
  const publicRoom = buildPublicRoom(state, viewerId);
  await broadcastRoom(code, event, { room: publicRoom }).catch(() => {});
}
