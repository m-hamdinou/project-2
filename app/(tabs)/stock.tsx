import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Modal, Platform, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Package, AlertTriangle, X, Minus, Trash2, Zap } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';
import { useAuth, supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { BarcodeScannerWeb } from '@/components/BarcodeScannerWeb';
import { useBarcodeHandler } from '@/features/scanner/useBarcodeHandler';
import { useStock, Product } from '@/features/stock/useStock';
import { ProductQuickAddBottomSheet } from '@/components/ProductQuickAddBottomSheet';

// ✅ Composant optimisé avec React.memo pour éviter les re-renders inutiles
const ProductCard = React.memo(({ 
  item, 
  isRTL, 
  onAddStock, 
  onRemoveStock, 
  onDelete, 
  formatCurrency, 
  stockStatus 
}: { 
  item: Product, 
  isRTL: boolean, 
  onAddStock: (p: Product) => void,
  onRemoveStock: (p: Product) => void,
  onDelete: (p: Product) => void,
  formatCurrency: (a: number) => string,
  stockStatus: string
}) => (
      <View style={styles.productCard}>
        <View style={[styles.productHeader, isRTL && styles.rowRTL]}>
          <View style={styles.productInfo}>
            <Text style={[styles.productName, isRTL && styles.textRTL]}>{item.name}</Text>
            {!!item.category && (
              <Text style={[styles.productCategory, isRTL && styles.textRTL]}>{item.category}</Text>
            )}
          </View>
          <Text style={styles.productPrice}>{formatCurrency(item.price_sell)}</Text>
        </View>

        <View style={[styles.stockRow, isRTL && styles.rowRTL]}>
          <View style={[styles.stockInfo, isRTL && styles.rowRTL]}>
            {(stockStatus === 'out' || stockStatus === 'low') && (
              <AlertTriangle
                size={16}
                color={stockStatus === 'out' ? colors.error : colors.warning}
              />
            )}
            <Text
              style={[
                styles.stockQty,
                stockStatus === 'out' && styles.stockOut,
                stockStatus === 'low' && styles.stockLow,
              ]}
            >
          Stock: {item.stock_qty}
            </Text>
          </View>

          <View style={[styles.stockActions, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              style={[styles.stockButton, styles.addStockButton]}
          onPress={() => onAddStock(item)}
            >
              <Plus size={18} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stockButton, styles.removeStockButton]}
          onPress={() => onRemoveStock(item)}
            >
              <Minus size={18} color={colors.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stockButton, styles.deleteStockButton]}
          onPress={() => onDelete(item)}
            >
              <Trash2 size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
          </View>
));

