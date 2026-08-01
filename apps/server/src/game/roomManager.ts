import crypto from 'node:crypto';
import { LIMITS, getAvatarColor } from '@segue/shared';
import type { Phase, Player, Room, RoomSettings } from '@segue/shared';

export interface GameRoom extends Room {
  prevPhase?: Phase;
  tokens: Map<string, string>;
  usedQuestionIds: Set<string>;
  timer?: NodeJS.Timeout;
}

export interface Session {
  roomCode: string;
  playerId: string;
}

export class GameError extends Error {
  code: string;
  constructor(message: string, code = 'game_error') {
    super(message);
    this.code = code;
  }
}

function clamp(v: unknown, min: number, max: number, def: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeSettings(input: Partial<RoomSettings> | undefined): RoomSettings {
  const mode = input?.mode === 'target' ? 'target' : 'rounds';
  return {
    mode,
    totalRounds: clamp(input?.totalRounds, LIMITS.ROUNDS_MIN, LIMITS.ROUNDS_MAX, LIMITS.ROUNDS_DEFAULT),
    targetScore: clamp(input?.targetScore, LIMITS.TARGET_MIN, LIMITS.TARGET_MAX, LIMITS.TARGET_DEFAULT),
    timeLimitSeconds: clamp(
      input?.timeLimitSeconds,
      LIMITS.TIMER_MIN_SECONDS,
      LIMITS.TIMER_MAX_SECONDS,
      LIMITS.TIMER_DEFAULT_SECONDS
    ),
  };
}

function makePlayer(id: string, name: string, avatarId: string, isHost: boolean): Player {
  return {
    id,
    name: name.trim().slice(0, 18),
    avatarId,
    color: getAvatarColor(avatarId),
    isHost,
    connected: true,
    score: 0,
    roundScores: [],
    streak: 0,
    bestStreak: 0,
    loneWolfCount: 0,
    hasAnswered: false,
    absentRounds: 0,
  };
}

export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  private tokens = new Map<string, Session>();
  private expiryInterval: NodeJS.Timeout;

  constructor() {
    this.expiryInterval = setInterval(() => this.sweepExpired(), 60_000);
    this.expiryInterval.unref();
  }

  generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < LIMITS.ROOM_CODE_LENGTH; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(
    hostName: string,
    avatarId: string,
    settings?: Partial<RoomSettings>
  ): { room: GameRoom; playerId: string; token: string } {
    const code = this.generateCode();
    const playerId = this.newId('p');
    const now = Date.now();

    const room: GameRoom = {
      code,
      phase: 'lobby',
      hostId: playerId,
      settings: normalizeSettings(settings),
      players: [makePlayer(playerId, hostName, avatarId, true)],
      currentRound: 0,
      answeredCount: 0,
      roundHistory: [],
      createdAt: now,
      updatedAt: now,
      tokens: new Map(),
      usedQuestionIds: new Set(),
    };

    this.rooms.set(code, room);
    const token = this.issueToken(code, playerId);
    return { room, playerId, token };
  }

  joinRoom(
    code: string,
    playerName: string,
    avatarId: string
  ): { room: GameRoom; player: Player; token: string } {
    const room = this.getRoom(code);
    if (!room) throw new GameError('Sala não encontrada. Verifique o código.', 'room_not_found');
    if (room.phase !== 'lobby') throw new GameError('A partida já começou. Espere o próximo jogo.', 'room_started');
    if (room.players.length >= LIMITS.MAX_PLAYERS) {
      throw new GameError(`A sala atingiu o limite de ${LIMITS.MAX_PLAYERS} jogadores.`, 'room_full');
    }

    const playerId = this.newId('p');
    const player = makePlayer(playerId, playerName, avatarId, false);
    room.players.push(player);
    room.updatedAt = Date.now();

    const token = this.issueToken(code, playerId);
    return { room, player, token };
  }

  getRoom(code?: string): GameRoom | undefined {
    if (!code) return undefined;
    return this.rooms.get(code.toUpperCase());
  }

  getRoomByToken(token: string): { room: GameRoom; playerId: string } | null {
    const session = this.tokens.get(token);
    if (!session) return null;
    const room = this.rooms.get(session.roomCode);
    if (!room) return null;
    return { room, playerId: session.playerId };
  }

  issueToken(roomCode: string, playerId: string): string {
    const token = crypto.randomUUID();
    this.tokens.set(token, { roomCode, playerId });
    const room = this.rooms.get(roomCode);
    room?.tokens.set(playerId, token);
    return token;
  }

  revokeToken(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode);
    const token = room?.tokens.get(playerId);
    if (token) this.tokens.delete(token);
    room?.tokens.delete(playerId);
  }

  removePlayer(room: GameRoom, playerId: string): void {
    room.players = room.players.filter((p) => p.id !== playerId);
    this.revokeToken(room.code, playerId);
    if (room.players.length === 0) {
      this.deleteRoom(room.code);
      return;
    }
    if (room.hostId === playerId) this.promoteHost(room);
    room.updatedAt = Date.now();
  }

  promoteHost(room: GameRoom): void {
    const next = room.players.find((p) => p.connected) || room.players[0];
    if (!next) return;
    room.players.forEach((p) => (p.isHost = false));
    next.isHost = true;
    room.hostId = next.id;
    room.updatedAt = Date.now();
  }

  deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    if (room.timer) clearTimeout(room.timer);
    room.players.forEach((p) => this.revokeToken(code, p.id));
    this.rooms.delete(code);
  }

  connectedCount(room: GameRoom): number {
    return room.players.filter((p) => p.connected).length;
  }

  activeCount(): number {
    return this.rooms.size;
  }

  private newId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private sweepExpired(): void {
    const now = Date.now();
    for (const room of [...this.rooms.values()]) {
      const alive = room.players.some((p) => p.connected);
      if (!alive && now - room.updatedAt > LIMITS.ROOM_EXPIRE_MS) {
        this.deleteRoom(room.code);
      } else if (room.players.length === 0) {
        this.deleteRoom(room.code);
      }
    }
  }
}
