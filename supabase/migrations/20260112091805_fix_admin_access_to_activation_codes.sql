/*
  # Corriger l'accès admin aux codes d'activation

  1. Corrections
    - Supprimer les policies restrictives qui bloquent tout le monde
    - Créer de nouvelles policies permettant aux admins de gérer les codes d'activation
    - Les admins peuvent lire, créer, modifier et supprimer les codes
    - Les utilisateurs normaux ne peuvent toujours rien faire
  
  2. Sécurité
    - Seuls les utilisateurs avec role = 'admin' peuvent accéder aux codes d'activation
    - Les utilisateurs normaux restent bloqués (par défaut RLS)
*/

-- Supprimer les anciennes policies restrictives
DROP POLICY IF EXISTS "Users cannot read activation codes" ON activation_codes;
DROP POLICY IF EXISTS "Users cannot insert activation codes" ON activation_codes;
DROP POLICY IF EXISTS "Users cannot update activation codes" ON activation_codes;
DROP POLICY IF EXISTS "Users cannot delete activation codes" ON activation_codes;

-- Créer de nouvelles policies pour les admins
CREATE POLICY "Admins can read all activation codes"
  ON activation_codes
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

CREATE POLICY "Admins can insert activation codes"
  ON activation_codes
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

CREATE POLICY "Admins can update activation codes"
  ON activation_codes
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

CREATE POLICY "Admins can delete activation codes"
  ON activation_codes
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );
