import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Banknote, Smartphone, CreditCard, CircleDollarSign } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';
import { useAuth, supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataCache } from '@/lib/cache/DataCache';

type PaymentType = 'total' | 'partial' | 'unpaid';
type PaymentMethod = 'CASH' | 'BANKILY' | 'SEDAD' | 'CLICK' | 'BAMIS' | 'OTHER';

interface InvoiceData {
  clientName: string;
  clientPhone: string;
  items: Array<{
    id: string;
    productId?: string;
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  discount: number;
  notes: string;
  subtotal: number;
  total: number;
}

const DRAFT_KEY = '@fatora_invoice_draft';

const PAYMENT_METHODS: { key: PaymentMethod; icon: typeof Banknote }[] = [
  { key: 'CASH', icon: Banknote },
  { key: 'BANKILY', icon: Smartphone },
  { key: 'SEDAD', icon: Smartphone },
  { key: 'CLICK', icon: Smartphone },
  { key: 'BAMIS', icon: CreditCard },
  { key: 'OTHER', icon: CircleDollarSign },
];

export default function PaymentScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();

  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('total');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [partialAmount, setPartialAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInvoiceData();
  }, []);

  const loadInvoiceData = async () => {
    const data = await AsyncStorage.getItem(DRAFT_KEY);
    if (data) {
      setInvoiceData(JSON.parse(data));
    } else {
      router.back();
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t.common.currency}`;
  };

  const getMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'CASH': return t.payment.cash;
      case 'BANKILY': return t.payment.bankily;
      case 'SEDAD': return t.payment.sedad;
      case 'CLICK': return t.payment.click;
      case 'BAMIS': return t.payment.bamis;
      case 'OTHER': return t.payment.other;
    }
  };

  const getMethodColor = (method: PaymentMethod) => {
    switch (method) {
      case 'CASH': return colors.cash;
      case 'BANKILY': return colors.bankily;
      case 'SEDAD': return colors.sedad;
      case 'CLICK': return colors.click;
      case 'BAMIS': return colors.bamis;
      case 'OTHER': return colors.other;
    }
  };

  const calculatePayment = () => {
    if (!invoiceData) return { paid: 0, remaining: 0, status: 'UNPAID' };

    const total = invoiceData.total;
    let paid = 0;
    let remaining = total;
    let status = 'UNPAID';

    switch (paymentType) {
      case 'total':
        paid = total;
        remaining = 0;
        status = 'PAID';
        break;
      case 'partial':
        paid = parseFloat(partialAmount) || 0;
        remaining = total - paid;
        status = 'PARTIAL';
        break;
      case 'unpaid':
        paid = 0;
        remaining = total;
        status = 'UNPAID';
        break;
    }

    return { paid, remaining: Math.max(0, remaining), status };
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `FAT-${year}${month}-${random}`;
  };

  const handleConfirm = async () => {
    if (!invoiceData || !user) return;

    setError('');

    if (paymentType === 'partial') {
      const amount = parseFloat(partialAmount);
      if (isNaN(amount) || amount <= 0 || amount >= invoiceData.total) {
        setError(t.payment.invalidAmount);
        return;
      }
    }

    setLoading(true);

    try {
      const { paid, remaining, status } = calculatePayment();
      const invoiceNumber = generateInvoiceNumber();

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          client_name: invoiceData.clientName,
          client_phone: invoiceData.clientPhone,
          invoice_number: invoiceNumber,
          total_amount: invoiceData.total,
          discount: invoiceData.discount,
          paid_amount_total: paid,
          remaining_amount: remaining,
          status,
          due_date: dueDate?.toISOString().split('T')[0] || null,
          notes: invoiceData.notes,
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        setError(`Erreur lors de la création de la facture: ${invoiceError.message}`);
        setLoading(false);
        return;
      }

      const itemsToInsert = invoiceData.items.map((item) => ({
        invoice_id: invoice.id,
        product_id: item.productId || null,
        name: item.name,
        qty: item.qty,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating invoice items:', itemsError);
        setError(`Erreur lors de l'ajout des articles: ${itemsError.message}`);
        setLoading(false);
        return;
      }

      if (paid > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            invoice_id: invoice.id,
            user_id: user.id,
            amount: paid,
            method: paymentMethod,
          });

        if (paymentError) {
          console.error('Error creating payment:', paymentError);
          setError(`Erreur lors de l'enregistrement du paiement: ${paymentError.message}`);
          setLoading(false);
          return;
        }
      }

      // Mise à jour du stock
      for (const item of invoiceData.items) {
        if (item.productId) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_qty')
            .eq('id', item.productId)
            .maybeSingle();

          if (product) {
            await supabase
              .from('products')
              .update({
                stock_qty: Math.max(0, (product.stock_qty || 0) - item.qty),
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.productId);
          }
        }
      }

      await AsyncStorage.removeItem(DRAFT_KEY);
      dataCache.clear(); // ✅ Invalider le cache car le stock a changé

      const successData = {
        invoiceId: invoice.id,
        invoiceNumber,
        clientName: invoiceData.clientName,
        clientPhone: invoiceData.clientPhone,
        total: invoiceData.total,
        paid,
        remaining,
        status,
        paymentMethod,
        items: invoiceData.items,
        discount: invoiceData.discount,
        notes: invoiceData.notes,
        shopName: user.shop_name || '',
      };

      await AsyncStorage.setItem('@fatora_last_invoice', JSON.stringify(successData));
      router.replace('/invoice/success');
    } catch (err) {
      console.error('Error:', err);
      setError(t.auth.connectionRequired);
    } finally {
      setLoading(false);
    }
  };

  if (!invoiceData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>{t.common.loading}</Text>
      </SafeAreaView>
    );
  }

  const { paid, remaining, status } = calculatePayment();

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.textRTL]}>{t.payment.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, isRTL && styles.textRTL]}>
            {t.invoice.total}
          </Text>
          <Text style={styles.summaryAmount}>{formatCurrency(invoiceData.total)}</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
          {t.payment.chooseType}
        </Text>

        <View style={styles.typeOptions}>
          <TouchableOpacity
            style={[styles.typeCard, paymentType === 'total' && styles.typeCardActive]}
            onPress={() => setPaymentType('total')}
          >
            <View style={[styles.typeCheck, paymentType === 'total' && styles.typeCheckActive]}>
              {paymentType === 'total' && <Check size={16} color={colors.textOnPrimary} />}
            </View>
            <Text style={[styles.typeText, paymentType === 'total' && styles.typeTextActive]}>
              {t.payment.totalPayment}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeCard, paymentType === 'partial' && styles.typeCardActive]}
            onPress={() => setPaymentType('partial')}
          >
            <View style={[styles.typeCheck, paymentType === 'partial' && styles.typeCheckActive]}>
              {paymentType === 'partial' && <Check size={16} color={colors.textOnPrimary} />}
            </View>
            <Text style={[styles.typeText, paymentType === 'partial' && styles.typeTextActive]}>
              {t.payment.partialPayment}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeCard, paymentType === 'unpaid' && styles.typeCardActive]}
            onPress={() => setPaymentType('unpaid')}
          >
            <View style={[styles.typeCheck, paymentType === 'unpaid' && styles.typeCheckActive]}>
              {paymentType === 'unpaid' && <Check size={16} color={colors.textOnPrimary} />}
            </View>
            <Text style={[styles.typeText, paymentType === 'unpaid' && styles.typeTextActive]}>
              {t.payment.unpaid}
            </Text>
          </TouchableOpacity>
        </View>

        {paymentType === 'partial' && (
          <Input
            label={t.payment.amountPaid}
            value={partialAmount}
            onChangeText={setPartialAmount}
            keyboardType="numeric"
            required
            containerStyle={styles.partialInput}
          />
        )}

        {paymentType !== 'total' && (
          <TouchableOpacity
            style={styles.dueDateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dueDateLabel, isRTL && styles.textRTL]}>
              {t.payment.dueDate}
            </Text>
            <Text style={styles.dueDateValue}>
              {dueDate ? dueDate.toLocaleDateString() : t.common.optional}
            </Text>
          </TouchableOpacity>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setDueDate(date);
            }}
          />
        )}

        {paymentType !== 'unpaid' && (
          <>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              {t.payment.chooseMethod}
            </Text>

            <View style={styles.methodGrid}>
              {PAYMENT_METHODS.map(({ key, icon: Icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.methodCard,
                    paymentMethod === key && [
                      styles.methodCardActive,
                      { borderColor: getMethodColor(key) },
                    ],
                  ]}
                  onPress={() => setPaymentMethod(key)}
                >
                  <Icon size={24} color={paymentMethod === key ? getMethodColor(key) : colors.textSecondary} />
                  <Text style={[
                    styles.methodText,
                    paymentMethod === key && { color: getMethodColor(key) },
                  ]}>
                    {getMethodLabel(key)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={styles.paymentSummary}>
          <View style={[styles.summaryRow, isRTL && styles.rowRTL]}>
            <Text style={styles.summaryRowLabel}>{t.payment.amountPaid}</Text>
            <Text style={[styles.summaryRowValue, { color: colors.success }]}>
              {formatCurrency(paid)}
            </Text>
          </View>
          <View style={[styles.summaryRow, isRTL && styles.rowRTL]}>
            <Text style={styles.summaryRowLabel}>{t.payment.remaining}</Text>
            <Text style={[styles.summaryRowValue, remaining > 0 && { color: colors.error }]}>
              {formatCurrency(remaining)}
            </Text>
          </View>
        </View>

        <Button
          title={t.payment.confirm}
          onPress={handleConfirm}
          loading={loading}
          style={styles.confirmButton}
        />

        <Button
          title={t.payment.backToInvoice}
          onPress={() => router.back()}
          variant="outline"
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingText: {
    flex: 1,
    textAlign: 'center',
    marginTop: 100,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  textRTL: {
    textAlign: 'right',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.xs,
  },
  summaryAmount: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  errorBanner: {
    backgroundColor: colors.errorLight + '30',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  typeOptions: {
    gap: spacing.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  typeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeCheckActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  typeTextActive: {
    color: colors.primary,
  },
  partialInput: {
    marginTop: spacing.md,
  },
  dueDateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  dueDateLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  dueDateValue: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  methodCard: {
    width: '31%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  methodCardActive: {
    backgroundColor: colors.surface,
  },
  methodText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  paymentSummary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  summaryRowLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  summaryRowValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  confirmButton: {
    marginBottom: spacing.md,
  },
});
