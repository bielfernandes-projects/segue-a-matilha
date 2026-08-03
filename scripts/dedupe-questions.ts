import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { questionKey } from '../packages/game/src/questions';

type Row = { id: string; text: string; status: string; created_at: number };

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('[dedupe] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios (raiz .env).');
  process.exit(1);
}

const supabase = createClient(url, key);

const { data, error } = await supabase.from('questions').select('id, text, status, created_at').limit(5000);
if (error) throw error;
const rows = (data ?? []) as Row[];

const approvedRows = rows.filter((q) => q.status === 'approved');
const approvedKeys = new Set(approvedRows.map((q) => questionKey(q.text)));
const pendentes = rows.filter((q) => q.status === 'pending');

const pendingDupOfApproved = pendentes.filter((q) => approvedKeys.has(questionKey(q.text)));

const seen = new Map<string, string>();
const pendingIntraDuplicates: string[] = [];
for (const q of [...pendentes].sort((a, b) => a.created_at - b.created_at)) {
  const keyText = questionKey(q.text);
  if (seen.has(keyText)) pendingIntraDuplicates.push(q.id);
  else seen.set(keyText, q.id);
}

const approvedDupCount = approvedRows.length - new Set(approvedRows.map((q) => questionKey(q.text))).size;

const toDelete = new Set([...pendingDupOfApproved.map((q) => q.id), ...pendingIntraDuplicates]);

console.log(`Total de perguntas: ${rows.length}`);
console.log(`  Aprovadas: ${rows.filter((q) => q.status === 'approved').length}${approvedDupCount > 0 ? ` (com ${approvedDupCount} texto(s) duplicado(s) entre si — nao apagado)` : ''}`);
console.log(`  Pendentes: ${pendentes.length}`);
console.log(`  Rejeitadas: ${rows.filter((q) => q.status === 'rejected').length}`);
console.log('');
console.log(`Pendentes que ja existem como aprovadas: ${pendingDupOfApproved.length}`);
console.log(`Pendentes duplicadas entre si (mantendo a mais antiga): ${pendingIntraDuplicates.length}`);
console.log(`Total a apagar: ${toDelete.size}`);

if (toDelete.size === 0) {
  console.log('[dedupe] Nada a apagar.');
  process.exit(0);
}

let deleted = 0;
for (const id of toDelete) {
  const { error: delError } = await supabase.from('questions').delete().eq('id', id);
  if (delError) console.error(`  Falha ao apagar ${id}: ${delError.message}`);
  else deleted += 1;
}
console.log(`[dedupe] Apagadas: ${deleted}.`);
