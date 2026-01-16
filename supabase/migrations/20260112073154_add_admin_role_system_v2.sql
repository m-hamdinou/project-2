/*
  # Add Admin Role System v2

  1. Changes
    - Add `role` column to users table ('user' or 'admin')
    - Admins bypass activation (automatically active)
    - Add helper function to create admin accounts

  2. Security
    - Only admins can access admin features
    - Admins are automatically active (no activation needed)
*/

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Add constraint to role column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

-- Create index on role for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Function to create admin user (requires pre-hashed password)
CREATE OR REPLACE FUNCTION create_admin_user(
  p_phone text,
  p_password_hash text,
  p_shop_name text DEFAULT 'Administration'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized_phone text;
  v_user_id uuid;
  v_existing_user RECORD;
BEGIN
  -- Normalize phone
  v_normalized_phone := REPLACE(p_phone, ' ', '');
  
  -- Check if phone already exists
  SELECT * INTO v_existing_user
  FROM users
  WHERE phone = v_normalized_phone;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ce numéro de téléphone existe déjà'
    );
  END IF;
  
  -- Insert admin user
  INSERT INTO users (
    phone,
    password_hash,
    shop_name,
    role,
    status,
    activated_at,
    created_at,
    updated_at
  ) VALUES (
    v_normalized_phone,
    p_password_hash,
    p_shop_name,
    'admin',
    'active',
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'Compte administrateur créé avec succès'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erreur: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_admin_user(text, text, text) TO public;
