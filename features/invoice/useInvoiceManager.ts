import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { dataCache } from '@/lib/cache/DataCache';
import { 
  InvoiceItem, 
  addItemToInvoice, 
  updateItemQty, 
  removeItemFromInvoice, 
  calculateInvoiceTotals 
} from '@/features/invoice/invoiceService';
import { Product } from '@/features/products/productService';

export function useInvoiceManager() {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addItem = useCallback((product: Product) => {
    setItems(current => addItemToInvoice(current, product));
    console.log("✅ Produit ajouté à la facture:", product.name);
  }, []);

  // ✅ AJOUT DE SERVICE (sans productId)
  const addService = useCallback((name: string, price: number, qty: number = 1) => {
    const newService: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: undefined, // Pas de lien produit pour un service
      name: name.trim(),
      qty: qty,
      unitPrice: price,
      lineTotal: price * qty
    };
    setItems(current => [...current, newService]);
    console.log("✅ Service ajouté à la facture:", name);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(current => removeItemFromInvoice(current, itemId));
  }, []);

  const updateQty = useCallback((itemId: string, newQty: number) => {
    setItems(current => updateItemQty(current, itemId, newQty));
  }, []);

  const getTotals = useCallback(() => {
    return calculateInvoiceTotals(items, discount, 0);
  }, [items, discount]);

  const saveInvoice = async (userId: string, status: string, paidAmount: number, method: string) => {
    setIsSaving(true);
    const totals = getTotals();
    
    try {
      // 1. Créer la facture
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          user_id: userId,
          client_name: clientName,
          client_phone: clientPhone,
          invoice_number: `FAT-${Date.now().toString().slice(-6)}`,
          total_amount: totals.total,
          discount: discount,
          paid_amount_total: paidAmount,
          remaining_amount: totals.total - paidAmount,
          status: status,
          notes: notes
        })
        .select().single();

      if (invErr) throw invErr;

      // 2. Créer les lignes
      const { error: itemsErr } = await supabase
        .from('invoice_items')
        .insert(items.map(item => ({
          invoice_id: invoice.id,
          product_id: item.productId,
          name: item.name,
          qty: item.qty,
          unit_price: item.unitPrice,
          line_total: item.lineTotal
        })));

      if (itemsErr) throw itemsErr;

      // 3. Mise à jour stock (décrémentation à la validation)
      for (const item of items) {
        if (item.productId) {
          const { data: p } = await supabase
            .from('products')
            .select('stock_qty')
            .eq('id', item.productId)
            .maybeSingle();
            
          if (p) {
            await supabase
              .from('products')
              .update({ stock_qty: Math.max(0, p.stock_qty - item.qty) })
              .eq('id', item.productId);
          }
        }
      }

      dataCache.clear();
      return { success: true, invoice };
    } catch (err: any) {
      Alert.alert("Erreur Sauvegarde", err.message);
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  };

  const reset = useCallback(() => {
    setItems([]);
    setClientName('');
    setClientPhone('');
    setDiscount(0);
    setNotes('');
  }, []);

  return {
    items,
    addItem,
    addService, // ✅ Nouveau
    removeItem,
    updateQty,
    clientName,
    setClientName,
    clientPhone,
    setClientPhone,
    discount,
    setDiscount,
    notes,
    setNotes,
    getTotals,
    saveInvoice,
    reset,
    isSaving
  };
}
