-- Row Level Security. See PLAN.md section 4.
--
-- Anonymous:            SELECT only on zones/houses/campaigns/delivery_status.
-- Authenticated/volunteer: + INSERT/UPDATE delivery_status for houses assigned
--                          to them (directly, or via a zone assignment) in
--                          active campaigns; can see their own assignments.
-- Authenticated/admin:   full CRUD on everything.

alter table profiles enable row level security;
alter table zones enable row level security;
alter table houses enable row level security;
alter table campaigns enable row level security;
alter table assignments enable row level security;
alter table delivery_status enable row level security;
alter table invitations enable row level security;

-- security definer: reads profiles.role without recursing back through this
-- table's own RLS policies.
create function is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create function can_edit_delivery(p_campaign_id uuid, p_house_id int)
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

-- Block volunteers from granting themselves (or anyone) admin via a direct
-- profiles update -- only an existing admin may change `role`.
create function prevent_role_self_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'only admins can change role';
  end if;
  return new;
end;
$$;
create trigger profiles_role_guard
  before update on profiles
  for each row execute procedure prevent_role_self_escalation();

-- profiles
create policy profiles_select_authenticated on profiles
  for select to authenticated using (true);
create policy profiles_update_self_or_admin on profiles
  for update to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- zones
create policy zones_select_all on zones
  for select to anon, authenticated using (true);
create policy zones_write_admin on zones
  for all to authenticated using (is_admin()) with check (is_admin());

-- houses
create policy houses_select_all on houses
  for select to anon, authenticated using (true);
create policy houses_write_admin on houses
  for all to authenticated using (is_admin()) with check (is_admin());

-- campaigns
create policy campaigns_select_all on campaigns
  for select to anon, authenticated using (true);
create policy campaigns_write_admin on campaigns
  for all to authenticated using (is_admin()) with check (is_admin());

-- assignments
create policy assignments_select_own_or_admin on assignments
  for select to authenticated
  using (volunteer_id = auth.uid() or is_admin());
create policy assignments_write_admin on assignments
  for all to authenticated using (is_admin()) with check (is_admin());

-- delivery_status
create policy delivery_status_select_all on delivery_status
  for select to anon, authenticated using (true);
create policy delivery_status_insert_assigned_or_admin on delivery_status
  for insert to authenticated
  with check (is_admin() or can_edit_delivery(campaign_id, house_id));
create policy delivery_status_update_assigned_or_admin on delivery_status
  for update to authenticated
  using (is_admin() or can_edit_delivery(campaign_id, house_id))
  with check (is_admin() or can_edit_delivery(campaign_id, house_id));
create policy delivery_status_delete_admin on delivery_status
  for delete to authenticated using (is_admin());

-- invitations
create policy invitations_admin_only on invitations
  for all to authenticated using (is_admin()) with check (is_admin());
