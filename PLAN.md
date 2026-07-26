# BLCA Flier Delivery Map — Plan

## 1. Goal

A small web app for Boulevard Lane Community Association volunteers to:

- See an interactive map of the neighborhood, broken into delivery zones and houses.
- Track delivery status per house for a given campaign (e.g. "BLCA August 2026 BBQ Flier") and
  have that status update live (near-real-time) for everyone else looking at the same campaign.
- Let admins assign zones/houses to specific volunteers.
- Let admins invite other admins/volunteers.
- Let anyone — logged in or not — view the current map and delivery status. Only signed-in
  volunteers/admins can change anything.

Real RBAC (admin vs. volunteer) is built from day one. Early on, everyone who signed in started
out as an admin; as of migration 0008 anyone signing in without a matching `invitations` row now
defaults to `volunteer` instead. Admins can promote anyone to admin directly from the Admin page's
People section.

## 2. Chosen stack

| Concern | Choice | Why |
|---|---|---|
| Auth | Supabase Auth, Google OAuth provider | Works with any Google account, not tied to one Workspace domain. No password management. |
| Database | Supabase Postgres | Real relational model for zones/houses/campaigns/assignments/status. Row Level Security gives us RBAC and the public read-only view for free. |
| Realtime | Supabase Realtime (Postgres logical replication over websockets) | Subscribe to the `delivery_status` table; every connected client gets pushed the change and recolors the map. No polling needed. |
| Frontend | React + Vite + TypeScript | Small, fast, static build output — no server to run. |
| Map | Leaflet + OpenStreetMap tiles | Free forever, no API key, no billing account. (Google Maps JS API was considered but now requires a Cloud billing account attached even for free-tier usage, which conflicts with "free public resources.") |
| Hosting (frontend) | GitHub Pages, built via GitHub Actions on push to `main` | Free, lives right next to the code, no extra account. Requires the repo to stay **public** (private-repo Pages needs a paid GitHub plan) — done. |
| Local/offline fallback | `supabase start` (Docker) for the backend + `vite dev`/`vite preview` for the frontend | Satisfies "could be locally hosted if necessary" without a second codebase. |

Nothing here costs money at this scale. The only paid step would ever be a custom domain, which
is optional.

## 3. Data model (Postgres / Supabase)

```
profiles
  id            uuid PK, references auth.users(id)
  email         text
  display_name  text
  role          text  -- 'admin' | 'volunteer'  (default 'volunteer' unless invited as admin, see §4)
  created_at    timestamptz default now()

zones
  id            serial PK
  number        int unique        -- 1..22, matches the original paper zone map
  name          text nullable     -- e.g. cross streets, for humans
  created_at    timestamptz default now()

houses
  id            serial PK
  zone_id       int references zones(id)
  address       text              -- full mailing address (see §7, open item: needs street name)
  lat           double precision null
  lng           double precision null
  notes         text null
  created_at    timestamptz default now()

campaigns
  id            uuid PK default gen_random_uuid()
  slug          text unique       -- e.g. 'bbq-aug-2026'
  name          text              -- 'BLCA August 2026 BBQ Flier'
  active        boolean default true
  created_by    uuid references profiles(id)
  created_at    timestamptz default now()

assignments
  id            serial PK
  campaign_id   uuid references campaigns(id)
  zone_id       int references zones(id) null       -- assign a whole zone...
  house_id      int references houses(id) null       -- ...or a single house
  volunteer_id  uuid references profiles(id)
  assigned_by   uuid references profiles(id)
  assigned_at   timestamptz default now()
  check (zone_id is not null or house_id is not null)

delivery_status
  id            serial PK
  campaign_id   uuid references campaigns(id)
  house_id      int references houses(id)
  status        text  -- 'not_started' | 'delivered' | 'no_answer' | 'skipped'
  updated_by    uuid references profiles(id)
  updated_at    timestamptz default now()
  unique (campaign_id, house_id)

invitations
  id            serial PK
  email         text unique
  role          text  -- 'admin' | 'volunteer'
  invited_by    uuid references profiles(id)
  created_at    timestamptz default now()
  accepted_at   timestamptz null
```

Zones/houses are geography — they don't change per campaign. `campaigns` is the concept of "one
flier run"; `delivery_status` and `assignments` are per-campaign, so next year's flier is just a
new row in `campaigns` and a fresh, empty `delivery_status` table, while reusing the same
houses/zones.

## 4. RBAC / Row Level Security

- **Anonymous (not logged in):** `SELECT` only, on `zones`, `houses`, `campaigns`, `delivery_status`.
  This is what makes the public read-only map work with no login.
