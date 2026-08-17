import { LIMITS } from './constants';

export const SCORING_RULES = {
  matilha: {
    name: 'A Matilha (A Maioria)',
    points: LIMITS.POINTS_MATILHA,
    icon: '🏆',
    description: 'Jogadores que deram a resposta mais popular da rodada recebem 2 Fichas. Em caso de empate na resposta mais popular, todos os empatados no topo ganham 2 pontos!',
    color: '#DDA15E',
    groupType: 'matilha' as const,
  },
  perdidos: {
    name: 'Os Perdidos (A Minoria com Match)',
    points: LIMITS.POINTS_PERDIDOS,
    icon: '🐾',
    description: 'Jogadores que deram uma resposta igual a pelo menos 1 outro AUmigo, mas que não foi a resposta campeã/maioria da rodada, ganham 1 Ficha.',
    color: '#606C38',
    groupType: 'perdidos' as const,
  },
  lobo: {
    name: 'O Lobo Solitário (Resposta Única)',
    points: LIMITS.POINTS_LOBO,
    icon: '🐺',
    description: 'Jogadores que deram uma resposta que absolutamente ninguém mais deu na rodada ficam isolados e recebem 0 Fichas.',
    color: 'rose-400',
    groupType: 'lobo' as const,
  },
} as const;

export const TIEBREAKER_RULES = [
  {
    order: 1,
    name: 'Maior Pontuação Total',
    description: 'Maior soma de Fichas ao fim da partida.',
  },
  {
    order: 2,
    name: 'Menos "Os Perdidos"',
    description: 'Menor número de rodadas com 1 ponto (respostas na minoria com match).',
  },
  {
    order: 3,
    name: 'Menos Lobos Solitários',
    description: 'Menor número de respostas únicas (rodadas de 0 pontos).',
  },
  {
    order: 4,
    name: 'Maior Sequência (Streak)',
    description: 'Mais rodadas consecutivas acertando a Matilha (2 pontos).',
  },
  {
    order: 5,
    name: 'Empate Total',
    description: 'Vencedores compartilham o pódio (co-vencedores). Ordem alfabética (pt-BR) para exibição.',
  },
] as const;

export const GAME_CONCEPT = {
  title: 'Conceito Principal',
  description: 'Neste jogo, as perguntas não possuem resposta factual correta! O seu objetivo é adivinhar e escrever a resposta que a MAIORIA dos outros jogadores irá digitar.',
  icon: 'Dog',
} as const;

export const AI_CURATION = {
  title: 'Inteligência Artificial (Curadoria Semântica)',
  description: 'Não se preocupe com erros de digitação ou sinônimos! O sistema usa Inteligência Artificial para agrupar automaticamente respostas com o mesmo sentido (ex: "coxinha de frango", "coxinha", "Coxinha!" contam juntas para a matilha).',
  icon: 'Brain',
} as const;

export type ScoringRuleKey = keyof typeof SCORING_RULES;
export type ScoringRule = typeof SCORING_RULES[ScoringRuleKey];
export type TiebreakerRule = typeof TIEBREAKER_RULES[number];