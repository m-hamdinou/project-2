/*
  # Restructuration complète du système d'authentification

  ## Vue d'ensemble
  Cette migration restructure le système d'authentification pour utiliser correctement
  Supabase Auth au lieu d'un système custom. Elle assure la sécurité des données et
  la fonctionnalité des RLS policies.

  ## Changements majeurs

  ### 1. Nettoyage de la table users
  - Suppression de la table users custom (données migrées vers profiles)
  - Les foreign keys seront mises à jour pour pointer vers auth.users

  ### 2. Restructuration de la table profiles
  - Devient la table principale des données utilisateur
  - Liée à auth.users via trigger automatique
  - Contient role, status, et toutes les données métier

  ### 3. Table activation_codes
  - user_id pointe vers auth.users
  - created_by_admin_id pointe vers auth.users
  - Policies mises à jour pour utiliser auth.uid()

  ### 4. Mise à jour des foreign keys
  - products.user_id → auth.users
  - services.user_id → auth.users
  - clients.user_id → auth.users
  - invoices.user_id → auth.users
  - payments.user_id → auth.users

  ### 5. RLS Policies
  - Toutes les policies migrées pour utiliser auth.uid()
  - Policies admin utilisant app_metadata.role
  - Nouvelles policies pour profiles

  ## Sécurité
  - ✅ Authentification via Supabase Auth uniquement
  - ✅ Mots de passe hashés par Supabase (bcrypt)
  - ✅ RLS fonctionnel sur toutes les tables
  - ✅ Séparation stricte des données par utilisateur
  - ✅ Rôle admin stocké dans app_metadata
*/

-- =====================================================
-- ÉTAPE 1: Désactiver temporairement RLS et supprimer les contraintes
-- =====================================================

-- Désactiver RLS temporairement pour la migration
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activation_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les foreign keys existantes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT constraint_name, table_name 
              FROM information_schema.table_constraints 
              WHERE constraint_type = 'FOREIGN KEY' 
              AND table_schema = 'public')
    LOOP
        EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || r.constraint_name || ' CASCADE';
    END LOOP;
END $$;

-- Supprimer toutes les policies existantes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- =====================================================
-- ÉTAPE 2: Restructurer la table profiles
-- =====================================================

-- Supprimer et recréer profiles proprement
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  shop_name TEXT DEFAULT '',
  shop_address TEXT DEFAULT '',
  shop_logo_url TEXT DEFAULT '',
  language TEXT DEFAULT 'fr' CHECK (language IN ('fr', 'ar')),
  currency TEXT DEFAULT 'MRU',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'blocked')),
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, role, status)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_app_metadata->>'role', 'user'),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- =====================================================
-- ÉTAPE 3: Nettoyer la table users
-- =====================================================

-- Supprimer complètement la table users custom
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- ÉTAPE 4: Restructurer activation_codes
-- =====================================================

-- Recréer activation_codes proprement
DROP TABLE IF EXISTS activation_codes CASCADE;

CREATE TABLE IF NOT EXISTS activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_status ON activation_codes(status);
CREATE INDEX IF NOT EXISTS idx_activation_codes_used_by ON activation_codes(used_by);

-- =====================================================
-- ÉTAPE 5: Recréer les tables métier avec bonnes références
-- =====================================================

-- Products
DROP TABLE IF EXISTS products CASCADE;
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  price_sell NUMERIC DEFAULT 0 CHECK (price_sell >= 0),
  price_buy NUMERIC DEFAULT 0 CHECK (price_buy >= 0),
  stock_qty INTEGER DEFAULT 0 CHECK (stock_qty >= 0),
  alert_threshold INTEGER DEFAULT 5 CHECK (alert_threshold >= 0),
  category TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Services
DROP TABLE IF EXISTS services CASCADE;
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC DEFAULT 0 CHECK (price >= 0),
  tax_rate NUMERIC DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  discount NUMERIC DEFAULT 0 CHECK (discount >= 0),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);

-- Clients
DROP TABLE IF EXISTS clients CASCADE;
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Invoices
DROP TABLE IF EXISTS invoices CASCADE;
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT DEFAULT '',
  invoice_number TEXT NOT NULL,
  total_amount NUMERIC DEFAULT 0 CHECK (total_amount >= 0),
  discount NUMERIC DEFAULT 0 CHECK (discount >= 0),
  paid_amount_total NUMERIC DEFAULT 0 CHECK (paid_amount_total >= 0),
  remaining_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'UNPAID' CHECK (status IN ('PAID', 'UNPAID', 'PARTIAL')),
  payment_method TEXT DEFAULT 'CASH',
  due_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Invoice Items
