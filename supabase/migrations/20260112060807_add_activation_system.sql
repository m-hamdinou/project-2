/*
  # Add Activation System

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `status` (text) - 'pending', 'active', 'blocked'
      - `activated_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `activation_codes`
      - `id` (uuid, primary key)
      - `code` (text, unique) - 8 character alphanumeric code
      - `used` (boolean) - whether code has been used
      - `expires_at` (timestamptz) - expiration date
      - `used_by` (uuid, nullable, references auth.users)
      - `used_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only read their own profile
    - Users can only update their own profile status via activation function
    - Activation codes are not readable by regular users
    - Only service role can generate codes

  3. Functions
    - Trigger to create user_profile on auth.users insert
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'blocked')),
  activated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create activation_codes table
CREATE TABLE IF NOT EXISTS activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  used boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  used_by uuid REFERENCES auth.users(id),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users cannot insert profiles directly"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Users cannot update profiles directly"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Users cannot delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (false);

-- Activation codes policies - users cannot read codes at all
CREATE POLICY "Users cannot read activation codes"
  ON activation_codes FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "Users cannot insert activation codes"
  ON activation_codes FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Users cannot update activation codes"
  ON activation_codes FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Users cannot delete activation codes"
  ON activation_codes FOR DELETE
  TO authenticated
  USING (false);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, status, created_at)
  VALUES (NEW.id, 'pending', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_used ON activation_codes(used);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);