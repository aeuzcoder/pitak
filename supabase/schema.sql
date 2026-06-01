-- Pitak: Supabase sxemasi (SQL Editor → Run)
-- Auth: Email/parol (Dashboard → Authentication → Providers)

-- Profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade unique,
  phone text default '',
  avatar_path text default '',
  created_at timestamptz not null default now()
);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  from_region text not null,
  from_district text default '',
  to_region text not null,
  to_district text not null default '',
  tariff text not null,
  seats integer not null default 1,
  price integer not null,
  gender_pref text not null default 'any',
  comment text default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  drivers_notified boolean not null default false,
  driver_chat_id text,
  driver_name text,
  driver_phone text,
  customer_name text,
  customer_phone text,
  departure_time timestamptz
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_notified_idx on public.orders (status, drivers_notified);

-- Saved places
create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  region_id text not null,
  district_id text not null,
  created_at timestamptz not null default now()
);

-- Quick locations (home / work)
create table if not exists public.quick_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('home', 'work')),
  lat double precision not null,
  lng double precision not null,
  address text not null,
  unique (user_id, type)
);

-- Promocodes
create table if not exists public.promocodes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent integer not null,
  is_active boolean not null default true,
  expires_at timestamptz not null
);

-- User promocodes
create table if not exists public.user_promocodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  promocode_id uuid not null references public.promocodes (id) on delete cascade,
  used_at timestamptz not null default now()
);

-- Drivers (Telegram bot — service role)
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id text not null unique,
  name text not null,
  phone text not null,
  remote_region text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists drivers_remote_region_idx on public.drivers (remote_region, active);

-- RLS
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.saved_places enable row level security;
alter table public.quick_locations enable row level security;
alter table public.promocodes enable row level security;
alter table public.user_promocodes enable row level security;
alter table public.drivers enable row level security;

-- Profiles
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);

-- Orders
create policy "orders_select_own" on public.orders for select using (auth.uid() = user_id);
create policy "orders_insert_own" on public.orders for insert with check (auth.uid() = user_id);

-- Saved places
create policy "saved_places_all_own" on public.saved_places for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Quick locations
create policy "quick_locations_all_own" on public.quick_locations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Promocodes (read active)
create policy "promocodes_select_active" on public.promocodes for select using (is_active = true);

-- User promocodes
create policy "user_promocodes_insert_own" on public.user_promocodes for insert with check (auth.uid() = user_id);
create policy "user_promocodes_select_own" on public.user_promocodes for select using (auth.uid() = user_id);

-- Realtime (buyurtmalar tarixi)
alter publication supabase_realtime add table public.orders;

-- Storage: avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

create policy "avatars_upload_own"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_update_own"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_delete_own"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_public_read"
on storage.objects for select
using (bucket_id = 'avatars');
