-- New sign-ins without a matching invitation now default to 'volunteer'
-- instead of 'admin' -- the flip anticipated in PLAN.md section 1/4, now
-- that real admins are in place and the app is public. Existing profiles
-- are untouched; admins can still promote anyone via the Admin page.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  resolved_role text;
begin
  select role into resolved_role
  from invitations
  where email = new.email and accepted_at is null;

  insert into profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(resolved_role, 'volunteer')
  );

  update invitations
  set accepted_at = now()
  where email = new.email and accepted_at is null;

  return new;
end;
$$;
