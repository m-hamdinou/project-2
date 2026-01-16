/*
  # Add barcode field to products table

  1. Changes
    - Add `barcode` column to `products` table
      - Type: text (nullable, unique)
      - Used for scanning products with barcode/QR code readers
    - Add index on barcode for fast lookups during scanning
  
  2. Notes
    - Barcode is nullable to support products without barcodes
    - Unique constraint ensures each barcode maps to one product
    - Index improves scan performance
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE products ADD COLUMN barcode text UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
  END IF;
END $$;