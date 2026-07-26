-- Append-only audit trail: who claimed/released a zone or house and when,
-- and every delivery status/notes change with old -> new values and when.
-- Distinct from `assignments` (current claims only -- releasing one is a
-- hard delete, no history) and `delivery_status` (current status only --
-- last write wins, earlier visits are overwritten). This table is the
-- history those two don't keep.
--
-- actor_id is auth.uid() captured server-side in the trigger, not a
-- client-supplied column -- can't be spoofed the way `assignments.assigned_by`
-- or `delivery_status.updated_by` theoretically could be (the app always
-- sets those honestly today, but nothing enforces it).
--
-- Foreign keys use ON DELETE SET NULL, not CASCADE: deleting a house/zone/
-- campaign should not erase the history of what happened to it before
-- deletion -- the whole point of an audit log is that it outlives the rows
-- it describes.

create table activity_log (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid references profiles (id) on delete set null,
  action text not null check (action in (
    'assignment_claimed', 'assignment_released', 'status_changed', 'notes_changed'
  )),
  campaign_id uuid references campaigns (id) on delete set null,
  zone_id int references zones (id) on delete set null,
  house_id int references houses (id) on delete set null,
  details jsonb not null default '{}'::jsonb
);
create index activity_log_campaign_id_idx on activity_log (campaign_id);
create index activity_log_occurred_at_idx on activity_log (occurred_at desc);
create index activity_log_house_id_idx on activity_log (house_id);

alter table activity_log enable row level security;

-- Admins only for now -- this is an oversight/accountability tool, not
-- something volunteers currently have a UI for. Nothing INSERTs through
-- PostgREST at all; the trigger functions below are SECURITY DEFINER and
-- write directly, bypassing RLS entirely (there's deliberately no insert
-- policy for anon/authenticated).
create policy activity_log_select_admin on activity_log
  for select to authenticated using (is_admin());

create function log_assignment_activity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into activity_log (actor_id, action, campaign_id, zone_id, house_id, details)
    values (
      auth.uid(), 'assignment_claimed', new.campaign_id, new.zone_id, new.house_id,
      jsonb_build_object('volunteer_id', new.volunteer_id)
    );
  elsif TG_OP = 'DELETE' then
    insert into activity_log (actor_id, action, campaign_id, zone_id, house_id, details)
    values (
      auth.uid(), 'assignment_released', old.campaign_id, old.zone_id, old.house_id,
      jsonb_build_object('volunteer_id', old.volunteer_id)
    );
  end if;
  return null;
end;
$$;

create trigger assignments_activity_log
  after insert or delete on assignments
  for each row execute procedure log_assignment_activity();

-- Also fixes a pre-existing bug: delivery_status.updated_at only had a
-- column default (applies on insert only), and no app code ever bumped it
-- on later updates -- so after a house's first status change, updated_at
-- stayed frozen at that original time no matter how many times status
-- changed afterward. This keeps it honest going forward.
create function bump_delivery_status_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger delivery_status_bump_updated_at
  before update on delivery_status
  for each row
  when (new.status is distinct from old.status or new.notes is distinct from old.notes)
  execute procedure bump_delivery_status_updated_at();

create function log_delivery_status_activity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    if new.status is distinct from 'not_started' then
      insert into activity_log (actor_id, action, campaign_id, house_id, details)
      values (auth.uid(), 'status_changed', new.campaign_id, new.house_id,
        jsonb_build_object('old_status', null, 'new_status', new.status));
    end if;
    if new.notes is not null then
      insert into activity_log (actor_id, action, campaign_id, house_id, details)
      values (auth.uid(), 'notes_changed', new.campaign_id, new.house_id,
        jsonb_build_object('old_notes', null, 'new_notes', new.notes));
    end if;
  elsif TG_OP = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into activity_log (actor_id, action, campaign_id, house_id, details)
      values (auth.uid(), 'status_changed', new.campaign_id, new.house_id,
        jsonb_build_object('old_status', old.status, 'new_status', new.status));
    end if;
    if new.notes is distinct from old.notes then
      insert into activity_log (actor_id, action, campaign_id, house_id, details)
      values (auth.uid(), 'notes_changed', new.campaign_id, new.house_id,
        jsonb_build_object('old_notes', old.notes, 'new_notes', new.notes));
    end if;
  end if;
  return null;
end;
$$;

create trigger delivery_status_activity_log
  after insert or update on delivery_status
  for each row execute procedure log_delivery_status_activity();
