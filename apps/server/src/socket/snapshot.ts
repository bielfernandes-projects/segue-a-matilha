import type { Room } from '@segue/shared';
import type { GameRoom } from '../game/roomManager';

/**
 * Snapshot publico enviado aos clientes.
 * Durante a fase 'question' o currentAnswer de OUTROS jogadores e omitido
 * (anti-cheat: ninguem vê a resposta alheia em tempo real).
 */
export function buildPublicRoom(room: GameRoom, viewerId?: string): Room {
  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    settings: room.settings,
    players: room.players.map((p) => ({
      ...p,
      currentAnswer: p.id === viewerId ? p.currentAnswer : undefined,
    })),
    currentRound: room.currentRound,
    question: room.question,
    deadline: room.deadline,
    answeredCount: room.answeredCount,
    reveal: room.reveal,
    roundHistory: room.roundHistory,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    pausedReason: room.pausedReason,
  };
}
