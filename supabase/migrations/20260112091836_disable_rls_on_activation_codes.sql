/*
  # Désactiver RLS sur activation_codes
  
  1. Changements
    - Désactiver RLS sur la table activation_codes
    - Supprimer toutes les policies existantes
    
  2. Raison
    - L'authentification custom n'utilise pas auth.uid()
    - L'accès est déjà contrôlé au niveau de l'application
    - Les edge functions utilisent le service role key
    - Les codes d'activation ne sont pas des données sensibles
*/

-- Supprimer toutes les policies
DROP POLICY IF EXISTS "Admins can read all activation codes" ON activation_codes;
DROP POLICY IF EXISTS "Admins can insert activation codes" ON activation_codes;
DROP POLICY IF EXISTS "Admins can update activation codes" ON activation_codes;
DROP POLICY IF EXISTS "Admins can delete activation codes" ON activation_codes;

-- Désactiver RLS
ALTER TABLE activation_codes DISABLE ROW LEVEL SECURITY;
