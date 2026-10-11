-- Achievements + XP sync.
--
-- Before this migration nothing wrote to user_achievements, and total_xp only moved when
-- the record-scan Edge Function added its per-scan XP. This restores the behaviour of the
-- old API's syncAchievementsAndXp(): a user's achievements always mirror their current
-- garage / photo / scan stats (they unlock AND roll back), and total_xp is derived.
--
-- Design:
--   * achievement_definitions mirrors the rule + XP of ACHIEVEMENT_CATALOG in
--     packages/shared/src/gamification.ts. Titles and descriptions stay in the app.
--     supabase/tests/achievements.test.ts fails if the two drift apart.
--   * sync_user_achievements(uid) recomputes one user. It is SECURITY DEFINER and not
--     callable by clients; users still have no write policy on either table.
--   * Triggers call it whenever an input changes: garage rows, garage photos, scan count.
--
-- XP rule: total_xp = sum(xp of unlocked achievements) + 5 * barcode_scan_count.
-- The 5 matches XP_PER_SCAN in supabase/functions/record-scan/index.ts — change both together.

create table achievement_definitions (
  id varchar(64) primary key,
  rule_kind varchar(32) not null check (
    rule_kind in (
      'total_garage_min', 'owned_unique_min', 'want_min', 'duplicate_min',
      'owned_th_min', 'owned_sth_min', 'photos_min', 'owned_mainline_min',
      'barcode_scans_min'
    )
  ),
  threshold integer not null check (threshold >= 0),
  xp integer not null check (xp >= 0)
);

alter table achievement_definitions enable row level security;
create policy "achievement definitions read" on achievement_definitions
  for select to authenticated using (true);

insert into achievement_definitions (id, rule_kind, threshold, xp) values
  ('garage_first', 'total_garage_min',     1,  15),
  ('owned_10',     'owned_unique_min',    10,  40),
  ('owned_50',     'owned_unique_min',    50, 120),
  ('owned_100',    'owned_unique_min',   100, 300),
  ('want_5',       'want_min',             5,  25),
  ('want_25',      'want_min',            25,  80),
  ('dupe_tracker', 'duplicate_min',        5,  30),
  ('th_first',     'owned_th_min',         1,  75),
  ('sth_first',    'owned_sth_min',        1, 200),
  ('photo_first',  'photos_min',           1,  20),
  ('photo_10',     'photos_min',          10,  60),
  ('mainline_25',  'owned_mainline_min',  25,  50),
  ('scan_1',       'barcode_scans_min',    1,  10),
  ('scan_10',      'barcode_scans_min',   10,  35),
  ('scan_50',      'barcode_scans_min',   50, 100),
  ('scan_100',     'barcode_scans_min',  100, 200);

create or replace function public.sync_user_achievements(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_scans integer;
begin
  -- Lock the user's gamification row so concurrent garage writes sync one at a time.
  -- No row means the account is gone (we are inside its ON DELETE CASCADE) or was never
  -- provisioned; writing achievements for it would violate the FK to auth.users.
  select barcode_scan_count into v_scans
    from user_gamification
    where user_id = p_user_id
    for update;
  if not found then
    return;
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    return;
  end if;

  with garage as (
    select
      count(*)::int as total_rows,
      (count(*) filter (where uc.status = 'Owned'))::int as owned,
      (count(*) filter (where uc.status = 'Want'))::int as want,
      (count(*) filter (where uc.status = 'Duplicate'))::int as dupes,
      (count(*) filter (where uc.status = 'Owned' and c.treasure_hunt_type = 'TH'))::int as owned_th,
      (count(*) filter (where uc.status = 'Owned' and c.treasure_hunt_type = 'STH'))::int as owned_sth,
      (count(*) filter (where uc.status = 'Owned' and c.line_type = 'Mainline'))::int as owned_mainline
    from user_cars uc
    join canonical_cars c on c.id = uc.car_id
    where uc.user_id = p_user_id
  ),
  photos as (
    select count(*)::int as n
    from user_car_photos p
    join user_cars uc on uc.id = p.user_car_id
    where uc.user_id = p_user_id
  ),
  stats (rule_kind, n) as (
    select 'total_garage_min', total_rows from garage
    union all select 'owned_unique_min', owned from garage
    union all select 'want_min', want from garage
    union all select 'duplicate_min', dupes from garage
    union all select 'owned_th_min', owned_th from garage
    union all select 'owned_sth_min', owned_sth from garage
    union all select 'owned_mainline_min', owned_mainline from garage
    union all select 'photos_min', n from photos
    union all select 'barcode_scans_min', v_scans
  ),
  eligible as (
    select d.id, d.xp
    from achievement_definitions d
    join stats s on s.rule_kind = d.rule_kind
    where s.n >= d.threshold
  ),
  removed as (
    delete from user_achievements ua
    where ua.user_id = p_user_id
      and not exists (select 1 from eligible e where e.id = ua.achievement_id)
  ),
  added as (
    insert into user_achievements (user_id, achievement_id)
    select p_user_id, e.id from eligible e
    on conflict (user_id, achievement_id) do nothing
  )
  update user_gamification g
    set total_xp = coalesce((select sum(xp) from eligible), 0)::int + 5 * v_scans
    where g.user_id = p_user_id;
end;
$$;

-- Server-side only: triggers below are the callers.
revoke all on function public.sync_user_achievements(uuid) from public, anon, authenticated;

create or replace function public.tg_user_cars_sync_achievements()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_user_achievements(old.user_id);
  else
    perform public.sync_user_achievements(new.user_id);
  end if;
  return null;
end;
$$;

-- quantity / condition / notes edits don't affect any rule, so they don't fire this.
create trigger user_cars_sync_achievements
  after insert or delete or update of status, car_id, user_id on user_cars
  for each row execute function public.tg_user_cars_sync_achievements();

create or replace function public.tg_user_car_photos_sync_achievements()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
begin
  -- When the garage row itself is being deleted the photo cascades with it and this
  -- lookup finds nothing; the user_cars trigger covers that case.
  select uc.user_id into v_owner
    from user_cars uc
    where uc.id = case when tg_op = 'DELETE' then old.user_car_id else new.user_car_id end;
  if v_owner is not null then
    perform public.sync_user_achievements(v_owner);
  end if;
  return null;
end;
$$;

create trigger user_car_photos_sync_achievements
  after insert or delete on user_car_photos
  for each row execute function public.tg_user_car_photos_sync_achievements();

create or replace function public.tg_user_gamification_sync_achievements()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.sync_user_achievements(new.user_id);
  return null;
end;
$$;

-- Fires on scans only. The sync's own write touches total_xp, not barcode_scan_count,
-- so it cannot re-trigger itself.
create trigger user_gamification_sync_achievements
  after update of barcode_scan_count on user_gamification
  for each row
  when (old.barcode_scan_count is distinct from new.barcode_scan_count)
  execute function public.tg_user_gamification_sync_achievements();

-- Backfill: bring every existing account in line with the rules above.
select public.sync_user_achievements(user_id) from user_gamification;
