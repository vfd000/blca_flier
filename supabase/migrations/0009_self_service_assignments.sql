-- Let any signed-in volunteer claim (or release) a zone/house for
-- themselves, on top of admin's existing full control over assignments.
-- Postgres OR's multiple permissive policies together for the same
-- command, so this only adds capability -- it doesn't narrow what admins
-- can already do via assignments_write_admin.
--
-- No exclusivity is enforced here (a volunteer can claim something someone
-- else already has) -- the UI surfaces the existing assignee so it's an
-- informed, visible reassignment rather than a silent collision, but it's
-- deliberately not blocked at the database level.
create policy assignments_self_insert on assignments
  for insert to authenticated
  with check (volunteer_id = auth.uid());

create policy assignments_self_delete on assignments
  for delete to authenticated
  using (volunteer_id = auth.uid());
