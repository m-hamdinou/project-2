/*
  # Enforce Active Status on Existing Tables

  1. Changes
    - Update all existing RLS policies to check user_profiles.status = 'active'
    - This ensures that only activated users can access app data
    - Applies to: products, invoices, invoice_items, payments

  2. Security
    - All data access requires active status
    - Pending users cannot read or write any business data
    - Blocked users are also denied access
*/

-- Helper function to check if user is active
CREATE OR REPLACE FUNCTION is_user_active()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies on products
DROP POLICY IF EXISTS "Users can read own products" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;

-- Recreate products policies with active status check
CREATE POLICY "Active users can read own products"
  ON products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND is_user_active());

CREATE POLICY "Active users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_user_active());

CREATE POLICY "Active users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_user_active())
  WITH CHECK (auth.uid() = user_id AND is_user_active());

CREATE POLICY "Active users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_user_active());

-- Drop existing policies on invoices
DROP POLICY IF EXISTS "Users can read own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;

-- Recreate invoices policies with active status check
CREATE POLICY "Active users can read own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND is_user_active());

CREATE POLICY "Active users can insert own invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_user_active());

CREATE POLICY "Active users can update own invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_user_active())
  WITH CHECK (auth.uid() = user_id AND is_user_active());

CREATE POLICY "Active users can delete own invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_user_active());

-- Drop existing policies on invoice_items
DROP POLICY IF EXISTS "Users can read own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can insert own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can update own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can delete own invoice items" ON invoice_items;

-- Recreate invoice_items policies with active status check
CREATE POLICY "Active users can read own invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    ) AND is_user_active()
  );

CREATE POLICY "Active users can insert own invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    ) AND is_user_active()
  );

CREATE POLICY "Active users can update own invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    ) AND is_user_active()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    ) AND is_user_active()
  );

CREATE POLICY "Active users can delete own invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    ) AND is_user_active()
  );

-- Drop existing policies on payments
DROP POLICY IF EXISTS "Users can read own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON payments;
DROP POLICY IF EXISTS "Users can update own payments" ON payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON payments;

-- Recreate payments policies with active status check
CREATE POLICY "Active users can read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
      AND invoices.user_id = auth.uid()
    ) AND is_user_active()
  );

CREATE POLICY "Active users can insert own payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
      AND invoices.user_id = auth.uid()
    ) AND is_user_active()
  );

CREATE POLICY "Active users can update own payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
      AND invoices.user_id = auth.uid()
    ) AND is_user_active()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
      AND invoices.user_id = auth.uid()
    ) AND is_user_active()
  );

CREATE POLICY "Active users can delete own payments"
  ON payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
      AND invoices.user_id = auth.uid()
    ) AND is_user_active()
  );