-- Treasure Hunt field guide: per-casting summary + checklist of markers to verify.
-- Columns live on canonical_cars, so the existing "catalog read" RLS policy covers them.
alter table canonical_cars
  add column th_summary text,
  add column th_markers text[] not null default '{}';
