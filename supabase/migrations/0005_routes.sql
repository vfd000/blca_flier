-- Routes are durable, numbered groupings of houses that persist across
-- campaigns -- unlike assignments (which are per-campaign because
-- volunteers come and go), a route's house membership is stable. Drawing a
-- route on the map (via the box-select tool) is a one-time setup act;
-- assigning a volunteer to that route happens fresh each campaign.
--
-- Houses no longer require a zone at creation time -- zones remain as an
-- optional geographic label carried over from the original paper map, but
-- routes are now what delivery assignment actually uses.

alter table houses alter column zone_id drop not null;

create table routes (
  id serial primary key,
  number int not null unique,
  name text,
  created_at timestamptz not null default now()
);

create table route_houses (
  route_id int not null references routes (id) on delete cascade,
  house_id int not null references houses (id) on delete cascade,
  primary key (route_id, house_id)
);
create index route_houses_house_id_idx on route_houses (house_id);

alter table routes enable row level security;
alter table route_houses enable row level security;

create policy routes_select_all on routes
  for select to anon, authenticated using (true);
create policy routes_write_admin on routes
  for all to authenticated using (is_admin()) with check (is_admin());

create policy route_houses_select_all on route_houses
  for select to anon, authenticated using (true);
create policy route_houses_write_admin on route_houses
  for all to authenticated using (is_admin()) with check (is_admin());

-- Assignments now target a route (durable) instead of a zone/house
-- (which had no continuity across campaigns). This is a pre-launch project
-- with only test assignment data, so existing rows are cleared rather than
-- migrated -- there's no meaningful zone/house -> route mapping to infer.
delete from assignments;
alter table assignments drop constraint assignments_zone_or_house;
alter table assignments drop column zone_id;
alter table assignments drop column house_id;
alter table assignments add column route_id int references routes (id) on delete cascade;
alter table assignments alter column route_id set not null;
alter table assignments add constraint assignments_campaign_route_unique unique (campaign_id, route_id);

-- A volunteer can edit a house's delivery status if that house is in a
-- route assigned to them for this campaign.
create or replace function can_edit_delivery(p_campaign_id uuid, p_house_id int)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from assignments a
    join route_houses rh on rh.route_id = a.route_id
    where a.campaign_id = p_campaign_id
      and a.volunteer_id = auth.uid()
      and rh.house_id = p_house_id
  );
$$;

alter publication supabase_realtime add table routes;
alter publication supabase_realtime add table route_houses;
