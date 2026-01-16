// features/stock/useStock.ts
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { dataCache } from '@/lib/cache/DataCache';

export interface Product {
  id: string;
  name: string;
  price_sell: number;
  stock_qty: number;
  barcode: string;
  category: string;
  alert_threshold: number;
}

export function useStock() {
  const [loading, setLoading] = useState(false);

  const getProducts = useCallback(async (userId: string, forceRefresh = false) => {
    const cacheKey = `products_${userId}`;
    if (!forceRefresh) {
      const cached = dataCache.get<Product[]>(cacheKey);
      if (cached) return cached;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    setLoading(false);
    if (error) throw error;

    dataCache.set(cacheKey, data);
    return data as Product[];
  }, []);

  const incrementStock = useCallback(async (productId: string, currentQty: number) => {
    const newQty = currentQty + 1;
    const { data, error } = await supabase
      .from('products')
      .update({ stock_qty: newQty, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;
    
    // Invalider le cache pour forcer le rafraîchissement au prochain chargement
    dataCache.clear(); 
    return data as Product;
  }, []);

  return {
    loading,
    getProducts,
    incrementStock,
  };
}
