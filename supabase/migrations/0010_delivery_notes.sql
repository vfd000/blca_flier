-- Free-text notes on a house's delivery for a given campaign (e.g. "big
-- dog", "leave at side door", "suspected empty"). Lives on delivery_status
-- rather than houses because it's specific to this campaign's run, not a
-- durable fact about the house -- same reasoning as status itself. Reuses
-- delivery_status's existing RLS (admin or the assigned volunteer, via
-- can_edit_delivery), so no new policies are needed.

alter table delivery_status add column notes text;
