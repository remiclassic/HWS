-- Local-only seed data. Only loaded on `supabase db reset`.
-- DO NOT rely on this in production; config.toml gates seed.enabled.

-- Test user: dev@hotwheels.local / dev-password-AA1
-- Password hash below is bcrypt for "dev-password-AA1" (cost 10).
-- If you need to change the password, regenerate with:
--   node -e "console.log(require('bcryptjs').hashSync('new-pass', 10))"
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'dev@hotwheels.local',
  crypt('dev-password-AA1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(), now(), '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
values (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'dev@hotwheels.local'),
  'email',
  'dev@hotwheels.local',
  now(), now(), now()
)
on conflict do nothing;

-- Display name for the test user
update public.user_profiles
set display_name = 'Dev Collector',
    leaderboard_opt_in = true,
    leaderboard_slug = 'dev-slug'
where user_id = '11111111-1111-1111-1111-111111111111';

-- Admin user: admin@hotwheels.local / admin-password-AA1
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '22222222-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'admin@hotwheels.local',
  crypt('admin-password-AA1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(), now(), '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
values (
  gen_random_uuid(),
  '22222222-1111-1111-1111-111111111111',
  jsonb_build_object('sub', '22222222-1111-1111-1111-111111111111', 'email', 'admin@hotwheels.local'),
  'email',
  'admin@hotwheels.local',
  now(), now(), now()
)
on conflict do nothing;

update public.user_profiles
set display_name = 'Dev Admin', is_admin = true
where user_id = '22222222-1111-1111-1111-111111111111';

-- Starter catalog — common Hot Wheels castings so a fresh install is immediately usable.
-- Admins can add/edit more from the admin web app (Catalog page).
-- User garage rows are NOT seeded; every user starts with an empty garage.
insert into public.canonical_cars (id, casting_name, year, series, line_type, treasure_hunt_type) values
  ('c0000000-0000-0000-0000-000000000001', 'Twin Mill',         2024, 'HW Art Cars',       'Mainline', 'None'),
  ('c0000000-0000-0000-0000-000000000002', 'Bone Shaker',       2024, 'HW Screen Time',    'Mainline', 'TH'),
  ('c0000000-0000-0000-0000-000000000003', 'Deora II',          2023, 'HW Flames',         'Premium',  'None'),
  ('c0000000-0000-0000-0000-000000000004', 'Rodger Dodger',     2024, 'HW Muscle Mania',   'Mainline', 'None'),
  ('c0000000-0000-0000-0000-000000000005', '''55 Chevy Bel Air Gasser', 2024, 'HW Flames', 'Mainline', 'None'),
  ('c0000000-0000-0000-0000-000000000006', '''70 Dodge Charger R/T', 2024, 'HW Muscle Mania', 'Mainline', 'STH'),
  ('c0000000-0000-0000-0000-000000000007', 'Nissan Skyline GT-R (R34)', 2024, 'Fast & Furious', 'Premium', 'None'),
  ('c0000000-0000-0000-0000-000000000008', 'Toyota AE86',       2024, 'HW J-Imports',      'Mainline', 'None'),
  ('c0000000-0000-0000-0000-000000000009', 'Volkswagen T1 Panel Bus', 2023, 'HW Art Cars', 'Mainline', 'None'),
  ('c0000000-0000-0000-0000-00000000000a', 'Porsche 911 GT3 RS', 2024, 'HW Exotics',       'Premium',  'None'),
  ('c0000000-0000-0000-0000-00000000000b', 'Lamborghini Countach LP 5000 QV', 2023, 'HW Exotics', 'Premium', 'None'),
  ('c0000000-0000-0000-0000-00000000000c', 'Datsun 620',        2024, 'HW Hot Trucks',     'Mainline', 'TH'),
  ('c0000000-0000-0000-0000-00000000000d', 'Custom ''77 Dodge Van', 2023, 'HW Art Cars',    'Mainline', 'None'),
  ('c0000000-0000-0000-0000-00000000000e', 'Mazda RX-7 (FD)',   2024, 'HW J-Imports',      'Premium',  'None'),
  ('c0000000-0000-0000-0000-00000000000f', 'Ford Mustang Shelby GT500', 2024, 'HW Muscle Mania', 'Mainline', 'None')
on conflict do nothing;

-- A couple of barcode mappings so the scanner has targets when testing.
insert into public.car_barcodes (barcode, car_id) values
  ('0194735100001', 'c0000000-0000-0000-0000-000000000001'),
  ('0194735100002', 'c0000000-0000-0000-0000-000000000002'),
  ('0194735100003', 'c0000000-0000-0000-0000-000000000003')
on conflict do nothing;
