import type { Question } from '@segue/shared';

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
