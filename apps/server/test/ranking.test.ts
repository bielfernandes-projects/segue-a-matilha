import { describe, expect, it } from 'vitest';
import {
  LIMITS,
  applyRoundScore,
  buildRanking,
  comparePlayers,
  isGameOver,
  scoreClusters,
} from '@segue/shared';
import type { Player, RevealAnswer, Room } from '@segue/shared';

function answer(playerId: string, text: string): RevealAnswer {
  return { playerId, playerName: `J${playerId}`, avatarId: 'husky', color: '#fff', text };
}

function player(id: string, score = 0, loneWolfCount = 0, bestStreak = 0): Player {
  return {
    id,
    name: id,
    avatarId: 'husky',
    color: '#fff',
    isHost: false,
    connected: true,
    score,
    roundScores: [],
    streak: 0,
    bestStreak,
    loneWolfCount,
    hasAnswered: false,
    absentRounds: 0,
  };
}

describe('scoreClusters', () => {
  it('matilha = 2, perdidos = 1, lobo = 0', () => {
    const clusters = scoreClusters([
      { rotulo: 'Coxinha', respostas: [answer('a', 'Coxinha'), answer('b', 'coxinha'), answer('c', 'Coxinha!')] },
      { rotulo: 'Pizza', respostas: [answer('d', 'Pizza'), answer('e', 'pizza')] },
      { rotulo: 'Sushi', respostas: [answer('f', 'Sushi')] },
    ]);
    const byLabel = new Map(clusters.map((c) => [c.rotulo, c]));
    expect(byLabel.get('Coxinha')?.points).toBe(LIMITS.POINTS_MATILHA);
    expect(byLabel.get('Coxinha')?.groupType).toBe('matilha');
    expect(byLabel.get('Pizza')?.points).toBe(LIMITS.POINTS_PERDIDOS);
    expect(byLabel.get('Pizza')?.groupType).toBe('perdidos');
    expect(byLabel.get('Sushi')?.points).toBe(LIMITS.POINTS_LOBO);
    expect(byLabel.get('Sushi')?.groupType).toBe('lobo');
  });

  it('empate no topo => todos os clusters do topo recebem 2', () => {
    const clusters = scoreClusters([
      { rotulo: 'A', respostas: [answer('a', 'A'), answer('b', 'a')] },
      { rotulo: 'B', respostas: [answer('c', 'B'), answer('d', 'b')] },
      { rotulo: 'C', respostas: [answer('e', 'C')] },
    ]);
    const byLabel = new Map(clusters.map((c) => [c.rotulo, c]));
    expect(byLabel.get('A')?.points).toBe(LIMITS.POINTS_MATILHA);
    expect(byLabel.get('B')?.points).toBe(LIMITS.POINTS_MATILHA);
    expect(byLabel.get('C')?.points).toBe(LIMITS.POINTS_LOBO);
  });

  it('rodada 100% unica => ninguem pontua', () => {
    const clusters = scoreClusters([
      { rotulo: 'A', respostas: [answer('a', 'A')] },
      { rotulo: 'B', respostas: [answer('b', 'B')] },
    ]);
    expect(clusters.every((c) => c.points === LIMITS.POINTS_LOBO)).toBe(true);
    expect(clusters.every((c) => c.groupType === 'lobo')).toBe(true);
  });

  it('resposta vazia (s/ respostas) nao gera cluster', () => {
    expect(scoreClusters([])).toEqual([]);
  });
});

describe('applyRoundScore', () => {
  it('acumula pontos e streak apenas nas rodadas de 2', () => {
    const p = player('a');
    applyRoundScore(p, LIMITS.POINTS_MATILHA);
    applyRoundScore(p, LIMITS.POINTS_MATILHA);
    applyRoundScore(p, LIMITS.POINTS_PERDIDOS);
    applyRoundScore(p, LIMITS.POINTS_MATILHA);
    expect(p.score).toBe(2 + 2 + 1 + 2);
    expect(p.streak).toBe(1);
    expect(p.bestStreak).toBe(2);
    expect(p.roundScores).toEqual([2, 2, 1, 2]);
  });

  it('lobo soma loneWolfCount', () => {
    const p = player('a');
    applyRoundScore(p, LIMITS.POINTS_LOBO);
    applyRoundScore(p, LIMITS.POINTS_LOBO);
    expect(p.loneWolfCount).toBe(2);
  });
});

describe('comparePlayers (desempate do podio)', () => {
  it('maior score vence', () => {
    expect(comparePlayers(player('a', 10), player('b', 8))).toBeLessThan(0);
  });

  it('score igual => menos lobos vence', () => {
    expect(comparePlayers(player('a', 10, 1), player('b', 10, 2))).toBeLessThan(0);
  });

  it('score e lobos iguais => maior bestStreak vence', () => {
    expect(comparePlayers(player('a', 10, 1, 3), player('b', 10, 1, 2))).toBeLessThan(0);
  });
});

describe('buildRanking', () => {
  it('empate perfeito rende mesmo rank (co-vencedores)', () => {
    const a = player('a', 10, 1, 2);
    const b = player('b', 10, 1, 2);
    const c = player('c', 4, 0, 0);
    const ranked = buildRanking([c, b, a]);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(1);
    expect(ranked[2].rank).toBe(3);
  });
});

describe('isGameOver', () => {
  function room(settings: Room['settings'], currentRound: number, players: Player[]): Room {
    return { code: 'ABCD', phase: 'leaderboard', hostId: 'a', settings, players, currentRound, answeredCount: 0, roundHistory: [], createdAt: 0, updatedAt: 0 };
  }

  it('modo rounds termina ao atingir totalRounds', () => {
    const r = room({ mode: 'rounds', totalRounds: 10, targetScore: 20, timeLimitSeconds: 60 }, 10, [player('a')]);
    expect(isGameOver(r)).toBe(true);
    expect(isGameOver({ ...r, currentRound: 9 })).toBe(false);
  });

  it('modo target termina quando alguem atinge a meta', () => {
    const r = room({ mode: 'target', totalRounds: 10, targetScore: 20, timeLimitSeconds: 60 }, 3, [
      player('a', 21),
      player('b', 18),
    ]);
    expect(isGameOver(r)).toBe(true);
    expect(isGameOver({ ...r, players: [player('a', 18), player('b', 18)] })).toBe(false);
  });
});
