import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/connection.js';
import type { Memory, MemoryEntry } from '../../../shared/types.js';

const router = Router();

// Helper: verify project belongs to user
function verifyProjectOwner(projectId: string, userId: string): boolean {
  const row = getDb().prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
  return !!row;
}

// Helper: verify session belongs to user
function verifySessionOwner(sessionId: string, userId: string): boolean {
  const row = getDb().prepare('SELECT id FROM sessions WHERE id = ? AND user_id = ?').get(sessionId, userId);
  return !!row;
}

// --- Project-level memory ---

router.get('/project/:projectId', (req: Request, res: Response) => {
  const userId = req.user!.id;
  if (!verifyProjectOwner(req.params.projectId, userId)) return res.status(404).json({ error: 'Not found' });

  const db = getDb();
  let row = db.prepare('SELECT * FROM project_memory WHERE project_id = ?').get(req.params.projectId) as Memory | undefined;
  if (!row) {
    const id = randomUUID();
    db.prepare('INSERT INTO project_memory (id, project_id) VALUES (?, ?)').run(id, req.params.projectId);
    row = db.prepare('SELECT * FROM project_memory WHERE project_id = ?').get(req.params.projectId) as Memory;
  }
  res.json({ summary: row.summary });
});

router.put('/project/:projectId', (req: Request, res: Response) => {
  const userId = req.user!.id;
  if (!verifyProjectOwner(req.params.projectId, userId)) return res.status(404).json({ error: 'Not found' });

  const { summary } = req.body;
  const db = getDb();
  let existing = db.prepare('SELECT * FROM project_memory WHERE project_id = ?').get(req.params.projectId);
  if (!existing) {
    const id = randomUUID();
    db.prepare('INSERT INTO project_memory (id, project_id) VALUES (?, ?)').run(id, req.params.projectId);
  }
  db.prepare("UPDATE project_memory SET summary = COALESCE(?, summary), updated_at = datetime('now') WHERE project_id = ?")
    .run(summary ?? null, req.params.projectId);
  const updated = db.prepare('SELECT * FROM project_memory WHERE project_id = ?').get(req.params.projectId) as Memory;
  res.json({ summary: updated.summary });
});

// --- Session-level memory ---

router.get('/:sessionId', (req: Request, res: Response) => {
  const userId = req.user!.id;
  if (!verifySessionOwner(req.params.sessionId, userId)) return res.status(404).json({ error: 'Not found' });

  const row = getDb()
    .prepare('SELECT * FROM memory WHERE session_id = ?')
    .get(req.params.sessionId) as Memory | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, pinned_facts: JSON.parse(row.pinned_facts) });
});

router.put('/:sessionId', (req: Request, res: Response) => {
  const userId = req.user!.id;
  if (!verifySessionOwner(req.params.sessionId, userId)) return res.status(404).json({ error: 'Not found' });

  const { summary, pinned_facts } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM memory WHERE session_id = ?').get(req.params.sessionId);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare("UPDATE memory SET summary = COALESCE(?, summary), pinned_facts = COALESCE(?, pinned_facts), updated_at = datetime('now') WHERE session_id = ?")
    .run(
      summary ?? null,
      pinned_facts ? JSON.stringify(pinned_facts) : null,
      req.params.sessionId
    );
  const updated = db.prepare('SELECT * FROM memory WHERE session_id = ?').get(req.params.sessionId) as Memory;
  res.json({ ...updated, pinned_facts: JSON.parse(updated.pinned_facts) });
});

// --- Memory entries (cross-project) ---

router.get('/entries', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const db = getDb();
  const projectId = req.query.project_id as string | undefined;
  const category = req.query.category as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;

  let sql = `
    SELECT me.*, p.name as project_name
    FROM memory_entries me
    JOIN projects p ON me.project_id = p.id
    WHERE p.user_id = ?
  `;
  const params: unknown[] = [userId];

  if (projectId) {
    sql += ' AND me.project_id = ?';
    params.push(projectId);
  }
  if (category) {
    sql += ' AND me.category = ?';
    params.push(category);
  }
  sql += ' ORDER BY me.created_at DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as MemoryEntry[];
  res.json(rows);
});

router.get('/entries/search', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const db = getDb();
  const query = req.query.q as string;
  if (!query) return res.status(400).json({ error: 'q parameter is required' });

  const projectId = req.query.project_id as string | undefined;
  const category = req.query.category as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;

  let sql = `
    SELECT me.*, p.name as project_name
    FROM memory_entries_fts fts
    JOIN memory_entries me ON me.rowid = fts.rowid
    JOIN projects p ON me.project_id = p.id
    WHERE memory_entries_fts MATCH ? AND p.user_id = ?
  `;
  const params: unknown[] = [query, userId];

  if (projectId) {
    sql += ' AND me.project_id = ?';
    params.push(projectId);
  }
  if (category) {
    sql += ' AND me.category = ?';
    params.push(category);
  }
  sql += ' ORDER BY rank LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as MemoryEntry[];
  res.json(rows);
});

router.post('/entries', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const db = getDb();
  const { project_id, category, title, content, tags } = req.body;
  if (!project_id || !category || !title || !content) {
    return res.status(400).json({ error: 'project_id, category, title, and content are required' });
  }

  if (!verifyProjectOwner(project_id, userId)) return res.status(404).json({ error: 'Project not found' });

  const validCategories = ['decision', 'feature', 'bug', 'content', 'todo', 'context'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
  }

  const id = randomUUID();
  db.prepare('INSERT INTO memory_entries (id, project_id, category, title, content, tags) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, project_id, category, title, content, tags || '[]');

  const row = db.prepare('SELECT me.*, p.name as project_name FROM memory_entries me JOIN projects p ON me.project_id = p.id WHERE me.id = ?').get(id) as MemoryEntry;
  res.status(201).json(row);
});

export default router;
