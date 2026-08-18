import express from 'express';
import { countQuestions, countRooms } from './persistence';
import { roomRoutes } from './handlers/room-routes';
import { gameRoutes } from './handlers/game-routes';
import { adminRoutes } from './handlers/admin-routes';
import { err } from './handlers/index';

export function buildApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', async (_req, res) => {
    try {
      const rooms = await countRooms();
      res.json({ ok: true, rooms, uptime: process.uptime() });
    } catch (e) {
      err(res, e);
    }
  });

  app.post('/api/questions/suggest', async (req, res) => {
    try {
      const { insertQuestion, questionTextExists } = await import('./persistence');
      const text = String(req.body?.text ?? '').trim();
      if (text.length < 5 || text.length > 140) {
        res.status(400).json({ error: 'A pergunta deve ter entre 5 e 140 caracteres.' });
        return;
      }
      if (await questionTextExists(text)) {
        res.status(409).json({ error: 'Essa pergunta já existe no banco de perguntas.' });
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
      err(res, e);
    }
  });

  app.use('/api', roomRoutes);
  app.use('/api', gameRoutes);
  app.use('/api/admin', adminRoutes);

  return app;
}
