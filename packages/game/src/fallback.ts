export function normalizeForMatch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Colapsa plurais simples do PT-BR (es/os/as) sem quebrar "lápis". */
export function singularize(s: string): string {
  if (s.length > 3 && /(es|os|as)$/.test(s)) return s.slice(0, -1);
  return s;
}

/**
 * Fallback offline: agrupamento por igualdade normalizada
 * (lowercase + sem acentos + sem pontuacao + colapsar plural simples).
 * Marca a rodada como offline no snapshot.
 */
export function fallbackGroup(answers: string[]): { rotulo: string; respostas: string[] }[] {
  const groups = new Map<string, { rotulo: string; respostas: string[] }>();
  for (const raw of answers) {
    const a = raw.trim();
    const key = singularize(normalizeForMatch(a));
    if (!groups.has(key)) {
      groups.set(key, { rotulo: a, respostas: [] });
    }
    groups.get(key)!.respostas.push(a);
  }
  return [...groups.values()];
}
