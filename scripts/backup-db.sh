#!/bin/bash
# Daily SQLite backup with 7-day retention
set -euo pipefail

DB_PATH="/root/claude-chat/chat.db"
BACKUP_DIR="/home/claude/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/chat_${TIMESTAMP}.db"
KEEP_DAYS=7

# Use better-sqlite3 backup API (safe while server is running)
node -e "
  const Database = require('better-sqlite3');
  const db = new Database('${DB_PATH}', { readonly: true });
  db.backup('${BACKUP_FILE}').then(() => { db.close(); });
"

# Compress the backup
gzip "$BACKUP_FILE"

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "chat_*.db.gz" -mtime +${KEEP_DAYS} -delete

echo "[$(date)] Backup created: ${BACKUP_FILE}.gz ($(du -h "${BACKUP_FILE}.gz" | cut -f1))"
