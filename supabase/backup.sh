#!/usr/bin/env bash
# Dumps the live Supabase project's public schema (schema + data) to a
# timestamped local .sql file via the connection pooler. Uses a
# version-matched pg_dump in a container so nothing needs installing.
#
# Usage: PGPASSWORD='...' ./backup.sh [output-dir]
# (DB password: 1Password item "supabase blca-flier")
set -euo pipefail

OUT_DIR="${1:-$HOME/backups/blca_flier}"
mkdir -p "$OUT_DIR"
: "${PGPASSWORD:?Set PGPASSWORD to the Supabase database password first}"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUT_FILE="$OUT_DIR/blca_flier_${TIMESTAMP}.sql"

podman run --rm -e PGPASSWORD -v "$OUT_DIR:/backup:Z" docker.io/library/postgres:17-alpine \
  pg_dump "host=aws-1-us-west-2.pooler.supabase.com port=6543 dbname=postgres user=postgres.jolliqchwhzghwjeoocq sslmode=require" \
  --no-owner --no-privileges --schema=public \
  -f "/backup/blca_flier_${TIMESTAMP}.sql"

echo "Wrote $OUT_FILE"
