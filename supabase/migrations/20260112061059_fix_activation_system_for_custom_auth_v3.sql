/*
  # Fix Activation System for Custom Auth (v3)

  1. Changes
    - Drop user_profiles table (not needed)
    - Drop trigger on auth.users (not used)
    - Add status and activated_at columns to existing users table
    - Update activation_codes to reference users table instead of auth.users
    - Restore original permissive RLS policies

  2. Notes
    - This app uses custom authentication, not Supabase Auth
    - All users start with status='pending' by default
    - Status check will be enforced in application layer
*/

-- Drop policies first (in correct order)
DROP POLICY IF EXISTS "Active users can delete own payments" ON payments;
DROP POLICY IF EXISTS "Active users can update own payments" ON payments;
DROP POLICY IF EXISTS "Active users can insert own payments" ON payments;
DROP POLICY IF EXISTS "Active users can read own payments" ON payments;
DROP POLICY IF EXISTS "Enable all access for payments" ON payments;

DROP POLICY IF EXISTS "Active users can delete own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Active users can update own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Active users can insert own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Active users can read own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Enable all access for invoice_items" ON invoice_items;

DROP POLICY IF EXISTS "Active users can delete own invoices" ON invoices;
DROP POLICY IF EXISTS "Active users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Active users can insert own invoices" ON invoices;
DROP POLICY IF EXISTS "Active users can read own invoices" ON invoices;
DROP POLICY IF EXISTS "Enable all access for invoices" ON invoices;

DROP POLICY IF EXISTS "Active users can delete own products" ON products;
DROP POLICY IF EXISTS "Active users can update own products" ON products;
DROP POLICY IF EXISTS "Active users can insert own products" ON products;
DROP POLICY IF EXISTS "Active users can read own products" ON products;
DROP POLICY IF EXISTS "Enable all access for products" ON products;

DROP POLICY IF EXISTS "Active users can delete own clients" ON clients;
DROP POLICY IF EXISTS "Active users can update own clients" ON clients;
DROP POLICY IF EXISTS "Active users can insert own clients" ON clients;
DROP POLICY IF EXISTS "Active users can read own clients" ON clients;
DROP POLICY IF EXISTS "Enable all access for clients" ON clients;

-- Now drop the function
DROP FUNCTION IF EXISTS is_user_active() CASCADE;

-- Drop the user_profiles table and related trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Add status columns to existing users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'blocked'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'activated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN activated_at timestamptz;
  END IF;
END $$;

-- Drop and recreate activation_codes table with correct foreign key
DROP TABLE IF EXISTS activation_codes CASCADE;

CREATE TABLE activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  used boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  used_by uuid REFERENCES users(id),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- Activation codes policies - users cannot read codes at all
CREATE POLICY "Users cannot read activation codes"
  ON activation_codes FOR SELECT
  TO public
  USING (false);

CREATE POLICY "Users cannot insert activation codes"
  ON activation_codes FOR INSERT
  TO public
  WITH CHECK (false);

CREATE POLICY "Users cannot update activation codes"
  ON activation_codes FOR UPDATE
  TO public
  USING (false);

CREATE POLICY "Users cannot delete activation codes"
  ON activation_codes FOR DELETE
  TO public
  USING (false);

-- Restore original permissive policies
CREATE POLICY "Enable all access for products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for invoice_items" ON invoice_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for clients" ON clients FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_used ON activation_codes(used);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);