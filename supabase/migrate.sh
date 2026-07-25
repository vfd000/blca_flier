#!/usr/bin/env bash
# Applies any supabase/migrations/*.sql files not yet recorded in
# public._migrations_applied, in filename order. Each migration + its
# tracking-table insert runs as a single transaction (via `psql -1`), so a
# failure can't leave a migration half-applied but unrecorded, or recorded
# without actually running. Safe to run repeatedly -- already-applied
# migrations are skipped.
#
# Usage: PGPASSWORD='...' ./migrate.sh
# (DB password: 1Password item "supabase blca-flier")
#
# NOTE: this project's migrations were applied by hand (via the Supabase
# SQL editor) before this script existed, so public._migrations_applied
# has to be bootstrapped once with the filenames already live before this
# script's first run -- see the "Applying migrations" section in README.md.
set -euo pipefail

: "${PGPASSWORD:?Set PGPASSWORD to the Supabase database password first}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PSQL=(psql "host=aws-1-us-west-2.pooler.supabase.com port=6543 dbname=postgres user=postgres.jolliqchwhzghwjeoocq sslmode=require" -v ON_ERROR_STOP=1 --no-password)

"${PSQL[@]}" -c "
  create table if not exists public._migrations_applied (
    filename text primary key,
    applied_at timestamptz not null default now()
  );
  alter table public._migrations_applied enable row level security;
"

for f in "$SCRIPT_DIR"/migrations/*.sql; do
  name=$(basename "$f")
  already=$("${PSQL[@]}" -tAc "select 1 from public._migrations_applied where filename = '$name';")
  if [ "$already" = "1" ]; then
    echo "skip $name (already applied)"
    continue
  fi
  echo "applying $name"
  "${PSQL[@]}" -1 -f - <<SQL
\i $f
insert into public._migrations_applied (filename) values ('$name');
SQL
done

echo "Done."
