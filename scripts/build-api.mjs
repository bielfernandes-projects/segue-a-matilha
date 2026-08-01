import { build } from 'esbuild';
import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outfile = path.join(root, 'api', 'index.js');

rmSync(outfile, { force: true });

await build({
  entryPoints: [path.join(root, 'serverless-src', 'index.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  sourcemap: false,
  logLevel: 'info',
});

if (!existsSync(outfile)) {
  throw new Error('Falha ao gerar api/index.js');
}

console.log('[build-api] api/index.js gerado.');
