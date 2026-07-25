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
# This project's first 9 migrations were applied by hand (via the Supabase
# SQL editor) before this script existed, so the baseline insert below
# seeds them into public._migrations_applied as already-done -- a no-op
# every run after the first, via ON CONFLICT DO NOTHING.
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

  insert into public._migrations_applied (filename)
  select f
  from unnest(array[
    '0001_schema.sql', '0002_profile_bootstrap.sql', '0003_rls.sql', '0004_realtime.sql',
    '0005_routes.sql', '0006_zones_not_routes.sql', '0007_zone_colors.sql',
    '0008_default_volunteer.sql', '0009_self_service_assignments.sql'
  ]) as f
  on conflict (filename) do nothing;
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
