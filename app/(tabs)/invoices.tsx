import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, Plus, FileText } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';
import { useAuth, supabase } from '@/lib/supabase';
import { dataCache } from '@/lib/cache/DataCache';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_phone: string;
  total_amount: number;
  paid_amount_total: number;
  remaining_amount: number;
  status: string;
  created_at: string;
}

type FilterStatus = 'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID';

// ✅ Composant de carte optimisé
const InvoiceCard = React.memo(({ 
  item, 
  isRTL, 
  onPress, 
  getStatusColor, 
  getStatusLabel, 
  formatCurrency, 
  formatDate 
}: { 
  item: Invoice, 
  isRTL: boolean, 
  onPress: (id: string) => void,
  getStatusColor: (s: string) => string,
  getStatusLabel: (s: string) => string,
  formatCurrency: (a: number) => string,
  formatDate: (d: string) => string
}) => (
  <TouchableOpacity
    style={styles.invoiceCard}
    onPress={() => onPress(item.id)}
    activeOpacity={0.7}
  >
    <View style={[styles.invoiceHeader, isRTL && styles.rowRTL]}>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
          {getStatusLabel(item.status)}
        </Text>
      </View>
      <Text style={styles.invoiceDate}>{formatDate(item.created_at)}</Text>
    </View>

    <View style={[styles.invoiceBody, isRTL && styles.rowRTL]}>
      <View style={styles.invoiceInfo}>
        <Text style={[styles.invoiceNumber, isRTL && styles.textRTL]}>
          N° {item.invoice_number}
        </Text>
        <Text style={[styles.clientName, isRTL && styles.textRTL]}>
          {item.client_name}
        </Text>
      </View>
      <View style={[styles.invoiceAmounts, isRTL && styles.amountsRTL]}>
        <Text style={styles.totalAmount}>{formatCurrency(item.total_amount)}</Text>
        {item.status !== 'PAID' && (
          <Text style={styles.remainingAmount}>
            Reste: {formatCurrency(item.remaining_amount)}
          </Text>
        )}
      </View>
    </View>
  </TouchableOpacity>
));

export default function InvoicesScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadInvoices = useCallback(async (force = false) => {
    if (!user) return;

    const cacheKey = `invoices_${user.id}_${statusFilter}`;
    if (!force) {
      const cached = dataCache.get<Invoice[]>(cacheKey);
      if (cached) {
        setInvoices(cached);
        return;
      }
    }

    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setInvoices(data || []);
      dataCache.set(cacheKey, data);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  }, [user, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      loadInvoices();
    }, [loadInvoices])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices(true);
    setRefreshing(false);
  };

  const filteredInvoices = useMemo(() => {
    if (!searchQuery) return invoices;
    const query = searchQuery.toLowerCase();
    return invoices.filter(invoice => 
      invoice.client_name.toLowerCase().includes(query) ||
      invoice.invoice_number.toLowerCase().includes(query)
    );
  }, [invoices, searchQuery]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'PAID': return colors.paid;
      case 'PARTIAL': return colors.partial;
      case 'UNPAID': return colors.unpaid;
      default: return colors.textSecondary;
    }
  }, []);

  const getStatusLabel = useCallback((status: string) => {
    switch (status) {
      case 'PAID': return t.payment.paid;
      case 'PARTIAL': return t.payment.partial;
      case 'UNPAID': return t.payment.unpaid;
      default: return status;
    }
  }, [t.payment]);

  const formatCurrency = useCallback((amount: number) => {
    return `${amount.toLocaleString()} ${t.common.currency}`;
  }, [t.common.currency]);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  }, []);

  const navigateToDetail = useCallback((id: string) => {
    router.push(`/invoice/${id}`);
  }, []);

  const renderInvoice = useCallback(({ item }: { item: Invoice }) => (
    <InvoiceCard 
      item={item}
      isRTL={isRTL}
      onPress={navigateToDetail}
      getStatusColor={getStatusColor}
      getStatusLabel={getStatusLabel}
      formatCurrency={formatCurrency}
      formatDate={formatDate}
    />
  ), [isRTL, navigateToDetail, getStatusColor, getStatusLabel, formatCurrency, formatDate]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.title, isRTL && styles.textRTL]}>{t.invoice.history}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/invoice/new')}
        >
          <Plus size={24} color={colors.textOnPrimary} />
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
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? colors.textOnPrimary : colors.primary} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersRow}>
          {(['ALL', 'PAID', 'PARTIAL', 'UNPAID'] as FilterStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
                {status === 'ALL' ? t.common.all : getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoice}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        windowSize={5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FileText size={64} color={colors.textLight} />
            <Text style={styles.emptyTitle}>{t.home.noRecentInvoices}</Text>
          </View>
        }
      />
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
  searchContainer: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  searchInput: {
    flex: 1,
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
  textInputRTL: { textAlign: 'right' },
  filterButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterButtonActive: { backgroundColor: colors.primary },
  filtersRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  filterChipTextActive: { color: colors.textOnPrimary },
  listContent: { padding: spacing.lg, paddingTop: 0, paddingBottom: 100 },
  invoiceCard: {
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
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  rowRTL: { flexDirection: 'row-reverse' },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  invoiceDate: { fontSize: fontSize.sm, color: colors.textSecondary },
  invoiceBody: { flexDirection: 'row', justifyContent: 'space-between' },
  invoiceInfo: { flex: 1 },
  invoiceNumber: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  clientName: { fontSize: fontSize.md, color: colors.text, marginTop: 2 },
  invoiceAmounts: { alignItems: 'flex-end' },
  amountsRTL: { alignItems: 'flex-start' },
  totalAmount: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  remainingAmount: { fontSize: fontSize.xs, color: colors.error, marginTop: 2 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, marginTop: 100 },
  emptyTitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
});
