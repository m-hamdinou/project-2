/*
  # Fatora Application Database Schema
  
  1. New Tables
    - `users` - Store user accounts with phone-based authentication
      - `id` (uuid, primary key)
      - `phone` (text, unique) - Phone number for login
      - `password_hash` (text) - Hashed password
      - `shop_name` (text) - Optional shop name
      - `shop_address` (text) - Optional address
      - `shop_logo_url` (text) - Optional logo URL
      - `language` (text) - Preferred language (fr/ar)
      - `currency` (text) - Currency code (MRU default)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `clients` - Store customer information
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Foreign key to users
      - `name` (text) - Client name
      - `phone` (text) - Client phone
      - `created_at` (timestamptz)
    
    - `products` - Inventory/stock management
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Foreign key to users
      - `name` (text) - Product name
      - `price_sell` (numeric) - Selling price
      - `price_buy` (numeric) - Purchase price (optional)
      - `stock_qty` (integer) - Current stock quantity
      - `alert_threshold` (integer) - Low stock alert threshold
      - `category` (text) - Product category (optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `invoices` - Invoice records
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Foreign key to users
      - `client_id` (uuid) - Foreign key to clients (nullable)
      - `client_name` (text) - Client name (denormalized)
      - `client_phone` (text) - Client phone (denormalized)
      - `invoice_number` (text) - Unique invoice number
      - `total_amount` (numeric) - Total invoice amount
      - `discount` (numeric) - Discount amount
      - `paid_amount_total` (numeric) - Total amount paid
      - `remaining_amount` (numeric) - Remaining to pay
      - `status` (text) - PAID, PARTIAL, UNPAID
      - `due_date` (date) - Payment due date
      - `notes` (text) - Invoice notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `invoice_items` - Line items for invoices
      - `id` (uuid, primary key)
      - `invoice_id` (uuid) - Foreign key to invoices
      - `product_id` (uuid) - Foreign key to products (nullable for services)
      - `name` (text) - Item name
      - `qty` (integer) - Quantity
      - `unit_price` (numeric) - Price per unit
      - `line_total` (numeric) - Total for this line
      - `created_at` (timestamptz)
    
    - `payments` - Payment records for invoices
      - `id` (uuid, primary key)
      - `invoice_id` (uuid) - Foreign key to invoices
      - `user_id` (uuid) - Foreign key to users
      - `amount` (numeric) - Payment amount
      - `method` (text) - CASH, BANKILY, SEDAD, CLICK, BAMIS, OTHER
      - `note` (text) - Payment note
      - `paid_at` (timestamptz) - Payment timestamp
      - `created_at` (timestamptz)
  
  2. Security
    - RLS enabled on all tables
    - Users can only access their own data
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  shop_name text DEFAULT '',
  shop_address text DEFAULT '',
  shop_logo_url text DEFAULT '',
  language text DEFAULT 'fr',
  currency text DEFAULT 'MRU',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_sell numeric NOT NULL DEFAULT 0,
  price_buy numeric DEFAULT 0,
  stock_qty integer NOT NULL DEFAULT 0,
  alert_threshold integer DEFAULT 5,
  category text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own products"
  ON products FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text DEFAULT '',
  invoice_number text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  discount numeric DEFAULT 0,
  paid_amount_total numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'UNPAID',
  due_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  name text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'CASH',
  note text DEFAULT '',
  paid_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own payments"
  ON payments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);