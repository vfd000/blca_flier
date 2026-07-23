-- Auto-create a profiles row whenever a new auth.users row appears (i.e. on
-- first sign-in). Role resolution: an accepted invitation wins; otherwise
-- default to 'admin' (see PLAN.md section 1 and 4 -- "everyone's an admin to
-- start"; flipping the default to 'volunteer' is the whole migration needed
-- to start requiring invites).

create function handle_new_user()
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
    coalesce(resolved_role, 'admin')
  );

  update invitations
  set accepted_at = now()
  where email = new.email and accepted_at is null;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
