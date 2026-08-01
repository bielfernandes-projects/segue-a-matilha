import { LIMITS } from '@segue/shared';
import { config } from './config';
import { fallbackGroup } from './fallback';

export interface JudgeOutput {
  clusters: { rotulo: string; respostas: string[] }[];
  offline: boolean;
}

export type JudgeFn = (question: string, answers: string[]) => Promise<JudgeOutput>;

function buildPrompt(question: string, answers: string[]): string {
  return `Você é o juiz imparcial e divertido do jogo de festa "Segue a Matilha".
Pergunta do jogo: "${question}"
Respostas dos jogadores: ${JSON.stringify(answers)}

Tarefa: agrupe as respostas que tenham o MESMO significado (sinônimos diretos, erros de digitação, variações de plural, maiúsculas/minúsculas). Ex: "coxinha", "Coxinha de frango" e "coxinha!" devem ir para o mesmo grupo com o rótulo canônico "Coxinha".
Regras:
- TODA resposta original deve aparecer em exatamente UM grupo.
- Use a string EXATA que o jogador digitou (não normalize nem corrija o texto).
- Rótulos canônicos curtos e legíveis em PT-BR.

Responda APENAS JSON, sem markdown, no formato:
{"clusters":[{"rotulo":"...","respostas":["texto original", "..."]}]}`;
}

async function fetchOnce(question: string, answers: string[]): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIMITS.JUDGE_TIMEOUT_MS);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openrouterApiKey}`,
      },
      body: JSON.stringify({
        model: config.openrouterModel,
        temperature: 0,
        messages: [{ role: 'user', content: buildPrompt(question, answers) }],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenRouter HTTP ${res.status} ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data?.choices?.[0]?.message?.content ?? '';
    if (!content) throw new Error('Resposta vazia do OpenRouter.');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

async function callWithRetry(question: string, answers: string[]): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= LIMITS.JUDGE_RETRIES; attempt++) {
    try {
      return await fetchOnce(question, answers);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/**
 * Juiz IA: 1 chamada OpenRouter por rodada (temp 0, timeout 5s + 1 retry).
 * Sem chave / erro / shape invalido => fallback offline (flag `offline: true`).
 */
export async function groupAnswers(question: string, answers: string[]): Promise<JudgeOutput> {
  if (!config.openrouterApiKey || answers.length === 0) {
    return { clusters: fallbackGroup(answers), offline: true };
  }

  try {
    const content = await callWithRetry(question, answers);
    const parsed = JSON.parse(content) as { clusters?: { rotulo?: string; respostas?: unknown[] }[] };
    if (!parsed || !Array.isArray(parsed.clusters)) {
      throw new Error('Formato inesperado do juiz.');
    }
    const clusters = parsed.clusters
      .filter((c) => Array.isArray(c.respostas) && c.respostas.length > 0)
      .map((c) => ({
        rotulo: String(c.rotulo ?? c.respostas![0]).trim(),
        respostas: (c.respostas as unknown[]).map(String),
      }));
    return { clusters, offline: false };
  } catch {
    return { clusters: fallbackGroup(answers), offline: true };
  }
}
