-- Collapse "routes" back into zones. 0005 added a parallel many-to-many
-- grouping (routes/route_houses) alongside the pre-existing zones, which
-- turned out to be one grouping concept too many. Houses belong directly
-- to a zone (as originally designed); zones themselves are now fully
-- admin-editable/creatable via the map's box-select tool instead of being
-- fixed to the original 22 from the paper map. "Route" is just the
-- informal term for what a volunteer covers in a campaign -- a mix of
-- whole zones and/or individual houses -- which is exactly what
-- `assignments` captured before 0005.

delete from assignments;
alter table assignments drop constraint assignments_campaign_route_unique;
alter table assignments drop column route_id;
alter table assignments add column zone_id int references zones (id) on delete cascade;
alter table assignments add column house_id int references houses (id) on delete cascade;
alter table assignments add constraint assignments_zone_or_house check (zone_id is not null or house_id is not null);

drop table route_houses;
drop table routes;

create or replace function can_edit_delivery(p_campaign_id uuid, p_house_id int)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from assignments a
    join houses h on h.id = p_house_id
    where a.campaign_id = p_campaign_id
      and a.volunteer_id = auth.uid()
      and (a.house_id = p_house_id or a.zone_id = h.zone_id)
  );
$$;
