# blca_flier

Interactive delivery-tracking map for Boulevard Lane Community Association flier campaigns
(e.g. the BLCA August 2026 BBQ flier).

See [PLAN.md](./PLAN.md) for the architecture, data model, and milestones.

## Repo layout

- `supabase/migrations/` — SQL schema, RLS policies, and the profile-bootstrap trigger, applied
  in order.
- `supabase/seed/` — zone/house seed data. `houses_raw.json` is the source of truth (house
  numbers transcribed from the delivery sheet, street names read off the zone map);
  `geocode.py` turns it into `seed.sql` by geocoding each address via Nominatim.
- `app/` — Vite + React + TypeScript frontend.
- `.github/workflows/deploy.yml` — builds `app/` and deploys it to GitHub Pages on push to `main`.
- `.github/workflows/db-migrate.yml` — applies new migrations to the live database on push to
  `main` (only when `supabase/migrations/**` changed), or on demand.
- `.github/workflows/db-backup.yml` — nightly encrypted database backup, uploaded as a build
  artifact.
- `.github/workflows/claude-security-review.yml` — AI security review on every PR, via
  Anthropic's `claude-code-security-review` action.

## Delivery mode

Signed-in volunteers see a "Deliver" link (also linked from "My houses") that opens a
mobile-first, one-house-at-a-time view of their assigned houses for the current campaign. It
uses the device's GPS (`navigator.geolocation.watchPosition`) to continually re-sort remaining
houses by walking distance from the volunteer's current position, surfaces the nearest one as
the current target with a "Get directions" link and big status buttons, and flags when the
volunteer is within ~40m of it. Marking a status removes that house from the list and the next-
nearest one becomes the new target — no pre-planned route needed, it just follows wherever the
volunteer actually walks. Falls back to address order if location isn't available.

The app is also installable as a PWA (add to home screen) via `app/public/manifest.webmanifest`
and a small offline-caching service worker (`app/public/sw.js`), so delivery mode stays usable
with spotty cell service mid-route.

## Setting up a Supabase project (once, by a maintainer)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the migrations in `supabase/migrations/` in order, then
   `supabase/seed/seed.sql`.
3. Under Authentication → Providers, enable Google and add your OAuth client ID/secret
   (create one in the Google Cloud Console; no Workspace domain restriction needed).
4. Copy the project URL and anon key into `app/.env.local` (see `app/.env.example`) for local
   dev, and add these repo secrets (Settings → Secrets and variables → Actions) for deploys and
   the database automation below:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — used by `deploy.yml`.
   - `SUPABASE_DB_PASSWORD` — the project's Postgres password (Project Settings → Database),
     used by `db-migrate.yml` and `db-backup.yml` to connect directly. Treat it like any other
     production database password.
   - `BACKUP_ENCRYPTION_PASSPHRASE` — a long random passphrase you generate yourself (e.g.
     `openssl rand -base64 32`), used by `db-backup.yml` to encrypt backups before upload. Store
     it somewhere durable (the repo is public, so backups are GPG-encrypted before they're
     uploaded as a build artifact — anyone can download the artifact, but it's useless without
     this passphrase). **If you lose it, existing backups become unrecoverable.**
   - `CLAUDE_API_KEY` — an Anthropic Console API key ([console.anthropic.com](https://console.anthropic.com)),
     used by `claude-security-review.yml` to post AI-generated security findings on PRs. Billed
     per token, separate from any Claude.ai subscription. Optional -- if unset, that workflow
     just fails on every PR rather than posting anything; the rest of the app is unaffected.
5. In GitHub repo Settings → Pages, set the source to "GitHub Actions". While there, under
   Settings → Actions → General, make sure "Require approval for first-time contributors" (or
   stricter) is set -- this repo is public, and `claude-security-review.yml` isn't hardened
   against prompt injection from a malicious PR, so it shouldn't run unattended on a stranger's
   first PR.
6. Once the two secrets above are set, trigger `db-migrate.yml` once (Actions tab → the
   workflow → "Run workflow", or push a change under `supabase/migrations/`). It seeds
   `public._migrations_applied` with the 9 migrations already applied by hand above (a no-op on
   every run after the first) and then applies anything new automatically from then on.

## Local development

```sh
cd app
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm install
npm run dev
```

For a fully local/offline backend instead of a hosted Supabase project, use the Supabase CLI:

```sh
supabase start   # requires Docker
supabase db reset   # applies migrations + seed.sql
```

## Regenerating the seed data

If house numbers or zone boundaries change, edit `supabase/seed/houses_raw.json` and re-run:

```sh
python3 supabase/seed/geocode.py
```

This re-geocodes only addresses not already in `geocode_cache.json` (Nominatim's usage policy
caps requests at 1/sec, so a full run over ~360 houses takes a few minutes). Addresses it can't
resolve are written to `unresolved_addresses.txt` and get `lat`/`lng = null` in `seed.sql` —
place those by hand as an admin on the live map (click the house in the "Unplaced houses" list,
then click its spot on the map).

**Known caveat:** the street name assigned to each zone was read off a scanned 2005 hand-compiled
map image, not verified address-by-address, so a handful of corner-lot houses may end up with the
wrong street and fail to geocode or land in the wrong place. That's expected — see PLAN.md open
item 7.

## Applying migrations

New migrations under `supabase/migrations/` are applied automatically by `db-migrate.yml` on
push to `main` (or trigger it manually from the Actions tab). To apply them by hand instead —
e.g. to test one locally against the live project before pushing:

```sh
PGPASSWORD='...' supabase/migrate.sh   # password is in the "supabase blca-flier" 1Password item
```

Tracks what's already been applied in a `public._migrations_applied` table, so it's safe to run
repeatedly — only new files get run, each in its own transaction alongside the tracking-row
insert (so a mid-migration failure can't leave that bookkeeping out of sync with what actually
ran). Requires the `psql` client, version-matched to the server (17) to avoid dump/restore
surprises.

## Backing up the database

Automatic: `db-backup.yml` runs nightly and uploads a GPG-encrypted dump as a build artifact
(Actions tab → the run → Artifacts). Decrypt with:

```sh
gpg --batch --passphrase '...' --decrypt backup.sql.gpg > backup.sql   # same passphrase as BACKUP_ENCRYPTION_PASSPHRASE
```

Manual/local, unencrypted (for a maintainer's own machine, not for uploading anywhere):

```sh
PGPASSWORD='...' supabase/backup.sh   # password is in the "supabase blca-flier" 1Password item
```

Dumps the live project's schema + data to a timestamped `.sql` file in `~/backups/blca_flier/`
(or pass a different output directory as the first argument). Requires `podman` or `docker` (used
to run a version-matched `pg_dump`, since the client version has to match the server's).
