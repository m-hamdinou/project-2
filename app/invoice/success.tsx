import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Share2, Download, Eye, Plus, Home } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InvoiceItem {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

interface InvoiceSuccessData {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  total: number;
  paid: number;
  remaining: number;
  status: string;
  paymentMethod: string;
  items: InvoiceItem[];
  discount: number;
  notes: string;
  shopName: string;
}

export default function InvoiceSuccessScreen() {
  const router = useRouter();
  const { t, isRTL, language } = useLanguage();

  const [invoiceData, setInvoiceData] = useState<InvoiceSuccessData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInvoiceData();
  }, []);

  const loadInvoiceData = async () => {
    const data = await AsyncStorage.getItem('@fatora_last_invoice');
    if (data) {
      setInvoiceData(JSON.parse(data));
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t.common.currency}`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return language === 'ar' ? 'مدفوع' : 'PAYE';
      case 'PARTIAL': return language === 'ar' ? 'جزئي' : 'PARTIEL';
      case 'UNPAID': return language === 'ar' ? 'غير مدفوع' : 'NON PAYE';
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
    if (!invoiceData) return '';

    const direction = isRTL ? 'rtl' : 'ltr';
    const align = isRTL ? 'right' : 'left';
    const alignOpp = isRTL ? 'left' : 'right';
    const date = new Date().toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR');

    const itemsHtml = invoiceData.items.map((item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.qty}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: ${alignOpp};">${item.unitPrice.toLocaleString()} MRU</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: ${alignOpp};">${item.lineTotal.toLocaleString()} MRU</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html dir="${direction}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 14px;
            color: #333;
            padding: 40px;
            direction: ${direction};
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 3px solid #0D9488;
            padding-bottom: 20px;
          }
          .shop-name {
            font-size: 28px;
            font-weight: bold;
            color: #0D9488;
          }
          .invoice-title {
            font-size: 24px;
            color: #666;
            text-align: ${alignOpp};
          }
          .invoice-number {
            font-size: 18px;
            color: #0D9488;
            font-weight: bold;
          }
          .invoice-date {
            color: #666;
          }
          .client-section {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .client-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          .client-name {
            font-size: 18px;
            font-weight: bold;
          }
          .client-phone {
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background: #0D9488;
            color: white;
            padding: 12px;
            text-align: ${align};
          }
          th:nth-child(2), th:nth-child(3), th:nth-child(4) {
            text-align: center;
          }
          th:last-child {
            text-align: ${alignOpp};
          }
          .totals {
            margin-${align}: auto;
            width: 300px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .grand-total {
            font-size: 20px;
            font-weight: bold;
            color: #0D9488;
            border-bottom: none;
            padding-top: 12px;
          }
          .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            margin-top: 20px;
          }
          .status-paid { background: #d1fae5; color: #059669; }
          .status-partial { background: #fef3c7; color: #d97706; }
          .status-unpaid { background: #fee2e2; color: #dc2626; }
          .payment-info {
            background: #f0fdfa;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 16px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
          .thank-you {
            font-size: 18px;
            color: #0D9488;
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="shop-name">${invoiceData.shopName || 'Fatora'}</div>
          </div>
          <div style="text-align: ${alignOpp};">
            <div class="invoice-title">${language === 'ar' ? 'فاتورة' : 'FACTURE'}</div>
            <div class="invoice-number">${invoiceData.invoiceNumber}</div>
            <div class="invoice-date">${date}</div>
          </div>
        </div>

        <div class="client-section">
          <div class="client-label">${language === 'ar' ? 'العميل' : 'CLIENT'}</div>
          <div class="client-name">${invoiceData.clientName}</div>
          ${invoiceData.clientPhone ? `<div class="client-phone">${invoiceData.clientPhone}</div>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>${language === 'ar' ? 'المادة' : 'Article'}</th>
              <th>${language === 'ar' ? 'الكمية' : 'Qte'}</th>
              <th>${language === 'ar' ? 'السعر' : 'Prix'}</th>
              <th>${language === 'ar' ? 'المجموع' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          ${invoiceData.discount > 0 ? `
            <div class="total-row">
              <span>${language === 'ar' ? 'المجموع الفرعي' : 'Sous-total'}</span>
              <span>${(invoiceData.total + invoiceData.discount).toLocaleString()} MRU</span>
            </div>
            <div class="total-row">
              <span>${language === 'ar' ? 'خصم' : 'Remise'}</span>
              <span>-${invoiceData.discount.toLocaleString()} MRU</span>
            </div>
          ` : ''}
          <div class="total-row grand-total">
            <span>${language === 'ar' ? 'المجموع' : 'TOTAL'}</span>
            <span>${invoiceData.total.toLocaleString()} MRU</span>
          </div>
        </div>

        <div class="payment-info">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>${language === 'ar' ? 'المدفوع' : 'Paye'}:</strong> ${invoiceData.paid.toLocaleString()} MRU
              ${invoiceData.paid > 0 ? `<br><small>${language === 'ar' ? 'طريقة الدفع' : 'Methode'}: ${getMethodLabel(invoiceData.paymentMethod)}</small>` : ''}
            </div>
            <div>
              <strong>${language === 'ar' ? 'المتبقي' : 'Reste'}:</strong> ${invoiceData.remaining.toLocaleString()} MRU
            </div>
          </div>
          <span class="status-badge status-${invoiceData.status.toLowerCase()}">${getStatusLabel(invoiceData.status)}</span>
        </div>

        ${invoiceData.notes ? `
          <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
            <strong>${language === 'ar' ? 'ملاحظات' : 'Notes'}:</strong> ${invoiceData.notes}
          </div>
        ` : ''}

        <div class="footer">
          <div class="thank-you">${language === 'ar' ? 'شكرا لكم!' : 'Merci!'}</div>
          <div>Fatora - ${language === 'ar' ? 'فواتير سريعة وبسيطة' : 'Facturation simple et rapide'}</div>
        </div>
      </body>
      </html>
    `;
  };

  const generatePdf = async () => {
    const html = generatePdfHtml();
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  };

  const handleSharePdf = async () => {
    if (!invoiceData) return;
    setLoading(true);

    try {
      if (Platform.OS === 'web') {
        await Print.printAsync({ html: generatePdfHtml() });
      } else {
        const pdfUri = await generatePdf();
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${t.invoice.invoiceNumber} ${invoiceData.invoiceNumber}`,
        });
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoiceData) return;
    setLoading(true);

    try {
      if (Platform.OS === 'web') {
        await Print.printAsync({ html: generatePdfHtml() });
      } else {
        const pdfUri = await generatePdf();
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPdf = async () => {
    setLoading(true);
    try {
      await Print.printAsync({ html: generatePdfHtml() });
    } catch (error) {
      console.error('Error viewing PDF:', error);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.successIcon}>
          <CheckCircle size={80} color={colors.success} />
        </View>

        <Text style={[styles.title, isRTL && styles.textRTL]}>{t.invoice.created}</Text>
        <Text style={styles.invoiceNumber}>{invoiceData.invoiceNumber}</Text>

        <View style={styles.summaryCard}>
          <View style={[styles.summaryRow, isRTL && styles.rowRTL]}>
            <Text style={styles.summaryLabel}>{t.invoice.client}</Text>
            <Text style={[styles.summaryValue, isRTL && styles.textRTL]}>
              {invoiceData.clientName}
            </Text>
          </View>
          <View style={[styles.summaryRow, isRTL && styles.rowRTL]}>
            <Text style={styles.summaryLabel}>{t.invoice.total}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(invoiceData.total)}</Text>
          </View>
          <View style={[styles.summaryRow, isRTL && styles.rowRTL]}>
            <Text style={styles.summaryLabel}>{t.payment.amountPaid}</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(invoiceData.paid)}
            </Text>
          </View>
          {invoiceData.remaining > 0 && (
            <View style={[styles.summaryRow, isRTL && styles.rowRTL]}>
              <Text style={styles.summaryLabel}>{t.payment.remaining}</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                {formatCurrency(invoiceData.remaining)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleSharePdf}
            disabled={loading}
          >
            <Share2 size={28} color={colors.primary} />
            <Text style={styles.actionText}>{t.invoice.shareAsPdf}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleDownloadPdf}
            disabled={loading}
          >
            <Download size={28} color={colors.secondary} />
            <Text style={styles.actionText}>{t.invoice.downloadPdf}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleViewPdf}
            disabled={loading}
          >
            <Eye size={28} color={colors.info} />
            <Text style={styles.actionText}>{t.invoice.viewPdf}</Text>
          </TouchableOpacity>
        </View>

        <Button
          title={t.invoice.newInvoiceBtn}
          onPress={() => router.replace('/invoice/new')}
          icon={<Plus size={20} color={colors.textOnPrimary} />}
          style={styles.newInvoiceButton}
        />

        <Button
          title={t.invoice.backHome}
          onPress={() => router.replace('/(tabs)')}
          variant="outline"
          icon={<Home size={20} color={colors.primary} />}
        />
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
    flex: 1,
    textAlign: 'center',
    marginTop: 100,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  successIcon: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  textRTL: {
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: fontSize.xl,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xl,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
    width: '100%',
  },
  actionCard: {
    width: '30%',
    minWidth: 100,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  newInvoiceButton: {
    width: '100%',
    marginBottom: spacing.md,
  },
});
