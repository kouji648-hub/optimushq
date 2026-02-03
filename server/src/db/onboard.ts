import { v4 as uuid } from 'uuid';
import { getDb } from './connection.js';

// Only clone these seeded defaults to new users (not custom items added by admin)
const DEFAULT_AGENT_NAMES = ['Builder', 'Researcher', 'Debugger', 'Writer', 'DevOps'];
const DEFAULT_SKILL_NAMES = ['Code Review', 'Concise Output', 'Testing', 'Agent Browser'];
const DEFAULT_MCP_NAMES = ['Chrome DevTools'];

/**
 * Onboard a new user: create their General project, clone default agents/skills/MCPs.
 */
export function onboardUser(userId: string) {
  const db = getDb();

  // Find admin user (first admin)
  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1").get() as { id: string } | undefined;
  if (!admin) return;

  // 1. Create user's General project
  const generalId = uuid();
  db.prepare('INSERT INTO projects (id, name, description, user_id, is_general) VALUES (?, ?, ?, ?, 1)')
    .run(generalId, 'General', 'Default project for general chats', userId);

  // 2. Clone only default agents from admin
  const adminAgents = db.prepare('SELECT name, system_prompt, icon, is_default, model FROM agents WHERE user_id = ?').all(admin.id) as {
    name: string; system_prompt: string; icon: string; is_default: number; model: string;
  }[];

  const insertAgent = db.prepare('INSERT INTO agents (id, name, system_prompt, icon, is_default, model, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const a of adminAgents) {
    if (DEFAULT_AGENT_NAMES.includes(a.name)) {
      insertAgent.run(uuid(), a.name, a.system_prompt, a.icon, a.is_default, a.model, userId);
    }
  }

  // 3. Clone only default skills from admin
  const adminSkills = db.prepare("SELECT name, slug, description, prompt, is_global, scope, icon, globs FROM skills WHERE user_id = ? AND scope = 'global'").all(admin.id) as {
    name: string; slug: string; description: string; prompt: string; is_global: number; scope: string; icon: string; globs: string | null;
  }[];

  const insertSkill = db.prepare('INSERT INTO skills (id, name, slug, description, prompt, is_global, scope, icon, globs, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const s of adminSkills) {
    if (DEFAULT_SKILL_NAMES.includes(s.name)) {
      insertSkill.run(uuid(), s.name, s.slug, s.description, s.prompt, s.is_global, s.scope, s.icon, s.globs, userId);
    }
  }

  // 4. Clone only default MCP servers from admin
  const adminMcps = db.prepare('SELECT name, description, command, args, env, enabled, is_default FROM mcp_servers WHERE user_id = ? AND is_internal = 0').all(admin.id) as {
    name: string; description: string; command: string; args: string; env: string; enabled: number; is_default: number;
  }[];

  const insertMcp = db.prepare('INSERT INTO mcp_servers (id, name, description, command, args, env, enabled, is_default, is_internal, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)');
  for (const m of adminMcps) {
    if (DEFAULT_MCP_NAMES.includes(m.name)) {
      insertMcp.run(uuid(), m.name, m.description, m.command, m.args, m.env, m.enabled, m.is_default, userId);
    }
  }
}
