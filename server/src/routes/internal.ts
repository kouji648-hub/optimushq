import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { saveUserMessage, spawnForSession } from '../ws/handler.js';
import type { PermissionMode } from '../../../shared/types.js';

const router = Router();

router.post('/trigger-message', (req, res) => {
  const { sessionId, content, model, mode } = req.body as {
    sessionId: string;
    content: string;
    model?: string;
    mode?: PermissionMode;
  };

  if (!sessionId || !content) {
    return res.status(400).json({ error: 'sessionId and content are required' });
  }

  const db = getDb();
  const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  saveUserMessage(sessionId, content);
  spawnForSession(sessionId, content, undefined, model, false, mode);

  res.json({ ok: true, sessionId });
});

export default router;
