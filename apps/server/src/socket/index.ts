import { createServer as createHttpServer } from 'node:http';
import type { Express } from 'express';
import { Server as SocketServer } from 'socket.io';
import type { RoomManager } from '../game/roomManager';
import type { GameLoop } from '../game/gameLoop';
import { registerSocketHandlers } from './handlers';

export function createSocketServer(app: Express, rooms: RoomManager, loop: GameLoop): ReturnType<typeof createHttpServer> {
  const httpServer = createHttpServer(app);
  const io = new SocketServer(httpServer, {
    cors: { origin: true, credentials: true },
  });
  registerSocketHandlers(io, rooms, loop);
  return httpServer;
}
