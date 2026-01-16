import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Settings, TrendingUp, TriangleAlert as AlertTriangle, Clock, FileText } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';
import { useAuth, supabase } from '@/lib/supabase';

interface DashboardStats {
  todaySales: number;
  pendingDebts: number;
  lowStockCount: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ todaySales: 0, pendingDebts: 0, lowStockCount: 0 });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayInvoicesResult, debtsDataResult, allProductsResult, invoicesResult] = await Promise.all([
        supabase
          .from('invoices')
          .select('paid_amount_total')
          .eq('user_id', user.id)
          .gte('created_at', today.toISOString()),

        supabase
          .from('invoices')
          .select('remaining_amount')
          .eq('user_id', user.id)
          .in('status', ['PARTIAL', 'UNPAID']),

        supabase
          .from('products')
          .select('id, stock_qty, alert_threshold')
          .eq('user_id', user.id),

        supabase
          .from('invoices')
          .select('id, invoice_number, client_name, total_amount, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const todaySales = todayInvoicesResult.data?.reduce((sum, inv) => sum + (inv.paid_amount_total || 0), 0) || 0;
      const pendingDebts = debtsDataResult.data?.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0) || 0;
      const lowStockCount = allProductsResult.data?.filter(p => p.stock_qty <= p.alert_threshold).length || 0;

      setStats({ todaySales, pendingDebts, lowStockCount });
      setRecentInvoices(invoicesResult.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return colors.paid;
      case 'PARTIAL': return colors.partial;
      case 'UNPAID': return colors.unpaid;
      default: return colors.textSecondary;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t.common.currency}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View>
          <Text style={[styles.greeting, isRTL && styles.textRTL]}>
            {t.auth.welcome}
          </Text>
          <Text style={[styles.shopName, isRTL && styles.textRTL]}>
            {user?.shop_name || t.appName}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Settings size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <TouchableOpacity
          style={styles.newInvoiceButton}
          onPress={() => router.push('/invoice/new')}
          activeOpacity={0.8}
        >
          <View style={styles.newInvoiceIcon}>
            <Plus size={32} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.newInvoiceText}>{t.home.newInvoice}</Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.successLight + '20' }]}>
            <TrendingUp size={24} color={colors.success} />
            <Text style={styles.statValue}>{formatCurrency(stats.todaySales)}</Text>
            <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{t.home.todaySales}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.warningLight + '20' }]}>
            <Clock size={24} color={colors.warning} />
            <Text style={styles.statValue}>{formatCurrency(stats.pendingDebts)}</Text>
            <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{t.home.pendingDebts}</Text>
          </View>
        </View>

        {stats.lowStockCount > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => router.push('/(tabs)/stock')}
          >
            <AlertTriangle size={24} color={colors.error} />
            <Text style={[styles.alertText, isRTL && styles.textRTL]}>
              {t.home.lowStock}: {stats.lowStockCount}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {t.home.recentInvoices}
          </Text>

          {recentInvoices.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>{t.home.noRecentInvoices}</Text>
            </View>
          ) : (
            recentInvoices.map((invoice) => (
              <TouchableOpacity
                key={invoice.id}
                style={styles.invoiceCard}
                onPress={() => router.push(`/invoice/${invoice.id}`)}
              >
                <View style={[styles.invoiceInfo, isRTL && styles.invoiceInfoRTL]}>
                  <Text style={[styles.invoiceNumber, isRTL && styles.textRTL]}>
                    {`${t.invoice.invoiceNumber} ${invoice.invoice_number}`}
                  </Text>
                  <Text style={[styles.invoiceClient, isRTL && styles.textRTL]}>
                    {invoice.client_name}
                  </Text>
                </View>
                <View style={[styles.invoiceRight, isRTL && styles.invoiceRightRTL]}>
                  <Text style={styles.invoiceAmount}>
                    {formatCurrency(invoice.total_amount)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                      {invoice.status === 'PAID' ? t.payment.paid : invoice.status === 'PARTIAL' ? t.payment.partial : t.payment.unpaid}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
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
  greeting: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  shopName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  textRTL: {
    textAlign: 'right',
  },
  settingsButton: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  newInvoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  newInvoiceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  newInvoiceText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: colors.errorLight + '20',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  alertText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.error,
    marginLeft: spacing.sm,
    fontWeight: fontWeight.medium,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  invoiceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceInfoRTL: {
    alignItems: 'flex-end',
  },
  invoiceNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  invoiceClient: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceRightRTL: {
    alignItems: 'flex-start',
  },
  invoiceAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: 4,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
