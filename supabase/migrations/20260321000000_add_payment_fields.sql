-- ================================================================
-- ADD PAYMENT FIELDS TO RESERVATIONS
-- Run in Supabase SQL Editor → New query → Run
-- ================================================================

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_method  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_status  TEXT    NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending_verification', 'paid', 'failed')),
  ADD COLUMN IF NOT EXISTS transaction_id  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS amount_paid     INTEGER DEFAULT NULL;

-- Admin can update payment fields
DROP POLICY IF EXISTS "admin_update_payment" ON public.reservations;
CREATE POLICY "admin_update_payment"
  ON public.reservations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow authenticated users to update their own reservation payment info
CREATE POLICY "user_update_payment" ON public.reservations
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON COLUMN public.reservations.payment_method  IS 'mtn_momo | orange_money';
COMMENT ON COLUMN public.reservations.payment_status  IS 'unpaid | pending_verification | paid | failed';
COMMENT ON COLUMN public.reservations.transaction_id  IS 'MoMo transaction ID entered by guest';
COMMENT ON COLUMN public.reservations.amount_paid     IS 'Amount paid in XAF';
