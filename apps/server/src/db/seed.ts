import type { Question } from '@segue/shared';
import { countQuestions, insertQuestion } from './supabase';
import { INITIAL_QUESTIONS } from './questionsSeed';

/**
 * Se a tabela estiver vazia, insere o pool inicial de perguntas aprovadas
 * (o mesmo banco de ~230 perguntas PT-BR portado da versao anterior).
 */
export async function seedIfEmpty(): Promise<void> {
  const count = await countQuestions();
  if (count > 0) {
    console.log(`[db] Supabase ja contem ${count} perguntas; seed ignorado.`);
    return;
  }

  let inserted = 0;
  for (const q of INITIAL_QUESTIONS) {
    await insertQuestion({
      text: q.texto,
      category: q.categoria || 'Geral',
      status: 'approved',
      author: 'Sistema',
    });
    inserted += 1;
  }
  console.log(`[db] Seed concluido: ${inserted} perguntas aprovadas inseridas.`);
}

export type { Question };
