#!/bin/bash

set -e

BOT_DIR="/home/ubuntu/pokemon-classic-discord-bot"
BACKUP_DIR="$BOT_DIR/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
ARCHIVE="$BACKUP_DIR/bot-backup-$DATE.tar.gz"
LOG_FILE="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Début backup" >> "$LOG_FILE"

tar -czf "$ARCHIVE" -C "$BOT_DIR" data logs

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup OK: $ARCHIVE" >> "$LOG_FILE"

find "$BACKUP_DIR" -type f -name "bot-backup-*.tar.gz" -mtime +7 -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Nettoyage OK" >> "$LOG_FILE"
