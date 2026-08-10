-- ============================================================================
-- SUVADU Notebooks — initial schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- ============================================================================

-- ── collections ─────────────────────────────────────────────────────────────
create table if not exists public.collections (
  slug          text primary key,
  display_name  text not null,
  internal_name text not null default '',
  description   text not null default '',
  accent        text not null default '#E6E6FA',
  pattern       text not null default 'plain',
  sort_order    int  not null default 0,
  is_special    boolean not null default false   -- special collections don't show in the main grid
);

-- ── products ─────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id                      text primary key,
  slug                    text unique not null,
  name                    text not null,
  type                    text not null default 'basic',      -- basic | customized | set
  collection_slug         text not null references public.collections(slug) on delete restrict,
  price_a5                numeric not null,
  price_a4                numeric,
  price_custom            numeric,
  custom_price_on_request boolean not null default false,
  description             text not null default '',
  specs                   text[] not null default '{}',
  colour_name             text not null default 'Lavender',
  colour_hex              text not null default '#E6E6FA',
  pattern                 text not null default 'plain',
  image                   text,
  rating                  numeric not null default 5,
  reviews                 int not null default 0,
  bestseller              boolean not null default false,
  is_new                  boolean not null default false,
  is_custom               boolean not null default false,   -- true = admin-added (vs seeded catalogue)
  created_at              timestamptz not null default now()
);
create index if not exists products_collection_idx on public.products(collection_slug);

-- ── profiles (1:1 with auth.users) ───────────────────────────────────────────
create table if not exists public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  name      text,
  email     text,
  mobile    text,
  is_admin  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── orders ────────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   text unique not null,
  user_id        uuid references auth.users(id) on delete set null,
  status         text not null default 'pending',   -- pending|processing|shipped|delivered|cancelled
  subtotal       numeric not null default 0,
  discount       numeric not null default 0,
  shipping       numeric not null default 0,
  total          numeric not null default 0,
  coupon         text,
  payment_method text,
  address        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id);

-- ── order_items ─────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    text not null,
  product_name  text not null,
  product_slug  text not null,
  size          text not null,
  qty           int  not null default 1,
  unit_price    numeric not null,
  pages         int,
  customization jsonb
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ── Auto-create a profile row on signup ──────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, mobile)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'mobile'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Helper: is the current user an admin? ───────────────────────────────────
-- Defined AFTER profiles exists (its body references it). SECURITY DEFINER so
-- it reads profiles without tripping RLS recursion inside the policies below.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table public.collections  enable row level security;
alter table public.products     enable row level security;
alter table public.profiles     enable row level security;
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;

-- collections: anyone can read; only admins can write.
drop policy if exists collections_read   on public.collections;
drop policy if exists collections_write  on public.collections;
create policy collections_read  on public.collections for select using (true);
create policy collections_write on public.collections for all
  using (public.is_admin()) with check (public.is_admin());

-- products: anyone can read; only admins can write.
drop policy if exists products_read  on public.products;
drop policy if exists products_write on public.products;
create policy products_read  on public.products for select using (true);
create policy products_write on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- profiles: a user reads/updates their own row; admins can read all.
drop policy if exists profiles_self_read   on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_admin_read  on public.profiles;
create policy profiles_self_read   on public.profiles for select using (auth.uid() = id);
create policy profiles_self_update on public.profiles for update using (auth.uid() = id);
create policy profiles_admin_read  on public.profiles for select using (public.is_admin());

-- orders: a user reads/creates their own; admins read all.
drop policy if exists orders_owner_read   on public.orders;
drop policy if exists orders_owner_insert on public.orders;
drop policy if exists orders_admin_read   on public.orders;
create policy orders_owner_read   on public.orders for select using (auth.uid() = user_id);
create policy orders_owner_insert on public.orders for insert with check (auth.uid() = user_id);
create policy orders_admin_read   on public.orders for select using (public.is_admin());

-- order_items: readable/insertable when the parent order belongs to the user
-- (or the user is an admin).
drop policy if exists order_items_owner_read   on public.order_items;
drop policy if exists order_items_owner_insert on public.order_items;
create policy order_items_owner_read on public.order_items for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
);
create policy order_items_owner_insert on public.order_items for insert with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.user_id = auth.uid()
  )
);

-- ============================================================================
-- Storage: public bucket for admin-uploaded product images.
-- (You can also create this via Dashboard → Storage → New bucket → "product-images", public.)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_public_read on storage.objects;
drop policy if exists product_images_admin_write on storage.objects;
create policy product_images_public_read on storage.objects for select
  using (bucket_id = 'product-images');
create policy product_images_admin_write on storage.objects for all
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
