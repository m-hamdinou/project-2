/*
  # Add Performance Indexes

  1. Performance Improvements
    - Add index on invoices(user_id, created_at) for dashboard queries
    - Add index on invoices(user_id, status) for debts queries
    - Add index on products(user_id, stock_qty, alert_threshold) for low stock queries
    - Add index on invoice_items(invoice_id) for invoice details queries

  2. Notes
    - These indexes will significantly speed up dashboard and list queries
    - Composite indexes are used to optimize common query patterns
*/

-- Index for dashboard today sales query
CREATE INDEX IF NOT EXISTS idx_invoices_user_created 
ON invoices(user_id, created_at DESC);

-- Index for debts status queries
CREATE INDEX IF NOT EXISTS idx_invoices_user_status 
ON invoices(user_id, status);

-- Index for low stock queries
CREATE INDEX IF NOT EXISTS idx_products_user_stock 
ON products(user_id, stock_qty, alert_threshold);

-- Index for invoice items lookup
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice 
ON invoice_items(invoice_id);