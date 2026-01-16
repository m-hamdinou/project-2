// features/invoice/invoiceService.ts
import { Product } from '@/features/products/productService';

export interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

/**
 * Ajoute un produit à la facture (ou incrémente la quantité si déjà présent)
 */
export function addItemToInvoice(items: InvoiceItem[], product: Product): InvoiceItem[] {
  const existing = items.find(i => i.productId === product.id);

  if (existing) {
    // Produit déjà dans la facture → Quantité +1
    console.log(`📈 Incrémentation quantité: ${product.name} (${existing.qty} → ${existing.qty + 1})`);
    return items.map(i => 
      i.productId === product.id 
        ? { ...i, qty: i.qty + 1, lineTotal: (i.qty + 1) * i.unitPrice }
        : i
    );
  }

  // Nouveau produit → Ajouter une ligne
  console.log(`➕ Ajout produit à la facture: ${product.name}`);
  const newItem: InvoiceItem = {
    id: Math.random().toString(36).substr(2, 9),
    productId: product.id,
    name: product.name,
    qty: 1,
    unitPrice: product.price_sell,
    lineTotal: product.price_sell
  };

  return [...items, newItem];
}

/**
 * Met à jour la quantité d'une ligne
 */
export function updateItemQty(items: InvoiceItem[], itemId: string, newQty: number): InvoiceItem[] {
  if (newQty < 1) return items;
  
  return items.map(i => 
    i.id === itemId 
      ? { ...i, qty: newQty, lineTotal: newQty * i.unitPrice }
      : i
  );
}

/**
 * Supprime une ligne de la facture
 */
export function removeItemFromInvoice(items: InvoiceItem[], itemId: string): InvoiceItem[] {
  return items.filter(i => i.id !== itemId);
}

/**
 * Calcule les totaux de la facture
 */
export function calculateInvoiceTotals(items: InvoiceItem[], discount: number = 0, taxRate: number = 0): InvoiceTotals {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = subtotal * (taxRate / 100);
  const total = Math.max(0, subtotal + tax - discount);

  return { subtotal, discount, tax, total };
}
