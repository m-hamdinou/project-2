import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { X, Package, Plus, Hash } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { supabase } from '@/lib/supabase';

interface ProductExistsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: any;
}

export function ProductExistsModal({ visible, onClose, onSuccess, product }: ProductExistsModalProps) {
  const { t } = useLanguage();
  const [quantityToAdd, setQuantityToAdd] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setQuantityToAdd('1');
    setError('');
    onClose();
  };

  const handleAddStock = async () => {
    const qty = parseFloat(quantityToAdd);
    if (!qty || qty <= 0) {
      setError(t.stock.invalidQuantity);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newQuantity = (product.stock_qty || 0) + qty;

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_qty: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (updateError) throw updateError;

      setQuantityToAdd('1');
      onSuccess();
    } catch (err: any) {
      setError(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.stock.productExists}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.productInfo}>
              <Package size={48} color={colors.primary} />
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>
                {`${product.price_sell} ${t.common.currency}`}
              </Text>
              <Text style={styles.currentStock}>
                {`${t.stock.currentStock}: ${product.stock_qty || 0}`}
              </Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>{t.stock.quantityToAdd}</Text>
              <View style={styles.inputContainer}>
                <Plus size={20} color={colors.success} />
                <TextInput
                  style={styles.input}
                  value={quantityToAdd}
                  onChangeText={setQuantityToAdd}
                  placeholder="1"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Hash size={20} color={colors.textSecondary} />
              </View>
            </View>

            <View style={styles.resultInfo}>
              <Text style={styles.resultLabel}>{t.stock.newStock}:</Text>
              <Text style={styles.resultValue}>
                {(product.stock_qty || 0) + parseFloat(quantityToAdd || '0')}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{t.common.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.addButton]}
              onPress={handleAddStock}
              disabled={loading}
            >
              <Text style={styles.addButtonText}>
                {loading ? t.common.loading : t.stock.addToStock}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  productInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  productName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  productPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  currentStock: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  resultInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  resultLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  resultValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.success,
  },
  addButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },
});
