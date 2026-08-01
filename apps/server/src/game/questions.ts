import type { Question } from '@segue/shared';
import { getApprovedQuestions } from '../db/supabase';

let cache: { at: number; list: Question[] } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getApprovedCached(): Promise<Question[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.list;
  const list = await getApprovedQuestions();
  cache = { at: Date.now(), list };
  return list;
}

export function invalidateQuestionCache(): void {
  cache = null;
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
