import { LIMITS } from './constants';
import type { Cluster, GroupType, Player, RevealAnswer, Room } from './types';

/**
 * Pontuacao da rodada (Fichas de AUmigos):
 * - Matilha (pluralidade) = 2 pontos; empate no topo => todos os clusters
 *   empatados no topo recebem 2. Rodada 100% unica => ninguem pontua.
 * - Perdidos (count > 1, nao campeao) = 1 ponto.
 * - Lobo Solitario (resposta unica) = 0 pontos.
 */
export function scoreClusters(
  input: { rotulo: string; respostas: RevealAnswer[] }[]
): Cluster[] {
  const clusters: Cluster[] = input.map((c) => ({
    ...c,
    count: c.respostas.length,
    points: LIMITS.POINTS_LOBO,
    groupType: 'lobo' as GroupType,
  }));

  const maxCount = clusters.length > 0 ? Math.max(...clusters.map((c) => c.count)) : 0;

  return clusters.map((c) => {
    if (maxCount > 1 && c.count === maxCount) {
      return { ...c, points: LIMITS.POINTS_MATILHA, groupType: 'matilha' as GroupType };
    }
    if (c.count > 1) {
      return { ...c, points: LIMITS.POINTS_PERDIDOS, groupType: 'perdidos' as GroupType };
    }
    return { ...c, points: LIMITS.POINTS_LOBO, groupType: 'lobo' as GroupType };
  });
}

/** Aplica os pontos de uma rodada em um jogador (placar, streak, lobos). */
export function applyRoundScore(player: Player, points: number): void {
  player.score += points;
  player.roundScores.push(points);

  if (points === LIMITS.POINTS_MATILHA) {
    player.streak += 1;
    player.bestStreak = Math.max(player.bestStreak, player.streak);
  } else {
    player.streak = 0;
  }

  if (points === LIMITS.POINTS_LOBO) {
    player.loneWolfCount += 1;
  }

  if (points === LIMITS.POINTS_PERDIDOS) {
    player.perdidosCount += 1;
  }
}

/**
 * Ordem de desempate do podio:
 * 1. Maior pontuacao total
 * 2. Menos "Os Perdidos" (rodadas de 1 ponto)
 * 3. Menos Lobos Solitarios (rodadas de 0 pontos)
 * 4. Maior sequencia consecutiva de rodadas com 2 pontos (streak)
 * 5. Empate total (inclui todos com 0 pontos) => ordem alfabetica (pt-BR)
 */
export function comparePlayers(a: Player, b: Player): number {
  if (b.score !== a.score) return b.score - a.score;
  if ((a.perdidosCount ?? 0) !== (b.perdidosCount ?? 0)) return (a.perdidosCount ?? 0) - (b.perdidosCount ?? 0);
  if (a.loneWolfCount !== b.loneWolfCount) return a.loneWolfCount - b.loneWolfCount;
  if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
  return a.name.localeCompare(b.name, 'pt-BR');
}

export function sortPlayers(players: Player[]): Player[] {
  return [...players].sort(comparePlayers);
}

export function isTiedForRank(a: Player, b: Player): boolean {
  return (
    a.score === b.score &&
    (a.perdidosCount ?? 0) === (b.perdidosCount ?? 0) &&
    a.loneWolfCount === b.loneWolfCount &&
    a.bestStreak === b.bestStreak
  );
}

export interface RankedPlayer {
  rank: number;
  player: Player;
}

export function buildRanking(players: Player[]): RankedPlayer[] {
  const sorted = sortPlayers(players);
  const out: RankedPlayer[] = [];
  sorted.forEach((p, i) => {
    const prev = out[i - 1];
    const rank = prev && isTiedForRank(prev.player, p) ? prev.rank : i + 1;
    out.push({ rank, player: p });
  });
  return out;
}

/** Condicao de fim de jogo (checada ao fim de cada rodada). */
export function isGameOver(
  room: Pick<Room, 'settings' | 'currentRound' | 'players'>
): boolean {
  if (room.settings.mode === 'rounds') {
    return room.currentRound >= room.settings.totalRounds;
  }
  const top = Math.max(0, ...room.players.map((p) => p.score));
  return top >= room.settings.targetScore;
}
