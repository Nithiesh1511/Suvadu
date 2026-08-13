-- ============================================================================
-- SUVADU Notebooks — Security hardening + missing storefront tables
-- Run in the Supabase SQL Editor after 0001–0004.
-- Safe to re-run (IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).
-- Relies on public.is_admin() from 0001_init.sql.
-- ============================================================================

-- ── FIX: privilege-escalation via profiles self-update ───────────────────────
-- The profiles_self_update policy (0001) lets a user update their own row, which
-- (without a guard) includes flipping is_admin = true → full admin takeover.
-- A BEFORE UPDATE trigger blocks any change to is_admin unless the caller is
-- already an admin. auth.uid() is null when run from the SQL Editor / service
-- role, so the documented "flip is_admin in Table Editor" bootstrap still works.
create or replace function public.guard_profile_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Not permitted to change admin status.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_admin_flag on public.profiles;
create trigger guard_profile_admin_flag
  before update on public.profiles
  for each row execute function public.guard_profile_admin_flag();

-- ── Inventory: per-product stock (null = untracked / unlimited) ───────────────
alter table public.products
  add column if not exists stock int;   -- null = not tracked; 0 = out of stock

-- ── Saved addresses (was fake client-only state in Account) ──────────────────
create table if not exists public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null default '',
  line       text not null,
  city       text not null default '',
  state      text not null default '',
  pincode    text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses(user_id);

alter table public.addresses enable row level security;
drop policy if exists addresses_owner_all on public.addresses;
create policy addresses_owner_all on public.addresses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Newsletter subscribers (was a fake toast in Home/Footer) ─────────────────
create table if not exists public.newsletter_subscribers (
  email      text primary key,
  created_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;
-- Anyone (incl. anonymous visitors) may subscribe; only admins may read the list.
drop policy if exists newsletter_public_insert on public.newsletter_subscribers;
drop policy if exists newsletter_admin_read    on public.newsletter_subscribers;
create policy newsletter_public_insert on public.newsletter_subscribers
  for insert with check (true);
create policy newsletter_admin_read on public.newsletter_subscribers
  for select using (public.is_admin());
