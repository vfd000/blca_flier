-- Optional admin-chosen color override per zone. When null, the app falls
-- back to a deterministic hash-based color (see app/src/lib/colors.ts).
alter table zones add column color text;
