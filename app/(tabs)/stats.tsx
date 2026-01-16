import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, Pressable, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Clock, ChartBar as BarChart3, Calendar, ChevronDown, X, ListFilter as Filter } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';
import { useAuth, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';

type Period = 'day' | 'week' | 'month' | 'year' | 'custom';

interface Stats {
  totalCollected: number;
  totalInvoiced: number;
  totalUnpaid: number;
  paymentMethods: Record<string, number>;
  topClients: Array<{ name: string; total: number }>;
  topProducts: Array<{ name: string; qty: number; total: number }>;
}

export default function StatsScreen() {
  const { t, isRTL, language } = useLanguage();
  const { user } = useAuth();

  const currentDate = new Date();
  const [period, setPeriod] = useState<Period>('month');
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [showCustomFilter, setShowCustomFilter] = useState(false);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [stats, setStats] = useState<Stats>({
    totalCollected: 0,
    totalInvoiced: 0,
    totalUnpaid: 0,
    paymentMethods: {},
    topClients: [],
    topProducts: [],
  });
  const [refreshing, setRefreshing] = useState(false);

  const getDateRange = (p: Period): { start: string; end?: string } => {
    const now = new Date();
    const start = new Date();

    switch (p) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        return { start: start.toISOString() };
      case 'week':
        start.setDate(now.getDate() - 7);
        return { start: start.toISOString() };
      case 'month':
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
        return {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString()
        };
      case 'year':
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        return {
          start: yearStart.toISOString(),
          end: yearEnd.toISOString()
        };
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return {
            start: start.toISOString(),
            end: end.toISOString()
          };
        }
        return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
      default:
        return { start: start.toISOString() };
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const dateRange = getDateRange(period);

      let query = supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', dateRange.start);

      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end);
      }

      const { data: invoices } = await query;

      const totalInvoiced = invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
      const totalCollected = invoices?.reduce((sum, inv) => sum + inv.paid_amount_total, 0) || 0;
      const totalUnpaid = invoices?.reduce((sum, inv) => sum + inv.remaining_amount, 0) || 0;

      let paymentQuery = supabase
        .from('payments')
        .select('method, amount')
        .eq('user_id', user.id)
        .gte('created_at', dateRange.start);

      if (dateRange.end) {
        paymentQuery = paymentQuery.lte('created_at', dateRange.end);
      }

      const { data: payments } = await paymentQuery;

      const paymentMethods: Record<string, number> = {};
      payments?.forEach((p) => {
        paymentMethods[p.method] = (paymentMethods[p.method] || 0) + p.amount;
      });

      const clientTotals: Record<string, number> = {};
      invoices?.forEach((inv) => {
        clientTotals[inv.client_name] = (clientTotals[inv.client_name] || 0) + inv.total_amount;
      });
      const topClients = Object.entries(clientTotals)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      const invoiceIds = invoices?.map((inv) => inv.id) || [];
      let topProducts: Array<{ name: string; qty: number; total: number }> = [];

      if (invoiceIds.length > 0) {
        const { data: items } = await supabase
          .from('invoice_items')
          .select('name, qty, line_total')
          .in('invoice_id', invoiceIds);

        const productTotals: Record<string, { qty: number; total: number }> = {};
        items?.forEach((item) => {
          if (!productTotals[item.name]) {
            productTotals[item.name] = { qty: 0, total: 0 };
          }
          productTotals[item.name].qty += item.qty;
          productTotals[item.name].total += item.line_total;
        });
        topProducts = Object.entries(productTotals)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
      }

      setStats({
        totalCollected,
        totalInvoiced,
        totalUnpaid,
        paymentMethods,
        topClients,
        topProducts,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [user, period, selectedMonth, selectedYear, customStartDate, customEndDate])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t.common.currency}`;
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

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'CASH': return colors.cash;
      case 'BANKILY': return colors.bankily;
      case 'SEDAD': return colors.sedad;
      case 'CLICK': return colors.click;
      case 'BAMIS': return colors.bamis;
      default: return colors.other;
    }
  };

  const periods: Period[] = ['day', 'week', 'month', 'year'];

  const getPeriodLabel = (p: Period) => {
    switch (p) {
      case 'day': return t.stats.day;
      case 'week': return t.stats.week;
      case 'month': return t.stats.month;
      case 'year': return t.stats.year;
      case 'custom': return language === 'ar' ? 'مخصص' : 'Personnalisé';
    }
  };

  const months = [
    { value: 0, label: language === 'ar' ? 'يناير' : 'Janvier' },
    { value: 1, label: language === 'ar' ? 'فبراير' : 'Février' },
    { value: 2, label: language === 'ar' ? 'مارس' : 'Mars' },
    { value: 3, label: language === 'ar' ? 'أبريل' : 'Avril' },
    { value: 4, label: language === 'ar' ? 'مايو' : 'Mai' },
    { value: 5, label: language === 'ar' ? 'يونيو' : 'Juin' },
    { value: 6, label: language === 'ar' ? 'يوليو' : 'Juillet' },
    { value: 7, label: language === 'ar' ? 'أغسطس' : 'Août' },
    { value: 8, label: language === 'ar' ? 'سبتمبر' : 'Septembre' },
    { value: 9, label: language === 'ar' ? 'أكتوبر' : 'Octobre' },
    { value: 10, label: language === 'ar' ? 'نوفمبر' : 'Novembre' },
    { value: 11, label: language === 'ar' ? 'ديسمبر' : 'Décembre' },
  ];

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - i);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const getPeriodSummary = () => {
    switch (period) {
      case 'day':
        return language === 'ar' ? 'اليوم' : 'Aujourd\'hui';
      case 'week':
        return language === 'ar' ? 'آخر 7 أيام' : 'Derniers 7 jours';
      case 'month':
        return `${months[selectedMonth].label} ${selectedYear}`;
      case 'year':
        return `${selectedYear}`;
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`;
        }
        return language === 'ar' ? 'فترة مخصصة' : 'Période personnalisée';
      default:
        return '';
    }
  };

  const handleApplyCustomFilter = () => {
    if (customStartDate && customEndDate) {
      setPeriod('custom');
      setShowCustomFilter(false);
    }
  };

  const handleResetCustomFilter = () => {
    setCustomStartDate('');
    setCustomEndDate('');
    setPeriod('month');
    setShowCustomFilter(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.title, isRTL && styles.textRTL]}>{t.stats.title}</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowCustomFilter(true)}
        >
          <Filter size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.periodSelector, isRTL && styles.periodSelectorRTL]}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[
              styles.periodButtonText,
              period === p && styles.periodButtonTextActive
            ]}>
              {getPeriodLabel(p)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {(period === 'month' || period === 'year') && (
        <View style={styles.selectorContainer}>
          {period === 'month' && (
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowMonthYearPicker(true)}
            >
              <Calendar size={20} color={colors.primary} />
              <Text style={styles.dateSelectorText}>
                {`${months[selectedMonth].label} ${selectedYear}`}
              </Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {period === 'year' && (
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowYearPicker(true)}
            >
              <Calendar size={20} color={colors.primary} />
              <Text style={styles.dateSelectorText}>{selectedYear}</Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.periodSummaryContainer}>
        <Text style={[styles.periodSummary, isRTL && styles.textRTL]}>
          {language === 'ar' ? 'الفترة: ' : 'Période : '}
          <Text style={styles.periodSummaryValue}>{getPeriodSummary()}</Text>
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.mainStats}>
          <View style={[styles.statCard, styles.statCardPrimary, { backgroundColor: colors.successLight + '20', borderColor: colors.success }]}>
            <TrendingUp size={32} color={colors.success} />
            <Text style={styles.statValue}>{formatCurrency(stats.totalCollected)}</Text>
            <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{t.stats.totalCollected}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.infoLight + '20', borderColor: colors.info }]}>
            <BarChart3 size={28} color={colors.info} />
            <Text style={styles.statValue}>{formatCurrency(stats.totalInvoiced)}</Text>
            <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{t.stats.totalInvoiced}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.errorLight + '20', borderColor: colors.error }]}>
            <Clock size={28} color={colors.error} />
            <Text style={styles.statValue}>{formatCurrency(stats.totalUnpaid)}</Text>
            <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{t.stats.totalUnpaid}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {t.stats.paymentMethods}
          </Text>
          <View style={styles.methodsContainer}>
            {Object.entries(stats.paymentMethods).length === 0 ? (
              <Text style={styles.noData}>{t.stats.noData}</Text>
            ) : (
              Object.entries(stats.paymentMethods).map(([method, amount]) => (
                <View key={method} style={styles.methodItem}>
                  <View style={[styles.methodBar, { backgroundColor: getMethodColor(method) }]}>
                    <Text style={styles.methodAmount}>{formatCurrency(amount)}</Text>
                  </View>
                  <Text style={styles.methodLabel}>{getMethodLabel(method)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {t.stats.topClients}
          </Text>
          {stats.topClients.length === 0 ? (
            <Text style={styles.noData}>{t.stats.noData}</Text>
          ) : (
            stats.topClients.map((client, index) => (
              <View key={client.name} style={[styles.listItem, isRTL && styles.rowRTL]}>
                <View style={styles.listRank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <Text style={[styles.listName, isRTL && styles.textRTL]}>{client.name}</Text>
                <Text style={styles.listValue}>{formatCurrency(client.total)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {t.stats.topProducts}
          </Text>
          {stats.topProducts.length === 0 ? (
            <Text style={styles.noData}>{t.stats.noData}</Text>
          ) : (
            stats.topProducts.map((product, index) => (
              <View key={product.name} style={[styles.listItem, isRTL && styles.rowRTL]}>
                <View style={styles.listRank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.listInfo}>
                  <Text style={[styles.listName, isRTL && styles.textRTL]}>{product.name}</Text>
                  <Text style={[styles.listQty, isRTL && styles.textRTL]}>x{product.qty}</Text>
                </View>
                <Text style={styles.listValue}>{formatCurrency(product.total)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showCustomFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.customFilterModal}>
              <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
                <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>
                  {t.stats.customPeriod}
                </Text>
                <TouchableOpacity onPress={() => setShowCustomFilter(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.customFilterContent}>
                <View style={styles.dateInputContainer}>
                  <Text style={[styles.dateLabel, isRTL && styles.textRTL]}>
                    {t.stats.startDate}
                  </Text>
                  <TextInput
                    style={[styles.dateInput, isRTL && styles.textRTL]}
                    placeholder="YYYY-MM-DD"
                    value={customStartDate}
                    onChangeText={setCustomStartDate}
                  />
                </View>

                <View style={styles.dateInputContainer}>
                  <Text style={[styles.dateLabel, isRTL && styles.textRTL]}>
                    {t.stats.endDate}
                  </Text>
                  <TextInput
                    style={[styles.dateInput, isRTL && styles.textRTL]}
                    placeholder="YYYY-MM-DD"
                    value={customEndDate}
                    onChangeText={setCustomEndDate}
                  />
                </View>

                <View style={styles.customFilterButtons}>
                  <Button
                    title={t.stats.reset}
                    onPress={handleResetCustomFilter}
                    variant="outline"
                    style={styles.customFilterButton}
                  />
                  <Button
                    title={t.stats.apply}
                    onPress={handleApplyCustomFilter}
                    style={styles.customFilterButton}
                  />
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={showMonthYearPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthYearPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMonthYearPicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t.stats.selectMonthYear}
              </Text>
              <TouchableOpacity onPress={() => setShowMonthYearPicker(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthYearPickerContent}>
              <ScrollView style={styles.pickerScroll}>
                {months.map((month) => (
                  <TouchableOpacity
                    key={month.value}
                    style={[
                      styles.pickerItem,
                      selectedMonth === month.value && styles.pickerItemActive
                    ]}
                    onPress={() => {
                      setSelectedMonth(month.value);
                    }}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      selectedMonth === month.value && styles.pickerItemTextActive
                    ]}>
                      {month.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView style={styles.pickerScroll}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.pickerItem,
                      selectedYear === year && styles.pickerItemActive
                    ]}
                    onPress={() => {
                      setSelectedYear(year);
                    }}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      selectedYear === year && styles.pickerItemTextActive
                    ]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.pickerFooter}>
              <Button
                title={t.common.confirm}
                onPress={() => setShowMonthYearPicker(false)}
              />
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showYearPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowYearPicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'ar' ? 'اختر السنة' : 'Choisir l\'année'}
              </Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScroll}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.pickerItem,
                    selectedYear === year && styles.pickerItemActive
                  ]}
                  onPress={() => {
                    setSelectedYear(year);
                    setShowYearPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    selectedYear === year && styles.pickerItemTextActive
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textRTL: {
    textAlign: 'right',
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 30,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  periodSelectorRTL: {
    flexDirection: 'row-reverse',
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
  },
  selectorContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  periodSummaryContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  periodSummary: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  periodSummaryValue: {
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  mainStats: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 2,
    minHeight: 140,
    justifyContent: 'center',
  },
  statCardPrimary: {
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  statLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  methodsContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  methodItem: {
    marginBottom: spacing.md,
  },
  methodBar: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  methodAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  methodLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  noData: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    padding: spacing.lg,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  listRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rankText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  listQty: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  listValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSafeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  customFilterModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
  },
  customFilterContent: {
    padding: spacing.lg,
  },
  dateInputContainer: {
    marginBottom: spacing.lg,
  },
  dateLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  dateInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  customFilterButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  customFilterButton: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    margin: spacing.lg,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  monthYearPickerContent: {
    flexDirection: 'row',
    maxHeight: 400,
    gap: spacing.sm,
  },
  pickerScroll: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemActive: {
    backgroundColor: colors.primaryLight + '30',
  },
  pickerItemText: {
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
  },
  pickerItemTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  pickerFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
