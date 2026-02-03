import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve DB path: prefer PROJECT_DB_PATH env var, fall back to project root
const DB_PATH = process.env.PROJECT_DB_PATH || path.resolve(path.join(__dirname, '..', '..', '..', 'chat.db'));

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}
