import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, Eye, Trash2 } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';
import { useAuth, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_phone: string;
  total_amount: number;
  discount: number;
  paid_amount_total: number;
  remaining_amount: number;
  status: string;
  due_date: string | null;
  notes: string;
  created_at: string;
}

interface InvoiceItem {
  id: string;
  name: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  paid_at: string;
}

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, isRTL, language } = useLanguage();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoiceData();
  }, [id]);

  const loadInvoiceData = async () => {
    if (!id || !user) return;

    try {
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (invoiceData) {
        setInvoice(invoiceData);

        const { data: itemsData } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', id);

        setItems(itemsData || []);

        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('invoice_id', id)
          .order('paid_at', { ascending: false });

        setPayments(paymentsData || []);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t.common.currency}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return colors.paid;
      case 'PARTIAL': return colors.partial;
      case 'UNPAID': return colors.unpaid;
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return t.payment.paid;
      case 'PARTIAL': return t.payment.partial;
      case 'UNPAID': return t.payment.unpaid;
      default: return status;
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

  const generatePdfHtml = () => {
    if (!invoice) return '';

    const direction = isRTL ? 'rtl' : 'ltr';
    const align = isRTL ? 'right' : 'left';
    const alignOpp = isRTL ? 'left' : 'right';
    const date = formatDate(invoice.created_at);

    const getStatusBadgeClass = (status: string) => {
      switch (status) {
        case 'PAID': return 'status-paid';
        case 'PARTIAL': return 'status-partial';
        case 'UNPAID': return 'status-unpaid';
        default: return 'status-paid';
      }
    };

    const itemsHtml = items.map((item, index) => `
      <tr class="${index % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td style="padding: 9px 12px; text-align: ${align}; font-size: 13px;">${item.name}</td>
        <td style="padding: 9px 12px; text-align: center; font-weight: 600; font-size: 13px;">${item.qty}</td>
        <td style="padding: 9px 12px; text-align: ${alignOpp}; color: #4B5563; font-size: 13px;">${item.unit_price.toLocaleString()} MRU</td>
        <td style="padding: 9px 12px; text-align: ${alignOpp}; font-weight: 600; color: #1F2937; font-size: 13px;">${item.line_total.toLocaleString()} MRU</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html dir="${direction}">
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 13px;
            color: #1F2937;
            background: #F9FAFB;
            padding: 20px;
            direction: ${direction};
            line-height: 1.4;
          }
          .page-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 28px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          }
          .header {
            background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
            padding: 20px 24px;
            margin: -28px -28px 24px -28px;
            border-radius: 12px 12px 0 0;
            color: white;
          }
          .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .shop-name {
            font-size: 24px;
            font-weight: 700;
            color: white;
            margin-bottom: 2px;
            letter-spacing: -0.5px;
          }
          .invoice-info {
            text-align: ${alignOpp};
          }
          .invoice-title {
            font-size: 20px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.95);
            margin-bottom: 4px;
          }
          .invoice-number {
            font-size: 15px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 3px;
          }
          .invoice-date {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
          }
          .status-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 6px;
          }
          .status-paid {
            background: rgba(4, 120, 87, 0.15);
            color: #047857;
            border: 2px solid #047857;
          }
          .status-partial {
            background: rgba(245, 158, 11, 0.2);
            color: #D97706;
            border: 2px solid #F59E0B;
          }
          .status-unpaid {
            background: rgba(239, 68, 68, 0.2);
            color: #DC2626;
            border: 2px solid #EF4444;
          }
          .separator {
            height: 1px;
            background: linear-gradient(to ${alignOpp}, rgba(229, 231, 235, 0), rgba(229, 231, 235, 1), rgba(229, 231, 235, 0));
            margin: 16px 0;
          }
          .client-section {
            background: linear-gradient(135deg, #F3F4F6 0%, #F9FAFB 100%);
            padding: 14px 16px;
            border-radius: 10px;
            margin-bottom: 16px;
            border: 1px solid #E5E7EB;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          }
          .client-label {
            font-size: 10px;
            text-transform: uppercase;
            color: #6B7280;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .client-name {
            font-size: 15px;
            font-weight: 700;
            color: #1F2937;
            margin-bottom: 2px;
          }
          .client-phone {
            font-size: 13px;
            color: #4B5563;
          }
          .section-title {
            font-size: 11px;
            text-transform: uppercase;
            color: #6B7280;
            font-weight: 700;
            letter-spacing: 0.8px;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 2px solid #E5E7EB;
          }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-bottom: 16px;
            border: 1px solid #E5E7EB;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          }
          thead {
            background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
          }
          th {
            color: white;
            padding: 10px 12px;
            text-align: ${align};
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .row-even {
            background: #FFFFFF;
          }
          .row-odd {
            background: #F9FAFB;
          }
          tr {
            transition: background-color 0.2s;
          }
          .totals-container {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 20px;
          }
          .totals {
            width: 320px;
            background: linear-gradient(135deg, #F9FAFB 0%, #FFFFFF 100%);
            padding: 16px 18px;
            border-radius: 10px;
            border: 1px solid #E5E7EB;
            box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.05);
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #E5E7EB;
            font-size: 13px;
          }
          .total-row:last-child {
            border-bottom: none;
          }
          .total-label {
            color: #6B7280;
            font-weight: 500;
          }
          .total-value {
            font-weight: 600;
            color: #1F2937;
          }
          .grand-total {
            border-top: 2px solid #1E40AF !important;
            padding-top: 10px !important;
            margin-top: 6px;
          }
          .grand-total .total-label {
            font-size: 15px;
            font-weight: 700;
            color: #1F2937;
          }
          .grand-total .total-value {
            font-size: 18px;
            font-weight: 700;
            color: #1E40AF;
          }
          .paid-value {
            color: #047857 !important;
          }
          .remaining-value {
            color: #EF4444 !important;
          }
          .footer {
            margin-top: 20px;
            padding-top: 16px;
            border-top: 2px solid #E5E7EB;
            text-align: center;
          }
          .footer-thanks {
            font-size: 15px;
            font-weight: 600;
            color: #1F2937;
            margin-bottom: 6px;
          }
          .footer-contact {
            font-size: 12px;
            color: #6B7280;
            margin-bottom: 4px;
          }
          .footer-brand {
            font-size: 10px;
            color: #9CA3AF;
            margin-top: 8px;
          }
          .footer-brand strong {
            color: #1E40AF;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <div class="header">
            <div class="header-content">
              <div>
                <div class="shop-name">${user?.shop_name || 'Fatora'}</div>
                <div class="status-badge ${getStatusBadgeClass(invoice.status)}">
                  ${getStatusLabel(invoice.status)}
                </div>
              </div>
              <div class="invoice-info">
                <div class="invoice-title">${language === 'ar' ? 'فاتورة' : 'FACTURE'}</div>
                <div class="invoice-number">#${invoice.invoice_number}</div>
                <div class="invoice-date">${date}</div>
              </div>
            </div>
          </div>

          <div class="client-section">
            <div class="client-label">${language === 'ar' ? 'العميل' : 'CLIENT'}</div>
            <div class="client-name">${invoice.client_name}</div>
            ${invoice.client_phone ? `<div class="client-phone">${invoice.client_phone}</div>` : ''}
          </div>

          <div class="separator"></div>

          <div class="section-title">${language === 'ar' ? 'تفاصيل الفاتورة' : 'DÉTAILS DE LA FACTURE'}</div>

          <table>
            <thead>
              <tr>
                <th>${language === 'ar' ? 'المادة' : 'Article'}</th>
                <th style="text-align: center;">Qté</th>
                <th style="text-align: ${alignOpp};">Prix Unit.</th>
                <th style="text-align: ${alignOpp};">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="totals-container">
            <div class="totals">
              <div class="total-row">
                <span class="total-label">${language === 'ar' ? 'المجموع الفرعي' : 'Sous-total'}</span>
                <span class="total-value">${invoice.total_amount.toLocaleString()} MRU</span>
              </div>
              <div class="total-row">
                <span class="total-label paid-value">${language === 'ar' ? 'مدفوع' : 'Payé'}</span>
                <span class="total-value paid-value">${invoice.paid_amount_total.toLocaleString()} MRU</span>
              </div>
              <div class="total-row">
                <span class="total-label remaining-value">${language === 'ar' ? 'متبقي' : 'Reste'}</span>
                <span class="total-value remaining-value">${invoice.remaining_amount.toLocaleString()} MRU</span>
              </div>
              <div class="total-row grand-total">
                <span class="total-label">${language === 'ar' ? 'المجموع النهائي' : 'TOTAL'}</span>
                <span class="total-value">${invoice.total_amount.toLocaleString()} MRU</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="footer-thanks">${language === 'ar' ? 'شكراً لك على ثقتك!' : 'Merci pour votre confiance !'}</div>
            <div class="footer-brand">${language === 'ar' ? 'تم الإنشاء بواسطة' : 'Généré par'} <strong>Fatora</strong></div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleShare = async () => {
    if (!invoice) return;
    try {
      const html = generatePdfHtml();
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleView = async () => {
    try {
      await Print.printAsync({ html: generatePdfHtml() });
    } catch (error) {
      console.error('Error viewing:', error);
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        language === 'ar'
          ? 'هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.'
          : 'Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.'
      );
      if (confirmed) {
        performDelete();
      }
    } else {
      Alert.alert(
        language === 'ar' ? 'تأكيد الحذف' : 'Confirmer la suppression',
        language === 'ar'
          ? 'هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.'
          : 'Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.',
        [
          {
            text: language === 'ar' ? 'إلغاء' : 'Annuler',
            style: 'cancel'
          },
          {
            text: language === 'ar' ? 'حذف' : 'Supprimer',
            style: 'destructive',
            onPress: performDelete
          }
        ]
      );
    }
  };

  const performDelete = async () => {
    if (!id || !user) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting invoice:', error);
        return;
      }

      router.replace('/(tabs)/invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  if (loading || !invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>{t.common.loading}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.textRTL]}>{t.invoice.details}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.invoiceHeader}>
          <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          <Text style={styles.invoiceDate}>{formatDate(invoice.created_at)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
              {getStatusLabel(invoice.status)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t.invoice.client}</Text>
          <View style={styles.card}>
            <Text style={[styles.clientName, isRTL && styles.textRTL]}>{invoice.client_name}</Text>
            {invoice.client_phone && (
              <Text style={[styles.clientPhone, isRTL && styles.textRTL]}>{invoice.client_phone}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t.invoice.articles}</Text>
          <View style={styles.card}>
            {items.map((item) => (
              <View key={item.id} style={[styles.itemRow, isRTL && styles.rowRTL]}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, isRTL && styles.textRTL]}>{item.name}</Text>
                  <Text style={styles.itemQty}>x{item.qty} @ {formatCurrency(item.unit_price)}</Text>
                </View>
                <Text style={styles.itemTotal}>{formatCurrency(item.line_total)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.totalsCard}>
          {invoice.discount > 0 && (
            <View style={[styles.totalRow, isRTL && styles.rowRTL]}>
              <Text style={styles.totalLabel}>{t.invoice.discount}</Text>
              <Text style={[styles.totalValue, { color: colors.error }]}>
                -{formatCurrency(invoice.discount)}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, isRTL && styles.rowRTL]}>
            <Text style={styles.grandTotalLabel}>{t.invoice.total}</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total_amount)}</Text>
          </View>
          <View style={[styles.totalRow, isRTL && styles.rowRTL]}>
            <Text style={styles.totalLabel}>{t.payment.amountPaid}</Text>
            <Text style={[styles.totalValue, { color: colors.success }]}>
              {formatCurrency(invoice.paid_amount_total)}
            </Text>
          </View>
          <View style={[styles.totalRow, isRTL && styles.rowRTL]}>
            <Text style={styles.totalLabel}>{t.payment.remaining}</Text>
            <Text style={[styles.totalValue, invoice.remaining_amount > 0 && { color: colors.error }]}>
              {formatCurrency(invoice.remaining_amount)}
            </Text>
          </View>
        </View>

        {payments.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              {t.payment.title}
            </Text>
            <View style={styles.card}>
              {payments.map((payment) => (
                <View key={payment.id} style={[styles.paymentRow, isRTL && styles.rowRTL]}>
                  <View>
                    <Text style={styles.paymentMethod}>{getMethodLabel(payment.method)}</Text>
                    <Text style={styles.paymentDate}>{formatDate(payment.paid_at)}</Text>
                  </View>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={24} color={colors.primary} />
            <Text style={styles.actionText}>{t.invoice.shareAsPdf}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleView}>
            <Eye size={24} color={colors.info} />
            <Text style={styles.actionText}>{t.invoice.viewPdf}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Trash2 size={24} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>{t.common.delete}</Text>
          </TouchableOpacity>
        </View>

        {invoice.status !== 'PAID' && (
          <Button
            title={t.payment.addPayment}
            onPress={() => router.push(`/(tabs)/debts`)}
            style={styles.addPaymentButton}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingText: {
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
  invoiceHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  invoiceNumber: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  invoiceDate: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  clientName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  clientPhone: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  itemQty: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  itemTotal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  totalsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  grandTotalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentMethod: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  paymentDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  paymentAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginTop: spacing.xs,
  },
  addPaymentButton: {
    marginBottom: spacing.lg,
  },
});
