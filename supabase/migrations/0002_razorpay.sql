-- ============================================================================
-- Razorpay payment fields on orders.
-- Run in the Supabase SQL Editor after 0001_init.sql. Safe to re-run.
-- ============================================================================

alter table public.orders
  add column if not exists razorpay_order_id   text,
  add column if not exists razorpay_payment_id text;

create index if not exists orders_razorpay_order_idx
  on public.orders(razorpay_order_id);

-- Order status lifecycle used by the app:
--   pending     → order created, awaiting payment
--   processing  → payment captured & signature verified (set by the Edge Function)
--   shipped / delivered / cancelled → managed later by admin/ops
--
-- Note: the verify Edge Function updates orders using the service_role key
-- (which bypasses RLS), so no client-side UPDATE policy is required or wanted.
