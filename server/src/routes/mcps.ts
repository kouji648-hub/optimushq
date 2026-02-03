import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../db/connection.js';

const router = Router();

// Encryption helpers (same as settings.ts)
const ALGO = 'aes-256-cbc';
function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_PASS || 'default-key';
  return crypto.scryptSync(secret, 'claude-agent-board-salt', 32);
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  try {
    const [ivHex, encrypted] = text.split(':');
    if (!ivHex || !encrypted) return text; // Not encrypted
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, getEncryptionKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return text; // Return as-is if decryption fails (not encrypted)
  }
}

// Encrypt non-empty env values
function encryptEnv(envJson: string): string {
  try {
    const env = JSON.parse(envJson) as Record<string, string>;
    const encrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      if (value && value.trim()) {
        encrypted[key] = 'enc:' + encrypt(value);
      } else {
        encrypted[key] = value; // Keep empty values as-is
      }
    }
    return JSON.stringify(encrypted);
  } catch {
    return envJson;
  }
}

// Decrypt env values for MCP config
export function decryptEnv(envJson: string): Record<string, string> {
  try {
    const env = JSON.parse(envJson) as Record<string, string>;
    const decrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      if (value && value.startsWith('enc:')) {
        decrypted[key] = decrypt(value.slice(4));
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  } catch {
    return {};
  }
}

// Mask env values for frontend display
function maskEnv(envJson: string): string {
  try {
    const env = JSON.parse(envJson) as Record<string, string>;
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      if (value && value.startsWith('enc:')) {
        // Show masked version
        masked[key] = '********';
      } else if (value && value.trim()) {
        // Non-encrypted but has value (legacy)
        masked[key] = '********';
      } else {
        masked[key] = value; // Keep empty values visible
      }
    }
    return JSON.stringify(masked);
  } catch {
    return envJson;
  }
}

// Add masked env to response
function maskMcpResponse(row: any): any {
  if (!row) return row;
  return {
    ...row,
    env: maskEnv(row.env),
  };
}

router.get('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const rows = getDb().prepare('SELECT * FROM mcp_servers WHERE is_internal = 0 AND user_id = ? ORDER BY is_default DESC, name ASC').all(userId) as any[];
  res.json(rows.map(maskMcpResponse));
});

router.get('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const row = getDb().prepare('SELECT * FROM mcp_servers WHERE id = ? AND (user_id = ? OR is_internal = 1)').get(req.params.id, userId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(maskMcpResponse(row));
});

router.post('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, description = '', command, args = '[]', env = '{}' } = req.body;
  if (!name || !command) return res.status(400).json({ error: 'name and command required' });
  const id = uuid();
  const encryptedEnv = encryptEnv(env);
  getDb().prepare(
    'INSERT INTO mcp_servers (id, name, description, command, args, env, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, description, command, args, encryptedEnv, userId);
  res.status(201).json(maskMcpResponse(getDb().prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id)));
});

router.put('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, description, command, args, env, enabled } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM mcp_servers WHERE id = ? AND user_id = ?').get(req.params.id, userId) as { is_internal?: number } | undefined;
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if ((existing as any).is_internal) return res.status(400).json({ error: 'Cannot modify internal MCP server' });

  // Only encrypt env if it's being updated
  const encryptedEnv = env !== undefined ? encryptEnv(env) : null;

  db.prepare(
    "UPDATE mcp_servers SET name = COALESCE(?, name), description = COALESCE(?, description), command = COALESCE(?, command), args = COALESCE(?, args), env = COALESCE(?, env), enabled = COALESCE(?, enabled), updated_at = datetime('now') WHERE id = ? AND user_id = ?"
  ).run(name ?? null, description ?? null, command ?? null, args ?? null, encryptedEnv, enabled ?? null, req.params.id, userId);
  res.json(maskMcpResponse(db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const db = getDb();
  const row = db.prepare('SELECT is_default, is_internal FROM mcp_servers WHERE id = ? AND user_id = ?').get(req.params.id, userId) as { is_default: number; is_internal: number } | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.is_internal) return res.status(400).json({ error: 'Cannot delete internal MCP server' });
  if (row.is_default) return res.status(400).json({ error: 'Cannot delete default MCP server' });
  db.prepare('DELETE FROM mcp_servers WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.status(204).end();
});

export default router;
