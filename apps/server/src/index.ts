import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { buildApp, config } from '@segue/game';
import { seedIfEmpty } from './db/seed';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(dirname, '..', '..', '..');
const WEB_DIST = path.join(REPO_ROOT, 'apps', 'web', 'dist');

async function main(): Promise<void> {
  await seedIfEmpty().catch((e: Error) => {
    console.error(`[db] Falha ao rodar seed: ${e.message}`);
  });

  const app = buildApp();

  if (fs.existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
  } else {
    console.warn('[web] apps/web/dist nao encontrado. Rode `npm run build -w @segue/web`.');
  }

  app.listen(config.port, () => {
    console.log(`[server] Segue a Matilha (dev) ouvindo em http://localhost:${config.port}`);
  });
}

void main();