export default function StockScreen() {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { getProducts, incrementStock, loading: stockLoading } = useStock();
  const { handleBarcode, isProcessing: barcodeProcessing } = useBarcodeHandler();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockAction, setStockAction] = useState<'add' | 'remove'>('add');
  const [stockQty, setStockQty] = useState('');

  // ✅ SCANNER PHOTO UNIFIÉ
  const [showScanner, setShowScanner] = useState(false);
  const [showQuickAddBottomSheet, setShowQuickAddBottomSheet] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');

  const loadProducts = useCallback(async (force = false) => {
    if (!user) return;
    try {
      const data = await getProducts(user.id, force);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }, [user, getProducts]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts(true);
    setRefreshing(false);
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.barcode && p.barcode.includes(query))
    );
  }, [products, searchQuery]);

  const formatCurrency = useCallback((amount: number) => {
    return `${amount.toLocaleString()} ${t.common.currency}`;
  }, [t.common.currency]);

  // ✅ SCAN EN MODE STOCK : Toujours ouvrir le formulaire d'enregistrement
  const handleScanDetected = (barcode: string) => {
    if (!user) return;
    
    handleBarcode({
      barcode,
      context: 'STOCK',
      userId: user.id,
      onProductFound: (product) => {
        // Produit existe déjà : ouvrir quand même le formulaire pour permettre modification
        setScannedBarcode(barcode);
        router.push({
          pathname: '/stock/add',
          params: { barcode: barcode }
        });
      },
      onProductNotFound: (code) => {
        // Nouveau produit : ouvrir le formulaire de création
        setScannedBarcode(code);
        router.push({
          pathname: '/stock/add',
          params: { barcode: code }
        });
      }
    });
  };

  const getStockStatus = useCallback((product: Product) => {
    if (product.stock_qty === 0) return 'out';
    if (product.stock_qty <= product.alert_threshold) return 'low';
    return 'ok';
  }, []);

  const openStockModal = (product: Product, action: 'add' | 'remove') => {
    setSelectedProduct(product);
    setStockAction(action);
    setStockQty('');
    setShowStockModal(true);
  };

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <ProductCard 
      item={item}
      isRTL={isRTL}
      onAddStock={(p) => openStockModal(p, 'add')}
      onRemoveStock={(p) => openStockModal(p, 'remove')}
      onDelete={handleDeleteProduct}
      formatCurrency={formatCurrency}
      stockStatus={getStockStatus(item)}
    />
  ), [isRTL, formatCurrency, getStockStatus]);

  const handleDeleteProduct = (product: Product) => {
    const confirmMsg = isRTL 
      ? `هل أنت متأكد من حذف ${product.name}؟` 
      : `Supprimer ${product.name} ?`;
      
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) performDelete(product.id);
    } else {
      Alert.alert('Confirmation', confirmMsg, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => performDelete(product.id) }
      ]);
    }
  };

  const performDelete = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) loadProducts(true);
  };

  const handleStockUpdate = async () => {
    if (!selectedProduct || !stockQty) return;
    const qty = parseInt(stockQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    const newQty = stockAction === 'add' 
      ? selectedProduct.stock_qty + qty 
      : Math.max(0, selectedProduct.stock_qty - qty);

    await supabase.from('products').update({ stock_qty: newQty }).eq('id', selectedProduct.id);
    setShowStockModal(false);
    loadProducts(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.title, isRTL && styles.textRTL]}>{t.stock.title}</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/stock/add')}>
            <Plus size={24} color={colors.textOnPrimary} />
          </TouchableOpacity>
      </View>

      <View style={styles.continuousScanContainer}>
        <TouchableOpacity
          style={styles.continuousScanButton}
          onPress={() => setShowScanner(true)}
        >
          <Zap size={24} color={colors.surface} />
          <Text style={styles.continuousScanText}>📷 SCAN CONTINU (MODE STOCK)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInput, isRTL && styles.searchInputRTL]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchTextInput, isRTL && styles.textInputRTL]}
            placeholder={t.common.search}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        windowSize={5}
        removeClippedSubviews={true}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={64} color={colors.textLight} />
            <Text style={styles.emptyTitle}>{t.stock.noProducts}</Text>
              </View>
        }
      />

      <BarcodeScannerWeb 
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onDetected={handleScanDetected}
        context="STOCK"
      />

      <ProductQuickAddBottomSheet
        visible={showQuickAddBottomSheet}
        onClose={() => setShowQuickAddBottomSheet(false)}
        onSuccess={() => loadProducts(true)}
        barcode={scannedBarcode}
      />

      {/* Modal mise à jour stock simplifiée */}
      <Modal visible={showStockModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>
              {stockAction === 'add' ? 'Ajouter' : 'Retirer'} du stock
            </Text>
            <Text style={styles.selectedProductName}>{selectedProduct?.name}</Text>
            <Input
              label="Quantité"
              value={stockQty}
              onChangeText={setStockQty}
              keyboardType="numeric"
              autoFocus
            />
            <Button
              title="Valider"
              onPress={handleStockUpdate}
              style={{ marginTop: 20 }}
            />
            <TouchableOpacity onPress={() => setShowStockModal(false)} style={{ marginTop: 15, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerRTL: { flexDirection: 'row-reverse' },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  textRTL: { textAlign: 'right' },
  addButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continuousScanContainer: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  continuousScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  continuousScanText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.surface },
  searchContainer: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInputRTL: { flexDirection: 'row-reverse' },
  searchTextInput: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, fontSize: fontSize.md, color: colors.text },
  listContent: { padding: spacing.lg, paddingTop: 0, paddingBottom: 100 },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  rowRTL: { flexDirection: 'row-reverse' },
  productInfo: { flex: 1 },
  productName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  productCategory: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  productPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stockQty: { fontSize: fontSize.sm, color: colors.text },
  stockOut: { color: colors.error, fontWeight: fontWeight.bold },
  stockLow: { color: colors.warning, fontWeight: fontWeight.bold },
  stockActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  stockButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  addStockButton: { backgroundColor: colors.success + '20' },
  removeStockButton: { backgroundColor: colors.error + '20' },
  deleteStockButton: { backgroundColor: colors.error + '10' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, marginTop: 100 },
  emptyTitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContentSmall: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.lg },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 10 },
  selectedProductName: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: 20 },
});
