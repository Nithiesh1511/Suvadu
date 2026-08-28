-- ============================================================================
-- SUVADU Notebooks — Let a shopper's own abandoned order be rolled back
-- Run in the Supabase SQL Editor after 0001–0006.
-- Safe to re-run (DROP POLICY IF EXISTS).
-- ============================================================================

-- ── FIX: the checkout rollback silently did nothing ──────────────────────────
-- Checkout inserts the order, then its line items. If the line-item insert
-- fails it tries to delete the order again so nothing is left behind:
--
--     await supabase.from('orders').delete().eq('id', order.id)
--
-- RLS is enabled on public.orders and 0001_init.sql grants the owner SELECT and
-- INSERT only — no DELETE. So that statement has always matched zero rows, and
-- every failed checkout left an empty order stranded in the shopper's history,
-- pending forever, payable by nobody.
--
-- Allow the owner to delete their own order while it is still 'pending' — i.e.
-- before any money is involved. A paid order (processing / shipped / delivered)
-- stays untouchable, so this cannot be used to erase a purchase record.
-- order_items has ON DELETE CASCADE, so the lines go with it.
drop policy if exists orders_owner_delete_pending on public.orders;
create policy orders_owner_delete_pending
  on public.orders
  for delete
  using (auth.uid() = user_id and status = 'pending');
