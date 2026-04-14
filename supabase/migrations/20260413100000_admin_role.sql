-- Admin role support.
--   * user_profiles.is_admin is set by the service role only (RLS prevents self-promotion).
--   * A helper function public.is_admin(uid) centralizes the check for RLS policies.
--   * Admin reads (user_profiles, user_cars, user_car_photos, car_data_reports) let the
--     dashboard enumerate users and moderate content without needing service-role in the client.
--     All DESTRUCTIVE admin ops still go through service-role Edge Functions.

alter table public.user_profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.user_profiles where user_id = uid), false);
$$;

-- Let authenticated callers check their own admin status only (still via the helper).
grant execute on function public.is_admin(uuid) to authenticated;

-- Admin reads across user-owned tables.
create policy "admin read all profiles" on public.user_profiles
  for select to authenticated using (public.is_admin(auth.uid()));

create policy "admin read all garage" on public.user_cars
  for select to authenticated using (public.is_admin(auth.uid()));

create policy "admin read all photos" on public.user_car_photos
  for select to authenticated using (public.is_admin(auth.uid()));

create policy "admin read all reports" on public.car_data_reports
  for select to authenticated using (public.is_admin(auth.uid()));

create policy "admin read all gamification" on public.user_gamification
  for select to authenticated using (public.is_admin(auth.uid()));
