// features/products/productService.ts
import { supabase } from '@/lib/supabase';
import { dataCache } from '@/lib/cache/DataCache';

export interface Product {
  id: string;
  user_id: string;
  barcode: string;
  name: string;
  price_sell: number;
  price_buy?: number;
  stock_qty: number;
  alert_threshold?: number;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  barcode: string;
  name: string;
  price_sell: number;
  price_buy?: number;
  stock_qty?: number;
  category?: string;
}

/**
 * Récupère un produit par son code-barres
 */
export async function getProductByBarcode(userId: string, barcode: string): Promise<Product | null> {
  const cleanBarcode = barcode.trim();
  console.log(`🔍 Recherche produit par barcode: ${cleanBarcode}`);

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .eq('barcode', cleanBarcode)
    .maybeSingle();

  if (error) {
    console.error("❌ Erreur recherche produit:", error.message);
    throw error;
  }

  return data as Product | null;
}

/**
 * Crée un nouveau produit
 */
export async function createProduct(userId: string, data: CreateProductData): Promise<Product> {
  console.log("📦 Création produit:", data.name);

  const payload = {
    user_id: userId,
    barcode: data.barcode.trim(),
    name: data.name.trim(),
    price_sell: data.price_sell,
    price_buy: data.price_buy || 0,
    stock_qty: data.stock_qty || 1,
    category: data.category || '',
    alert_threshold: 5,
  };

  const { data: product, error } = await supabase
    .from('products')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("❌ Erreur création produit:", error.message);
    throw error;
  }

  // Invalider le cache
  dataCache.clear();
  console.log("✅ Produit créé:", product.name);

  return product as Product;
}

/**
 * Met à jour le stock d'un produit
 */
export async function updateStock(productId: string, delta: number): Promise<Product> {
  console.log(`📊 Mise à jour stock: ${productId} (delta: ${delta})`);

  // Récupérer le stock actuel
  const { data: current } = await supabase
    .from('products')
    .select('stock_qty')
    .eq('id', productId)
    .single();

  if (!current) throw new Error("Produit introuvable");

  const newQty = Math.max(0, (current.stock_qty || 0) + delta);

  const { data: updated, error } = await supabase
    .from('products')
    .update({ 
      stock_qty: newQty,
      updated_at: new Date().toISOString()
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;

  dataCache.clear();
  console.log("✅ Stock mis à jour:", newQty);

  return updated as Product;
}

/**
 * Liste tous les produits d'un utilisateur
 */
export async function getAllProducts(userId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) throw error;
  return (data as Product[]) || [];
}
