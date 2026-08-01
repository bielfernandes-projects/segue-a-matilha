import type { Server } from 'socket.io';
import { SERVER_EVENTS } from '@segue/shared';
import type { GameRoom } from '../game/roomManager';
import { buildPublicRoom } from './snapshot';

export function emitRoomState(io: Server, room: GameRoom): void {
  for (const sock of io.sockets.sockets.values()) {
    if (sock.data.roomCode !== room.code) continue;
    sock.emit(SERVER_EVENTS.ROOM_STATE, buildPublicRoom(room, sock.data.playerId));
  }
}

/** Emite o snapshot e tambem um evento nomeado (ex: game:reveal) para o cliente. */
export function emitNamed(io: Server, room: GameRoom, event: string): void {
  emitRoomState(io, room);
  for (const sock of io.sockets.sockets.values()) {
    if (sock.data.roomCode !== room.code) continue;
    sock.emit(event, buildPublicRoom(room, sock.data.playerId));
  }
}
