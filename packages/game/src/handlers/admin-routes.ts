import { Router } from 'express';
import type { Request, Response } from 'express';
import type { QuestionStatus } from '@segue/shared';
import { config } from '../config';
import {
  listQuestions,
  insertQuestion,
  updateQuestionStatus,
  deleteQuestion,
  questionTextExists,
} from '../persistence';
import { err } from './index';

export const adminRoutes = Router();

adminRoutes.use((req: Request, res: Response, next: () => void) => {
  if (req.headers['x-admin-token'] !== config.adminToken) {
    res.status(401).json({ error: 'Nao autorizado.' });
    return;
  }
  next();
});

function isQuestionStatus(v: unknown): v is QuestionStatus {
  return v === 'approved' || v === 'pending' || v === 'rejected';
}

adminRoutes.get('/questions', async (req, res) => {
  try {
    const status = req.query?.status as string | undefined;
    const validStatus = status === 'approved' || status === 'pending' || status === 'rejected' ? status : undefined;
    res.json(await listQuestions(validStatus));
  } catch (e) {
    err(res, e);
  }
});

adminRoutes.post('/questions', async (req, res) => {
  try {
    const text = String(req.body?.text ?? '').trim();
    if (!text) {
      res.status(400).json({ error: 'Texto da pergunta e obrigatorio.' });
      return;
    }
    if (await questionTextExists(text)) {
      res.status(409).json({ error: 'Essa pergunta já existe no banco de perguntas.' });
      return;
    }
    const status: QuestionStatus = isQuestionStatus(req.body?.status) ? req.body.status : 'pending';
    const question = await insertQuestion({
      text,
      status,
      author: String(req.body?.author ?? 'Painel'),
      category: String(req.body?.category ?? 'Geral'),
    });
    res.status(201).json(question);
  } catch (e) {
    err(res, e);
  }
});

adminRoutes.patch('/questions/:id', async (req, res) => {
  try {
    if (!isQuestionStatus(req.body?.status)) {
      res.status(400).json({ error: 'Status invalido.' });
      return;
    }
    await updateQuestionStatus(req.params.id, req.body.status);
    res.json({ ok: true });
  } catch (e) {
    err(res, e);
  }
});

adminRoutes.delete('/questions/:id', async (req, res) => {
  try {
    await deleteQuestion(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    err(res, e);
  }
});
