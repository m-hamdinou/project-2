import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Key, Plus, Copy, RefreshCw } from 'lucide-react-native';
import { colors } from '@/lib/theme/colors';
import { supabase } from '@/lib/supabase';

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

interface ActivationCode {
  id: string;
  code: string;
  used: boolean;
  used_by: string | null;
  expires_at: string;
  created_at: string;
}

export default function AdminCodesScreen() {
  const [adminKey, setAdminKey] = useState('123456');
  const [count, setCount] = useState('30');
  const [expirationDays, setExpirationDays] = useState('30');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [existingCodes, setExistingCodes] = useState<ActivationCode[]>([]);
  const [showGenerate, setShowGenerate] = useState(false);

  useEffect(() => {
    loadExistingCodes();
  }, []);

  const loadExistingCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('activation_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setExistingCodes(data || []);
    } catch (err: any) {
      console.error('Error loading codes:', err);
      Alert.alert('Erreur', 'Impossible de charger les codes');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExistingCodes();
    setRefreshing(false);
  };

  const handleGenerateCodes = async () => {
    if (!adminKey.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer la clé administrateur');
      return;
    }

    const codeCount = parseInt(count);
    const days = parseInt(expirationDays);

    if (isNaN(codeCount) || codeCount < 1 || codeCount > 1000) {
      Alert.alert('Erreur', 'Le nombre doit être entre 1 et 1000');
      return;
    }

    if (isNaN(days) || days < 1) {
      Alert.alert('Erreur', 'La durée d\'expiration doit être au moins 1 jour');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-codes`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count: codeCount,
          expirationDays: days,
          adminKey: adminKey.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate codes');
      }

      setGeneratedCodes(data.codes || []);
      Alert.alert(
        'Succès',
        `${data.count} codes générés avec succès!\n\nExpiration: ${new Date(
          data.expiresAt
        ).toLocaleDateString()}`
      );
      await loadExistingCodes();
      setShowGenerate(false);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    Alert.alert('Code', code, [
      { text: 'OK', style: 'default' }
    ]);
  };

  const handleCopyAllCodes = () => {
    const allCodes = generatedCodes.join('\n');
    Alert.alert('Tous les codes', allCodes, [
      { text: 'OK', style: 'default' }
    ]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  const stats = {
    total: existingCodes.length,
    available: existingCodes.filter(c => !c.used && !isExpired(c.expires_at)).length,
    used: existingCodes.filter(c => c.used).length,
    expired: existingCodes.filter(c => !c.used && isExpired(c.expires_at)).length,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Codes d'activation</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.backButton}>
          <RefreshCw size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.available}</Text>
            <Text style={styles.statLabel}>Disponibles</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textSecondary }]}>{stats.used}</Text>
            <Text style={styles.statLabel}>Utilisés</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.error }]}>{stats.expired}</Text>
            <Text style={styles.statLabel}>Expirés</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.generateButton}
          onPress={() => setShowGenerate(!showGenerate)}
        >
          <Plus size={20} color={colors.surface} />
          <Text style={styles.generateButtonText}>
            {showGenerate ? 'Masquer le formulaire' : 'Générer de nouveaux codes'}
          </Text>
        </TouchableOpacity>

        {showGenerate && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Configuration</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Clé administrateur</Text>
            <TextInput
              style={styles.input}
              value={adminKey}
              onChangeText={setAdminKey}
              placeholder="Entrez la clé admin"
              secureTextEntry
              editable={!loading}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre de codes</Text>
            <TextInput
              style={styles.input}
              value={count}
              onChangeText={setCount}
              placeholder="30"
              keyboardType="numeric"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Durée de validité (jours)</Text>
            <TextInput
              style={styles.input}
              value={expirationDays}
              onChangeText={setExpirationDays}
              placeholder="30"
              keyboardType="numeric"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleGenerateCodes}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.submitButtonText}>Générer</Text>
            )}
          </TouchableOpacity>
        </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Codes existants</Text>

          {existingCodes.length === 0 ? (
            <View style={styles.emptyState}>
              <Key size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Aucun code d'activation</Text>
            </View>
          ) : (
            <View style={styles.codesList}>
              {existingCodes.map((item) => {
                const expired = isExpired(item.expires_at);
                const status = item.used ? 'used' : expired ? 'expired' : 'available';

                return (
                  <View key={item.id} style={styles.codeCard}>
                    <View style={styles.codeHeader}>
                      <Text style={styles.codeText}>{item.code}</Text>
                      <View style={[styles.statusBadge, styles[`status_${status}`]]}>
                        <Text style={styles.statusText}>
                          {status === 'used' ? 'Utilisé' : status === 'expired' ? 'Expiré' : 'Disponible'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.codeDetails}>
                      <Text style={styles.codeDetailText}>
                        Expire: {formatDate(item.expires_at)}
                      </Text>
                      {item.used && item.used_by && (
                        <Text style={styles.codeDetailText}>
                          Utilisé par: {item.used_by}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleCopyCode(item.code)}
                      style={styles.copyButton}
                    >
                      <Copy size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  generateButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
    minHeight: 48,
  },
  generateButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
    minHeight: 48,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  codesList: {
    gap: spacing.md,
  },
  codeCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  status_available: {
    backgroundColor: colors.success + '20',
  },
  status_used: {
    backgroundColor: colors.textSecondary + '20',
  },
  status_expired: {
    backgroundColor: colors.error + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  codeDetails: {
    gap: spacing.xs,
  },
  codeDetailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  copyButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
  },
});
