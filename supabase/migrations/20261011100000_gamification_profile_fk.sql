-- Leaderboard embeds.
--
-- user_gamification and user_profiles are both 1:1 with auth.users but had no foreign key
-- to each other, so PostgREST could not resolve the embeds the mobile app uses
-- (user_gamification -> user_profiles in fetchLeaderboard, and the reverse in
-- fetchPublicCollectorProfile) and answered 400 PGRST200.
--
-- A direct PK-to-PK foreign key makes the relationship one-to-one in both directions.
-- handle_new_user() already inserts the profile row before the gamification row.
-- No RLS change: both tables keep their existing own-row + opted-in read policies.

alter table public.user_gamification
  add constraint user_gamification_user_id_user_profiles_user_id_fk
  foreign key (user_id) references public.user_profiles(user_id) on delete cascade;

notify pgrst, 'reload schema';
