#!/bin/bash
set -e

DATA=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/root/backups_db"
NOME_ARQUIVO="backup_postgresql_$DATA.sql.gz"

mkdir -p "$BACKUP_DIR"

docker exec -t upa_postgres pg_dump -U upa_user upa_pet_db | gzip > "$BACKUP_DIR/$NOME_ARQUIVO"

docker run --rm -v upa_pet_app_uploads:/volume -v "$BACKUP_DIR":/backup alpine \
  tar -czf "/backup/uploads_$DATA.tar.gz" -C /volume .

if command -v rclone >/dev/null 2>&1; then
  rclone copy "$BACKUP_DIR/$NOME_ARQUIVO" drive_backup:Backups_UPAPET_Postgres/ || true
  rclone copy "$BACKUP_DIR/uploads_$DATA.tar.gz" drive_backup:Backups_UPAPET_Postgres/ || true
fi

find "$BACKUP_DIR" -type f -name "*.gz" -mtime +7 -delete
echo "✅ Backup concluído em $DATA"
