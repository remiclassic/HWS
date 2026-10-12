-- Marketing demo state for LOCAL Supabase only. Never run against production.
-- Creates a showcase collector plus five leaderboard rivals so screenshots and the promo
-- video show a lived-in app. All names and stats are fictional.
-- Apply:   docker exec -i supabase_db_HWS psql -U postgres < marketing/tools/demo-state.sql
-- Remove:  docker exec supabase_db_HWS psql -U postgres -c "delete from auth.users where email like '%@marketing.hotwheels.local'"
-- Showcase login (local only): demo@marketing.hotwheels.local / Demo-0710b5ac9792-Aa1

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
select '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated', u.email,
  crypt('Demo-0710b5ac9792-Aa1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
from (values
  ('33333333-0000-0000-0000-000000000001', 'demo@marketing.hotwheels.local'),
  ('33333333-0000-0000-0000-000000000002', 'rival1@marketing.hotwheels.local'),
  ('33333333-0000-0000-0000-000000000003', 'rival2@marketing.hotwheels.local'),
  ('33333333-0000-0000-0000-000000000004', 'rival3@marketing.hotwheels.local'),
  ('33333333-0000-0000-0000-000000000005', 'rival4@marketing.hotwheels.local'),
  ('33333333-0000-0000-0000-000000000006', 'rival5@marketing.hotwheels.local')
) as u(id, email)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, jsonb_build_object('sub', id::text, 'email', email), 'email', email, now(), now(), now()
from auth.users where email like '%@marketing.hotwheels.local'
on conflict do nothing;

update public.user_profiles p set display_name = v.name, leaderboard_opt_in = true, leaderboard_slug = v.slug
from (values
  ('33333333-0000-0000-0000-000000000001', 'PegHunter Max', 'peghuntermx'),
  ('33333333-0000-0000-0000-000000000002', 'RedlineRita',   'redlinerita'),
  ('33333333-0000-0000-0000-000000000003', 'DiecastDan',    'diecastdan'),
  ('33333333-0000-0000-0000-000000000004', 'OrangeTrackJo', 'orangetrkjo'),
  ('33333333-0000-0000-0000-000000000005', 'CaseFreshKai',  'casefreshk'),
  ('33333333-0000-0000-0000-000000000006', 'BlisterBea',    'blisterbea')
) as v(id, name, slug)
where p.user_id = v.id::uuid;

-- Showcase garage: 10 owned (incl. TH + STH), 1 duplicate, 4 wanted.
insert into public.user_cars (user_id, car_id, status, condition, quantity, notes, date_added)
select '33333333-0000-0000-0000-000000000001', ('c0000000-0000-0000-0000-00000000000' || v.c)::uuid,
  v.s::user_car_status, v.k::user_car_condition, v.q, v.n, now() - (v.d || ' hours')::interval
from (values
  ('6', 'Owned', 'Carded', 1, 'Found at the back of a fresh Case F dump bin.', 3),
  ('2', 'Owned', 'Carded', 2, 'Red rims gave it away.', 20),
  ('7', 'Owned', 'Carded', 1, null, 50),
  ('c', 'Owned', 'Loose',  1, null, 75),
  ('5', 'Owned', 'Carded', 1, null, 120),
  ('e', 'Owned', 'Carded', 1, null, 170),
  ('1', 'Owned', 'Loose',  1, null, 240),
  ('8', 'Owned', 'Carded', 1, null, 300),
  ('9', 'Owned', 'Custom', 1, 'Wheel swap + matte clear.', 420),
  ('3', 'Owned', 'Carded', 1, null, 500),
  ('4', 'Duplicate', 'Carded', 3, 'Trade bait.', 600),
  ('a', 'Want', 'Carded', 1, null, 30),
  ('b', 'Want', 'Carded', 1, null, 90),
  ('f', 'Want', 'Carded', 1, null, 200),
  ('d', 'Want', 'Carded', 1, null, 260)
) as v(c, s, k, q, n, d)
on conflict do nothing;

-- Rivals: a few owned cars each so achievements vary.
insert into public.user_cars (user_id, car_id, status, condition, quantity)
select r.id::uuid, c.id, 'Owned', 'Carded', 1
from (values
  ('33333333-0000-0000-0000-000000000002', 15),
  ('33333333-0000-0000-0000-000000000003', 12),
  ('33333333-0000-0000-0000-000000000004', 8),
  ('33333333-0000-0000-0000-000000000005', 5),
  ('33333333-0000-0000-0000-000000000006', 3)
) as r(id, n)
join lateral (select id from public.canonical_cars order by id limit r.n) c on true
on conflict do nothing;

-- Scans + streaks (the sync trigger derives total_xp and achievements from these).
update public.user_gamification g set barcode_scan_count = v.scans, current_streak = v.streak,
  longest_streak = v.best, last_active_date = current_date
from (values
  ('33333333-0000-0000-0000-000000000001', 37, 12, 21),
  ('33333333-0000-0000-0000-000000000002', 112, 30, 44),
  ('33333333-0000-0000-0000-000000000003', 58, 9, 19),
  ('33333333-0000-0000-0000-000000000004', 24, 4, 11),
  ('33333333-0000-0000-0000-000000000005', 11, 2, 6),
  ('33333333-0000-0000-0000-000000000006', 4, 1, 3)
) as v(id, scans, streak, best)
where g.user_id = v.id::uuid;
