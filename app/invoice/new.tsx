import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2, Package, X, Briefcase, Zap } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';
import { useAuth, supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarcodeScannerWeb } from '@/components/BarcodeScannerWeb';
import { useInvoiceManager } from '@/features/invoice/useInvoiceManager';
import { ProductQuickAddBottomSheet } from '@/components/ProductQuickAddBottomSheet';

export default function NewInvoiceScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  
  // ✅ LOGIQUE CENTRALISÉE
  const inv = useInvoiceManager();

  const [showProductModal, setShowProductModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  
  // Scanner states
  const [showScanner, setShowScanner] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  
  // Service form
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceQty, setServiceQty] = useState('1');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    if (!user) return;
    const { data } = await supabase.from('products').select('*').eq('user_id', user.id).order('name');
    setProducts(data || []);
  };

  const handleBarcodeDetected = async (barcode: string) => {
    if (!user) return;

    const { getProductByBarcode } = await import('@/features/products/productService');
    
    try {
      const product = await getProductByBarcode(user.id, barcode);

      if (product) {
        inv.addItem(product);
        Alert.alert("✅ Ajouté", `${product.name} ajouté à la facture`);
      } else {
        Alert.alert(
          "Produit inconnu", 
          "Ce code n'existe pas. Voulez-vous créer ce produit ?",
          [
            { text: "Annuler", style: "cancel" },
            { 
              text: "Créer", 
              onPress: () => {
                setScannedBarcode(barcode);
                setShowQuickAdd(true);
              }
            }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    }
  };

  const handleAddService = () => {
    if (!serviceName.trim() || !servicePrice.trim()) {
      Alert.alert("Erreur", "Nom et prix du service sont obligatoires");
      return;
    }

    const price = parseFloat(servicePrice);
    const qty = parseInt(serviceQty) || 1;

    if (isNaN(price) || price <= 0) {
      Alert.alert("Erreur", "Prix invalide");
      return;
    }

    inv.addService(serviceName, price, qty);
    setServiceName('');
    setServicePrice('');
    setServiceQty('1');
    setShowServiceModal(false);
  };

  const handleNext = () => {
    if (inv.items.length === 0) {
      Alert.alert("Erreur", t.invoice.noArticles);
      return;
    }
    if (!inv.clientName.trim()) {
      Alert.alert("Erreur", "Nom du client obligatoire");
      return;
    }

    // Sauvegarder dans AsyncStorage pour l'écran de paiement
    const draft = {
      clientName: inv.clientName,
      clientPhone: inv.clientPhone,
      items: inv.items,
      discount: inv.discount,
      notes: inv.notes,
      total: inv.getTotals().total
    };
    AsyncStorage.setItem('@fatora_invoice_draft', JSON.stringify(draft));
    router.push('/invoice/payment');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>{t.invoice.new}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* CLIENT */}
          <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.invoice.client}</Text>
          <Input label={t.invoice.clientName} value={inv.clientName} onChangeText={inv.setClientName} required />
          <Input label={t.invoice.clientPhone} value={inv.clientPhone} onChangeText={inv.setClientPhone} keyboardType="phone-pad" />
          </View>

        {/* ARTICLES */}
          <View style={styles.section}>
          <TouchableOpacity style={styles.scanBtn} onPress={() => setShowScanner(true)}>
            <Zap size={20} color={colors.surface} />
            <Text style={styles.scanBtnText}>SCANNER UN ARTICLE (PHOTO)</Text>
          </TouchableOpacity>

          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>{t.invoice.articles}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowProductModal(true)} style={styles.addBtn}>
                <Package size={16} color={colors.primary} />
                <Text style={styles.addBtnText}>PRODUIT</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowServiceModal(true)} style={styles.addBtn}>
                <Briefcase size={16} color={colors.secondary} />
                <Text style={[styles.addBtnText, { color: colors.secondary }]}>SERVICE</Text>
              </TouchableOpacity>
            </View>
          </View>

          {inv.items.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{item.unitPrice} MRU</Text>
              </View>
              <View style={styles.qtyBox}>
                <TouchableOpacity onPress={() => inv.updateQty(item.id, item.qty - 1)}><Text style={styles.qtyBtn}>-</Text></TouchableOpacity>
                <Text style={styles.qtyText}>{item.qty}</Text>
                <TouchableOpacity onPress={() => inv.updateQty(item.id, item.qty + 1)}><Text style={styles.qtyBtn}>+</Text></TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => inv.removeItem(item.id)}><Trash2 size={20} color={colors.error} /></TouchableOpacity>
            </View>
          ))}
        </View>

        {/* TOTALS */}
        <View style={styles.totalBox}>
          <View style={styles.totalRow}><Text>Sous-total</Text><Text>{inv.getTotals().subtotal} MRU</Text></View>
          <View style={[styles.totalRow, { marginTop: 10 }]}><Text style={styles.grandTotal}>TOTAL</Text><Text style={styles.grandTotal}>{inv.getTotals().total} MRU</Text></View>
          </View>

        <Button title="PASSER AU PAIEMENT" onPress={handleNext} style={{ marginTop: 20 }} />
        </ScrollView>

      {/* SCANNER UNIFIÉ - MODE CONTINU */}
      <BarcodeScannerWeb 
        visible={showScanner} 
        onClose={() => setShowScanner(false)} 
        onDetected={handleBarcodeDetected} 
        context="INVOICE"
        continuous={true}
      />
      
      {/* SELECTION PRODUIT */}
      <Modal visible={showProductModal} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <Text style={styles.title}>Choisir un produit</Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}><X size={24} color={colors.text} /></TouchableOpacity>
                </View>
                  <FlatList
                    data={products}
            keyExtractor={item => item.id}
                    renderItem={({ item }) => (
              <TouchableOpacity style={styles.productItem} onPress={() => { inv.addItem(item); setShowProductModal(false); }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{item.price_sell} MRU</Text>
                      </TouchableOpacity>
                    )}
                  />
            </SafeAreaView>
        </Modal>

      <ProductQuickAddBottomSheet 
        visible={showQuickAdd} 
        onClose={() => setShowQuickAdd(false)} 
        barcode={scannedBarcode}
        onSuccess={(p) => { inv.addItem(p); setShowQuickAdd(false); }} 
      />

      {/* MODAL AJOUT SERVICE */}
      <Modal visible={showServiceModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.header}>
            <Text style={styles.title}>Ajouter un Service</Text>
            <TouchableOpacity onPress={() => setShowServiceModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Input 
              label="Nom du service" 
              value={serviceName} 
              onChangeText={setServiceName} 
              placeholder="Ex: Installation, Livraison..."
              required 
            />
            <Input 
              label="Prix" 
              value={servicePrice} 
              onChangeText={setServicePrice} 
              keyboardType="numeric"
              placeholder="0"
              required 
            />
            <Input 
              label="Quantité" 
              value={serviceQty} 
              onChangeText={setServiceQty} 
              keyboardType="numeric"
              placeholder="1"
            />
            <Button title="AJOUTER LE SERVICE" onPress={handleAddService} style={{ marginTop: 20 }} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  title: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: colors.textSecondary },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, padding: 15, borderRadius: 12, gap: 10, marginBottom: 20 },
  scanBtnText: { color: colors.surface, fontWeight: 'bold' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addBtnText: { color: colors.primary, fontWeight: 'bold' },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
  itemName: { fontWeight: 'bold', fontSize: 15 },
  itemPrice: { color: colors.textSecondary, fontSize: 13 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', gap: 15, marginHorizontal: 15 },
  qtyBtn: { fontSize: 24, color: colors.primary, fontWeight: 'bold' },
  qtyText: { fontSize: 16, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },
  totalBox: { backgroundColor: colors.surface, padding: 20, borderRadius: 15, marginTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grandTotal: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  productItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
});