- **Authenticated, role = volunteer:** anonymous rights, plus `INSERT/UPDATE` on `delivery_status`
  rows for houses currently assigned to them (via `assignments`) for active campaigns.
- **Authenticated, role = admin:** all of the above, plus full CRUD on `zones`, `houses`,
  `campaigns`, `assignments`, `invitations`, and `profiles.role` for other users.
- A Postgres trigger on `auth.users` insert creates the matching `profiles` row. Role is resolved
  as: if an `invitations` row exists for that email, use its `role` and mark it accepted;
  otherwise default to `'volunteer'` (migration 0008). Anyone who signs in without an invite lands
  as a volunteer with no assignments yet -- an admin promotes them from the Admin page's People
  section if needed.

## 5. Realtime update flow

1. Volunteer taps a house on the map → opens a small panel → picks a status.
2. Client writes the new row to `delivery_status` (RLS checks it's allowed).
3. Supabase Realtime broadcasts the change to every client subscribed to that campaign's channel.
4. Each client's map re-renders that one marker's color. No page reload, no polling.

## 6. Map UX

- One Leaflet map, centered on the neighborhood, zoom locked to a sensible range.
- Markers (not polygons, at least at first — see open item below) per house, colored by
  `delivery_status.status` for the currently-selected campaign:
  - gray = not started, yellow = attempted/no answer, green = delivered, red = skipped.
- Zone boundaries drawn as light outlines/labels for orientation, not as the source of truth for
  color (color is always per-house).
- A campaign picker (dropdown) at the top — defaults to whatever campaign is marked `active`.
- Signed-out visitors see the same map, read-only, with a "Sign in with Google" button that
  unlocks editing (and, for admins, an assignment view).

## 7. Open items / decisions to make before or during Phase 1

- **Full addresses + coordinates.** The zone map we transcribed into the "blca bbq aug 2026
  delivery" Google Sheet only has house numbers, not street names, and no lat/lng. We need either
  (a) the street name per zone (there aren't too many streets) so we can geocode with a free
  geocoder (e.g. Nominatim, respecting its usage policy / rate limit), or (b) to hand-place pins
  once by dragging markers on the map during setup. Plan is to do (a) then spot-fix with (b).
- **Zone boundaries as polygons.** Nice-to-have for a future pass — would mean tracing the
  original zone map image into GeoJSON. Not required for v1 (house markers are enough).
- **Invitations don't send email yet.** v1 "invite" = admin adds a row to `invitations` with an
  email + role; when that person signs in with Google using that exact email, they get the role.
  Actually emailing them the link is a manual step (or a Phase-later improvement using e.g.
  Supabase's email sending or a mailto link) for now.
- **Remote log shipping (future).** `activity_log` (added later — see its migration) currently
  only lives in Supabase Postgres, queryable by hand. Plan for later: point Grafana Cloud's free
  tier at the Supabase Postgres connection directly as a data source (no ETL/shipping pipeline
  needed, since the data's already relational) for dashboards/alerts; Grafana Cloud's free tier
  also includes Loki if we ever want true log-line ingestion (e.g. GitHub Actions run output)
  alongside it. Prometheus doesn't fit here -- it's a pull-based metrics system, not a log store,
  so an Elastic-family option (e.g. Bonsai's free Elasticsearch tier) would need a small scheduled
  job shipping new rows via HTTP, more moving parts than querying Postgres directly.

## 8. Milestones

- **Phase 0 (this commit):** repo + this plan.
- **Phase 1:** Supabase project, schema + RLS above, seed `zones`/`houses` from the existing
  Google Sheet, seed one `campaigns` row for the August 2026 BBQ flier.
- **Phase 2:** Vite/React app skeleton, Supabase client, Google sign-in, profile bootstrap.
- **Phase 3:** Public read-only map (Leaflet + house markers colored by status) — works fully
  signed-out.
- **Phase 4:** Authenticated status updates + realtime propagation across open tabs/devices.
- **Phase 5:** Admin assignment UI (assign zones/houses to a volunteer for a campaign).
- **Phase 6:** Invite flow UI (admin adds email + role to `invitations`).
- **Phase 7:** Polish — mobile-friendly layout, "my assigned houses" filtered view for
  volunteers, campaign creation UI for future events, optional zone polygons.

## 9. Repo layout (once Phase 2 starts)

```
/PLAN.md              this file
/app/                 Vite + React + TS frontend
/supabase/
  migrations/          SQL schema + RLS as versioned migrations
  seed/                seed data (zones/houses import from the delivery sheet)
/.github/workflows/    CI: build app, run `supabase db lint`/migrations check, deploy Pages
```
