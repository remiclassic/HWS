-- Pre-launch waitlist, written to by the public landing page (marketing/site) with the anon key.
-- RLS: anyone may insert a signup; nobody but admins can read them back. No update/delete
-- policies, so those stay service-role only.
create table waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email varchar(254) not null,
  platform varchar(16) not null default 'any',
  source varchar(64),
  created_at timestamp with time zone not null default now(),
  constraint waitlist_signups_email_format check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint waitlist_signups_platform_check check (platform in ('ios', 'android', 'any'))
);

-- Case-insensitive uniqueness; a repeat signup surfaces as 23505 and the page treats it as success.
create unique index waitlist_signups_email_lower_key on waitlist_signups (lower(email));

alter table waitlist_signups enable row level security;

create policy "join waitlist" on waitlist_signups for insert
  to anon, authenticated with check (true);
create policy "admin read waitlist" on waitlist_signups for select
  to authenticated using (public.is_admin(auth.uid()));

-- Clients choose email / platform / source only; id and created_at always come from defaults.
revoke all on waitlist_signups from anon, authenticated;
grant insert (email, platform, source) on waitlist_signups to anon, authenticated;
grant select on waitlist_signups to authenticated;
