import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { QuestionStatus } from '@segue/shared';
import { config } from './config';
import { seedIfEmpty } from './db/seed';
import {
  deleteQuestion,
  insertQuestion,
  listQuestions,
  updateQuestionStatus,
} from './db/supabase';
import { invalidateQuestionCache } from './game/questions';
import { RoomManager } from './game/roomManager';
import { GameLoop } from './game/gameLoop';
import { createSocketServer } from './socket';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(dirname, '..', '..', '..');
const WEB_DIST = path.join(REPO_ROOT, 'apps', 'web', 'dist');

function isQuestionStatus(v: unknown): v is QuestionStatus {
  return v === 'approved' || v === 'pending' || v === 'rejected';
}

async function main(): Promise<void> {
  await seedIfEmpty().catch((e: Error) => {
    console.error(`[db] Falha ao rodar seed: ${e.message}`);
  });

  const app = express();
  app.use(express.json());

  if (fs.existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
  } else {
    console.warn('[web] apps/web/dist nao encontrado. Rode `npm run build -w @segue/web`.');
  }

  const rooms = new RoomManager();
  const loop = new GameLoop(rooms);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.activeCount(), uptime: process.uptime() });
  });

  app.post('/api/questions/suggest', async (req, res) => {
    try {
      const text = String(req.body?.text ?? '').trim();
      if (text.length < 5 || text.length > 140) {
        res.status(400).json({ error: 'A pergunta deve ter entre 5 e 140 caracteres.' });
        return;
      }
      const question = await insertQuestion({
        text,
        status: 'pending',
        author: String(req.body?.author ?? 'Jogador Anônimo').slice(0, 25),
        category: 'Geral',
      });
      res.status(201).json(question);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  const admin = express.Router();
  admin.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers['x-admin-token'] !== config.adminToken) {
      res.status(401).json({ error: 'Nao autorizado.' });
      return;
    }
    next();
  });

  admin.get('/questions', async (_req, res) => {
    try {
      res.json(await listQuestions());
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  admin.post('/questions', async (req, res) => {
    try {
      const text = String(req.body?.text ?? '').trim();
      if (!text) {
        res.status(400).json({ error: 'Texto da pergunta e obrigatorio.' });
        return;
      }
      const status: QuestionStatus = isQuestionStatus(req.body?.status) ? req.body.status : 'pending';
      const question = await insertQuestion({
        text,
        status,
        author: String(req.body?.author ?? 'Painel'),
        category: String(req.body?.category ?? 'Geral'),
      });
      invalidateQuestionCache();
      res.status(201).json(question);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  admin.patch('/questions/:id', async (req, res) => {
    try {
      if (!isQuestionStatus(req.body?.status)) {
        res.status(400).json({ error: 'Status invalido.' });
        return;
      }
      await updateQuestionStatus(req.params.id, req.body.status);
      invalidateQuestionCache();
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  admin.delete('/questions/:id', async (req, res) => {
    try {
      await deleteQuestion(req.params.id);
      invalidateQuestionCache();
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.use('/api/admin', admin);

  const httpServer = createSocketServer(app, rooms, loop);
  httpServer.listen(config.port, () => {
    console.log(`[server] Segue a Matilha ouvindo em http://localhost:${config.port}`);
  });
}

void main();
