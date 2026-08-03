import { describe, expect, it } from 'vitest';
import type { Question } from '@segue/shared';
import type { JudgeOutput } from '../src/judge';
import {
  buildPublicRoom,
  createRoomState,
  generateRoomCode,
  joinRoomState,
  nextStepState,
  playAgainState,
  processRevealState,
  startGameState,
  submitAnswerState,
} from '../src/state';

function q(id: string): Question {
  return { id, text: `Pergunta ${id}`, status: 'approved', createdAt: 1 };
}
const pool = [q('1'), q('2'), q('3'), q('4'), q('5')];

/** Juiz determinístico: agrupa por igualdade exata (sem IA). */
const fakeJudge = async (_question: string, answers: string[]): Promise<JudgeOutput> => {
  const seen = new Map<string, string[]>();
  for (const a of answers) {
    const key = a.trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(a);
  }
  const clusters = [...seen.entries()].map(([key, arr]) => ({ rotulo: arr[0], respostas: arr }));
  return { clusters, offline: true };
};

describe('game state (serverless puro)', () => {
  it('gera codigo de sala sempre com 4 letras (sem digitos)', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-Z]{4}$/);
    }
  });

  it('cria sala com host e settings normalizadas', () => {
    const { state, playerId } = createRoomState('Ana', 'husky', { totalRounds: 3 });
    expect(state.phase).toBe('lobby');
    expect(state.players).toHaveLength(1);
    expect(state.players[0].isHost).toBe(true);
    expect(playerId).toBe(state.hostId);
    expect(state.settings.totalRounds).toBe(6); // clamped para o minimo
  });

  it('entra na sala como nao-host', () => {
    const { state } = createRoomState('Ana', 'husky');
    const player = joinRoomState(state, 'Bia', 'golden');
    expect(state.players).toHaveLength(2);
    expect(player.isHost).toBe(false);
  });

  it('inicia jogo, responde e revela com pontuacao', async () => {
    const { state } = createRoomState('Ana', 'husky');
    joinRoomState(state, 'Bia', 'golden');
    startGameState(state, state.hostId, pool);
    expect(state.phase).toBe('question');
    expect(state.currentRound).toBe(1);
    expect(state.deadline).toBeGreaterThan(Date.now());

    const first = submitAnswerState(state, state.players[0].id, 'Coxinha');
    expect(first.needsReveal).toBe(false);
    const second = submitAnswerState(state, state.players[1].id, 'coxinha');
    expect(second.needsReveal).toBe(true);

    const reveal = await processRevealState(state, fakeJudge);
    expect(state.phase).toBe('reveal');
    expect(reveal?.clusters).toHaveLength(1);
    expect(reveal?.offline).toBe(true);
    expect(state.players[0].score).toBeGreaterThan(0);
    expect(state.players[1].score).toBe(state.players[0].score);
  });

  it('fases avancam ate finished no modo rounds', () => {
    const { state } = createRoomState('Ana', 'husky');
    joinRoomState(state, 'Bia', 'golden');
    state.settings = { mode: 'rounds', totalRounds: 1, targetScore: 20, timeLimitSeconds: 30 };
    startGameState(state, state.hostId, pool);
    state.phase = 'reveal';
    nextStepState(state, state.hostId, pool);
    expect(state.phase).toBe('leaderboard');
    nextStepState(state, state.hostId, pool);
    expect(state.phase).toBe('finished');
  });

  it('play again volta ao lobby zerando placar', () => {
    const { state } = createRoomState('Ana', 'husky');
    joinRoomState(state, 'Bia', 'golden');
    state.settings = { mode: 'rounds', totalRounds: 1, targetScore: 20, timeLimitSeconds: 30 };
    startGameState(state, state.hostId, pool);
    state.players[0].score = 4;
    state.phase = 'finished';
    playAgainState(state, state.hostId);
    expect(state.phase).toBe('lobby');
    expect(state.players[0].score).toBe(0);
    expect(state.roundHistory).toHaveLength(0);
  });

  it('snapshot publico esconde resposta dos outros durante a fase', () => {
    const { state } = createRoomState('Ana', 'husky');
    joinRoomState(state, 'Bia', 'golden');
    startGameState(state, state.hostId, pool);
    submitAnswerState(state, state.players[0].id, 'Segredo');
    const pub = buildPublicRoom(state, state.players[1].id);
    const ana = pub.players.find((p) => p.id === state.players[0].id);
    expect(ana?.currentAnswer).toBeUndefined();
    expect(ana?.hasAnswered).toBe(true);
  });

  it('processReveal e idempotente (fase ja revelada => null)', async () => {
    const { state } = createRoomState('Ana', 'husky');
    joinRoomState(state, 'Bia', 'golden');
    startGameState(state, state.hostId, pool);
    submitAnswerState(state, state.players[0].id, 'X');
    submitAnswerState(state, state.players[1].id, 'X');
    const first = await processRevealState(state, fakeJudge);
    const second = await processRevealState(state, fakeJudge);
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });
});
