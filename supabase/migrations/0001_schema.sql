-- Core schema: zones/houses (geography, campaign-independent), campaigns
-- (one row per flier run), assignments + delivery_status (per-campaign).
-- See PLAN.md section 3 for the full rationale.

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'admin' check (role in ('admin', 'volunteer')),
  created_at timestamptz not null default now()
);

create table zones (
  id serial primary key,
  number int not null unique,
  name text,
  created_at timestamptz not null default now()
);

create table houses (
  id serial primary key,
  zone_id int not null references zones (id) on delete restrict,
  address text not null,
  lat double precision,
  lng double precision,
  notes text,
  created_at timestamptz not null default now()
);
create index houses_zone_id_idx on houses (zone_id);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table assignments (
  id serial primary key,
  campaign_id uuid not null references campaigns (id) on delete cascade,
  zone_id int references zones (id) on delete cascade,
  house_id int references houses (id) on delete cascade,
  volunteer_id uuid not null references profiles (id) on delete cascade,
  assigned_by uuid references profiles (id),
  assigned_at timestamptz not null default now(),
  constraint assignments_zone_or_house check (zone_id is not null or house_id is not null)
);
create index assignments_campaign_id_idx on assignments (campaign_id);
create index assignments_volunteer_id_idx on assignments (volunteer_id);

create table delivery_status (
  id serial primary key,
  campaign_id uuid not null references campaigns (id) on delete cascade,
  house_id int not null references houses (id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'delivered', 'no_answer', 'skipped')),
  updated_by uuid references profiles (id),
  updated_at timestamptz not null default now(),
  unique (campaign_id, house_id)
);
create index delivery_status_campaign_id_idx on delivery_status (campaign_id);

create table invitations (
  id serial primary key,
  email text not null unique,
  role text not null check (role in ('admin', 'volunteer')),
  invited_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
