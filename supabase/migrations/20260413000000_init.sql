-- Initial schema for Hot Wheels Spotter on Supabase.
-- Conventions:
--   * auth.users is owned by Supabase; our profile table user_profiles has a 1:1 FK.
--   * Every public table has RLS enabled with default-deny; explicit policies grant access.
--   * Column and table names mirror the existing Drizzle schema so packages/shared stays valid.

-- Enums
create type source_type as enum ('official', 'community');
create type line_type as enum ('Mainline', 'Premium', 'RLC', 'TeamTransport', 'Entertainment', 'Other');
create type treasure_hunt_type as enum ('None', 'TH', 'STH');
create type user_car_status as enum ('Owned', 'Want', 'Duplicate');
create type user_car_condition as enum ('Carded', 'Loose', 'Custom');
create type car_data_report_status as enum ('open', 'triaged', 'closed');

-- Profile row per auth.users
create table user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  notify_want_list_updates boolean not null default true,
  display_name varchar(32),
  leaderboard_opt_in boolean not null default false,
  leaderboard_slug varchar(12) unique
);

create table user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform varchar(16) not null,
  updated_at timestamptz not null default now()
);

create table source_registry (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  type source_type not null,
  base_url text,
  trust_weight real not null default 0.5,
  active boolean not null default true,
  metadata text
);

create table canonical_cars (
  id uuid primary key default gen_random_uuid(),
  casting_name varchar(512) not null,
  year integer not null,
  series varchar(255),
  line_type line_type not null default 'Mainline',
  treasure_hunt_type treasure_hunt_type not null default 'None',
  description text,
  model_number varchar(64),
  case_code varchar(64),
  sku varchar(64),
  last_verified_at timestamptz
);

create table car_variations (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references canonical_cars(id) on delete cascade,
  wheels text,
  deco text,
  region varchar(128),
  notes text
);

create table car_images (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references canonical_cars(id) on delete cascade,
  official_image_url text not null,
  source_id uuid references source_registry(id),
  attribution_note text
);

create table car_source_attributions (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references canonical_cars(id) on delete cascade,
  field_path varchar(128) not null,
  value text,
  source_id uuid not null references source_registry(id),
  confidence_score real not null default 0.8,
  is_rumor boolean not null default false,
  cited_url text,
  created_at timestamptz not null default now()
);

create table car_community_notes (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references canonical_cars(id) on delete cascade,
  body text not null,
  source_id uuid not null references source_registry(id),
  created_at timestamptz not null default now()
);

-- Barcode → canonical car resolution for the scanner.
create table car_barcodes (
  barcode varchar(64) primary key,
  car_id uuid not null references canonical_cars(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table user_cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  car_id uuid not null references canonical_cars(id) on delete cascade,
  status user_car_status not null default 'Owned',
  condition user_car_condition not null default 'Carded',
  quantity integer not null default 1,
  notes text,
  date_added timestamptz not null default now(),
  unique (user_id, car_id)
);

create table user_car_photos (
  id uuid primary key,
  user_car_id uuid not null references user_cars(id) on delete cascade,
  storage_path text not null,
  mime_type varchar(128) not null,
  byte_size integer not null,
  created_at timestamptz not null default now()
);

create table car_data_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  car_id uuid not null references canonical_cars(id) on delete cascade,
  message text not null,
  field_path varchar(128),
  status car_data_report_status not null default 'open',
  created_at timestamptz not null default now()
);

create table notification_send_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind varchar(32) not null,
  car_id uuid references canonical_cars(id) on delete set null,
  created_at timestamptz not null default now()
);
create index notification_send_log_user_created_idx
  on notification_send_log(user_id, created_at);

create table user_gamification (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0,
  last_active_date date,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  barcode_scan_count integer not null default 0
);

create table user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id varchar(64) not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
create index user_achievements_user_id_idx on user_achievements(user_id);

-- Auto-create profile + gamification rows on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (user_id) values (new.id);
  insert into public.user_gamification (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: default deny on everything
alter table user_profiles enable row level security;
alter table user_push_tokens enable row level security;
alter table source_registry enable row level security;
alter table canonical_cars enable row level security;
alter table car_variations enable row level security;
alter table car_images enable row level security;
alter table car_source_attributions enable row level security;
alter table car_community_notes enable row level security;
alter table car_barcodes enable row level security;
alter table user_cars enable row level security;
alter table user_car_photos enable row level security;
alter table car_data_reports enable row level security;
alter table notification_send_log enable row level security;
alter table user_gamification enable row level security;
alter table user_achievements enable row level security;

-- Catalog tables: readable by any authenticated user; writes only via service role.
create policy "catalog read" on canonical_cars for select to authenticated using (true);
create policy "catalog read" on car_variations for select to authenticated using (true);
create policy "catalog read" on car_images for select to authenticated using (true);
create policy "catalog read" on car_source_attributions for select to authenticated using (true);
create policy "catalog read" on car_community_notes for select to authenticated using (true);
create policy "catalog read" on car_barcodes for select to authenticated using (true);
create policy "sources read" on source_registry for select to authenticated using (true);

-- Leaderboard: opt-in profiles visible to authenticated users; own profile always visible to self.
create policy "own profile read" on user_profiles for select
  to authenticated using (user_id = auth.uid());
create policy "opted-in profile read" on user_profiles for select
  to authenticated using (leaderboard_opt_in = true);
create policy "own profile update" on user_profiles for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Push tokens: owner only.
create policy "own push tokens" on user_push_tokens for all
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Garage: owner only.
create policy "own garage" on user_cars for all
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Garage photos: owner only, joined through user_cars.
create policy "own garage photos" on user_car_photos for all
  to authenticated using (
    exists (select 1 from user_cars uc where uc.id = user_car_id and uc.user_id = auth.uid())
  ) with check (
    exists (select 1 from user_cars uc where uc.id = user_car_id and uc.user_id = auth.uid())
  );

-- Car data reports: user sees and writes their own; triage happens via service role.
create policy "own reports" on car_data_reports for select
  to authenticated using (user_id = auth.uid());
create policy "submit reports" on car_data_reports for insert
  to authenticated with check (user_id = auth.uid());

-- Notification log: owner read only; writes from service role.
create policy "own notif log" on notification_send_log for select
  to authenticated using (user_id = auth.uid());

-- Gamification: owner read; leaderboard aggregate is queried by a security-definer view (added later).
create policy "own gamification" on user_gamification for select
  to authenticated using (user_id = auth.uid());
create policy "opted-in gamification" on user_gamification for select
  to authenticated using (
    exists (
      select 1 from user_profiles p
      where p.user_id = user_gamification.user_id and p.leaderboard_opt_in = true
    )
  );

create policy "own achievements read" on user_achievements for select
  to authenticated using (user_id = auth.uid());
create policy "opted-in achievements read" on user_achievements for select
  to authenticated using (
    exists (
      select 1 from user_profiles p
      where p.user_id = user_achievements.user_id and p.leaderboard_opt_in = true
    )
  );

-- Storage bucket policies for user-car-photos: path convention <userId>/<photoId>.<ext>
create policy "own photos read" on storage.objects for select
  to authenticated using (
    bucket_id = 'user-car-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own photos write" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'user-car-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own photos update" on storage.objects for update
  to authenticated using (
    bucket_id = 'user-car-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own photos delete" on storage.objects for delete
  to authenticated using (
    bucket_id = 'user-car-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