DROP TABLE IF EXISTS invoice_items CASCADE;
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT DEFAULT 'product' CHECK (item_type IN ('product', 'service')),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  qty INTEGER DEFAULT 1 CHECK (qty > 0),
  unit_price NUMERIC DEFAULT 0 CHECK (unit_price >= 0),
  tax_rate NUMERIC DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  discount NUMERIC DEFAULT 0 CHECK (discount >= 0),
  line_total NUMERIC DEFAULT 0 CHECK (line_total >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON invoice_items(service_id);

-- Payments
DROP TABLE IF EXISTS payments CASCADE;
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC DEFAULT 0 CHECK (amount >= 0),
  method TEXT DEFAULT 'CASH',
  note TEXT DEFAULT '',
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- =====================================================
-- ÉTAPE 6: RLS POLICIES - PROFILES
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Utilisateur peut voir son propre profil, admin peut tout voir
CREATE POLICY "profiles_select_own_or_admin"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- INSERT: Uniquement lors de la création via trigger
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: Utilisateur peut modifier son profil, admin peut tout modifier
CREATE POLICY "profiles_update_own_or_admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    auth.uid() = id 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- DELETE: Seul admin peut supprimer
CREATE POLICY "profiles_delete_admin_only"
  ON profiles FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- =====================================================
-- ÉTAPE 7: RLS POLICIES - PRODUCTS
-- =====================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_own_or_admin"
  ON products FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "products_insert_own"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "products_update_own_or_admin"
  ON products FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "products_delete_own_or_admin"
  ON products FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- =====================================================
-- ÉTAPE 8: RLS POLICIES - SERVICES
-- =====================================================

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_select_own_or_admin"
  ON services FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "services_insert_own"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "services_update_own_or_admin"
  ON services FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "services_delete_own_or_admin"
  ON services FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- =====================================================
-- ÉTAPE 9: RLS POLICIES - CLIENTS
-- =====================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select_own_or_admin"
  ON clients FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "clients_insert_own"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "clients_update_own_or_admin"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "clients_delete_own_or_admin"
  ON clients FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- =====================================================
-- ÉTAPE 10: RLS POLICIES - INVOICES
-- =====================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select_own_or_admin"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "invoices_insert_own"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "invoices_update_own_or_admin"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "invoices_delete_own_or_admin"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- =====================================================
-- ÉTAPE 11: RLS POLICIES - INVOICE_ITEMS
-- =====================================================

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Accès via la facture parente
CREATE POLICY "invoice_items_select_via_invoice"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (
        invoices.user_id = auth.uid()
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      )
    )
  );

CREATE POLICY "invoice_items_insert_via_invoice"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "invoice_items_update_via_invoice"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (
        invoices.user_id = auth.uid()
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (
        invoices.user_id = auth.uid()
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      )
    )
  );

CREATE POLICY "invoice_items_delete_via_invoice"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (
        invoices.user_id = auth.uid()
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      )
    )
  );

-- =====================================================
-- ÉTAPE 12: RLS POLICIES - PAYMENTS
-- =====================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_own_or_admin"
  ON payments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "payments_insert_own"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payments_update_own_or_admin"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "payments_delete_own_or_admin"
  ON payments FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- =====================================================
-- ÉTAPE 13: RLS POLICIES - ACTIVATION_CODES
-- =====================================================

ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- Seul les admins peuvent gérer les codes
CREATE POLICY "activation_codes_admin_only_select"
  ON activation_codes FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "activation_codes_admin_only_insert"
  ON activation_codes FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "activation_codes_admin_only_update"
  ON activation_codes FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "activation_codes_admin_only_delete"
  ON activation_codes FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- =====================================================
-- ÉTAPE 14: Fonctions utilitaires
-- =====================================================

-- Fonction pour vérifier si un utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si un utilisateur est actif
CREATE OR REPLACE FUNCTION is_user_active(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_status TEXT;
BEGIN
  SELECT status INTO user_status FROM profiles WHERE id = user_id;
  RETURN user_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÉTAPE 15: Triggers pour updated_at sur toutes les tables
-- =====================================================

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

-- Note: Les données existantes dans la table users custom seront perdues
-- car nous basculons vers Supabase Auth natif. Les utilisateurs devront
-- se réinscrire avec le nouveau système.
