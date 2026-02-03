import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const rows = getDb().prepare('SELECT * FROM agents WHERE user_id = ? ORDER BY is_default DESC, name ASC').all(userId);
  res.json(rows);
});

router.get('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const row = getDb().prepare('SELECT * FROM agents WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, system_prompt, icon = '🤖', model = 'sonnet' } = req.body;
  if (!name || !system_prompt) return res.status(400).json({ error: 'name and system_prompt required' });
  const id = uuid();
  getDb().prepare('INSERT INTO agents (id, name, system_prompt, icon, model, user_id) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, system_prompt, icon, model, userId);
  res.status(201).json(getDb().prepare('SELECT * FROM agents WHERE id = ?').get(id));
});

router.put('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, system_prompt, icon, model } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM agents WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare("UPDATE agents SET name = COALESCE(?, name), system_prompt = COALESCE(?, system_prompt), icon = COALESCE(?, icon), model = COALESCE(?, model), updated_at = datetime('now') WHERE id = ? AND user_id = ?")
    .run(name ?? null, system_prompt ?? null, icon ?? null, model ?? null, req.params.id, userId);
  res.json(db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  getDb().prepare('DELETE FROM agents WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.status(204).end();
});

export default router;
