import type { Question } from '@segue/shared';
import { normalizeForMatch, singularize } from './fallback';

/** Texto normalizado para comparar duplicatas de pergunta (acentos/pontuacao/plural). */
export function questionKey(text: string): string {
  return singularize(normalizeForMatch(text));
}

/** True se o texto (normalizado) ja existe na lista. */
export function isDuplicateText(text: string, existing: string[]): boolean {
  const key = questionKey(text);
  return existing.some((t) => questionKey(t) === key);
}

/** Sorteia uma pergunta que ainda nao apareceu nesta partida. */
export function pickQuestion(pool: Question[], used: Set<string>): Question {
  const available = pool.filter((q) => !used.has(q.id));
  const source = available.length > 0 ? available : pool;
  if (source.length === 0) {
    throw new Error('Nenhuma pergunta aprovada disponivel.');
  }
  const picked = source[Math.floor(Math.random() * source.length)];
  used.add(picked.id);
  return picked;
}
