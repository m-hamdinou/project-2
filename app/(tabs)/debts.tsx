import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, Linking, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, MessageCircle, Eye, Plus, X, AlertCircle } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';
import { useAuth, supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';

interface DebtInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_phone: string;
  total_amount: number;
  paid_amount_total: number;
  remaining_amount: number;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface ClientDebt {
  clientName: string;
  clientPhone: string;
  totalOwed: number;
  invoices: DebtInvoice[];
}

const PAYMENT_METHODS = ['CASH', 'BANKILY', 'SEDAD', 'CLICK', 'BAMIS', 'OTHER'] as const;

export default function DebtsScreen() {
  const router = useRouter();
  const { t, isRTL, language } = useLanguage();
  const { user } = useAuth();

  const [debts, setDebts] = useState<DebtInvoice[]>([]);
  const [clientDebts, setClientDebts] = useState<ClientDebt[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<DebtInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');

  const loadDebts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['PARTIAL', 'UNPAID'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading debts:', error);
        return;
      }

      setDebts(data || []);

      const grouped = (data || []).reduce((acc: Record<string, ClientDebt>, invoice) => {
        const key = invoice.client_name;
        if (!acc[key]) {
          acc[key] = {
            clientName: invoice.client_name,
            clientPhone: invoice.client_phone || '',
            totalOwed: 0,
            invoices: [],
          };
        }
        acc[key].totalOwed += invoice.remaining_amount;
        acc[key].invoices.push(invoice);
        return acc;
      }, {});

      setClientDebts(Object.values(grouped));
    } catch (error) {
      console.error('Error loading debts:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDebts();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDebts();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t.common.currency}`;
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const sendWhatsAppReminder = (invoice: DebtInvoice) => {
    if (!invoice.client_phone) return;

    const message = language === 'ar'
      ? t.debts.reminderMessage
          .replace('{amount}', invoice.remaining_amount.toString())
          .replace('{number}', invoice.invoice_number)
      : t.debts.reminderMessage
          .replace('{amount}', invoice.remaining_amount.toString())
          .replace('{number}', invoice.invoice_number);

    const phone = invoice.client_phone.replace(/\s/g, '').replace(/^\+/, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const openPaymentModal = (invoice: DebtInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount('');
    setPaymentMethod('CASH');
    setShowPaymentModal(true);
  };

  const handleAddPayment = async () => {
    if (!selectedInvoice || !user || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedInvoice.remaining_amount) return;

    try {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: selectedInvoice.id,
          user_id: user.id,
          amount,
          method: paymentMethod,
        });

      if (paymentError) {
        console.error('Error adding payment:', paymentError);
        return;
      }

      const newPaidTotal = selectedInvoice.paid_amount_total + amount;
      const newRemaining = selectedInvoice.total_amount - newPaidTotal;
      const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          paid_amount_total: newPaidTotal,
          remaining_amount: Math.max(0, newRemaining),
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedInvoice.id);

      if (invoiceError) {
        console.error('Error updating invoice:', invoiceError);
        return;
      }

      setShowPaymentModal(false);
      setSelectedInvoice(null);
      loadDebts();
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH': return t.payment.cash;
      case 'BANKILY': return t.payment.bankily;
      case 'SEDAD': return t.payment.sedad;
      case 'CLICK': return t.payment.click;
      case 'BAMIS': return t.payment.bamis;
      case 'OTHER': return t.payment.other;
      default: return method;
    }
  };

  const renderClientDebt = ({ item }: { item: ClientDebt }) => (
    <View style={styles.clientCard}>
      <View style={[styles.clientHeader, isRTL && styles.rowRTL]}>
        <View style={styles.clientInfo}>
          <Text style={[styles.clientName, isRTL && styles.textRTL]}>{item.clientName}</Text>
          {item.clientPhone && (
            <Text style={[styles.clientPhone, isRTL && styles.textRTL]}>{item.clientPhone}</Text>
          )}
        </View>
        <View style={styles.totalOwedContainer}>
          <Text style={styles.totalOwedLabel}>{t.debts.totalOwed}</Text>
          <Text style={styles.totalOwed}>{formatCurrency(item.totalOwed)}</Text>
        </View>
      </View>

      <Text style={[styles.invoiceCountLabel, isRTL && styles.textRTL]}>
        {`${item.invoices.length} ${t.debts.invoiceCount}`}
      </Text>

      {item.invoices.map((invoice) => (
        <View key={invoice.id} style={styles.invoiceItem}>
          <View style={[styles.invoiceRow, isRTL && styles.rowRTL]}>
            <View style={styles.invoiceDetails}>
              <Text style={[styles.invoiceNumber, isRTL && styles.textRTL]}>
                {`${t.invoice.invoiceNumber} ${invoice.invoice_number}`}
              </Text>
              <Text style={styles.invoiceRemaining}>
                {formatCurrency(invoice.remaining_amount)}
              </Text>
              {invoice.due_date && (
                <View style={[styles.dueDateRow, isRTL && styles.rowRTL]}>
                  {isOverdue(invoice.due_date) && (
                    <AlertCircle size={14} color={colors.error} />
                  )}
                  <Text style={[
                    styles.dueDate,
                    isOverdue(invoice.due_date) && styles.overdue
                  ]}>
                    {t.debts.dueDate}: {new Date(invoice.due_date).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.invoiceActions, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                style={[styles.actionButton, styles.payButton]}
                onPress={() => openPaymentModal(invoice)}
              >
                <Plus size={16} color={colors.success} />
              </TouchableOpacity>
              {invoice.client_phone && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.reminderButton]}
                  onPress={() => sendWhatsAppReminder(invoice)}
                >
                  <MessageCircle size={16} color={colors.info} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.viewButton]}
                onPress={() => router.push(`/invoice/${invoice.id}`)}
              >
                <Eye size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.title, isRTL && styles.textRTL]}>{t.debts.title}</Text>
      </View>

      {clientDebts.length === 0 ? (
        <View style={styles.emptyState}>
          <Wallet size={64} color={colors.textLight} />
          <Text style={styles.emptyTitle}>{t.debts.noDebts}</Text>
        </View>
      ) : (
        <FlatList
          data={clientDebts}
          renderItem={renderClientDebt}
          keyExtractor={(item) => item.clientName}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalContent}>
              <View style={[styles.modalHeader, isRTL && styles.rowRTL]}>
                <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>
                  {t.payment.addPayment}
                </Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {selectedInvoice && (
                  <>
                    <Text style={[styles.invoiceInfo, isRTL && styles.textRTL]}>
                      {`${t.invoice.invoiceNumber} ${selectedInvoice.invoice_number}`}
                    </Text>
                    <Text style={styles.remainingInfo}>
                      {`${t.payment.remaining}: ${formatCurrency(selectedInvoice.remaining_amount)}`}
                    </Text>
                  </>
                )}

                <Input
                  label={t.payment.amountPaid}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="numeric"
                  required
                />

                <Text style={[styles.methodLabel, isRTL && styles.textRTL]}>
                  {t.payment.chooseMethod}
                </Text>
                <View style={styles.methodGrid}>
                  {PAYMENT_METHODS.map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodButton,
                        paymentMethod === method && styles.methodButtonActive,
                      ]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text style={[
                        styles.methodButtonText,
                        paymentMethod === method && styles.methodButtonTextActive,
                      ]}>
                        {getMethodLabel(method)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Button
                  title={t.common.confirm}
                  onPress={handleAddPayment}
                  style={styles.modalButton}
                />
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  textRTL: {
    textAlign: 'right',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  clientCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  clientPhone: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  totalOwedContainer: {
    alignItems: 'flex-end',
  },
  totalOwedLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  totalOwed: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  invoiceCountLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  invoiceItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceDetails: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  invoiceRemaining: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  dueDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  overdue: {
    color: colors.error,
    fontWeight: fontWeight.semibold,
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  payButton: {
    backgroundColor: colors.successLight + '30',
  },
  reminderButton: {
    backgroundColor: colors.infoLight + '30',
  },
  viewButton: {
    backgroundColor: colors.surfaceSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSafeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  invoiceInfo: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  remainingInfo: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    marginBottom: spacing.md,
  },
  methodLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  methodButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  methodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  methodButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  methodButtonTextActive: {
    color: colors.textOnPrimary,
  },
  modalButton: {
    marginTop: spacing.md,
  },
});
