import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  Home,
  ScanBarcode,
  Plus,
  Package,
  FileText,
  Wallet,
  BarChart3,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useAuth } from '@/lib/supabase';

export default function TestScreen() {
  const { user, isAdmin } = useAuth();
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({});

  const markTestPassed = (testId: string) => {
    setTestResults({ ...testResults, [testId]: true });
  };

  const TestButton = ({
    icon: Icon,
    title,
    description,
    onPress,
    testId,
  }: {
    icon: any;
    title: string;
    description: string;
    onPress: () => void;
    testId: string;
  }) => {
    const passed = testResults[testId];

    return (
      <TouchableOpacity
        style={[styles.testButton, passed && styles.testButtonPassed]}
        onPress={() => {
          onPress();
          markTestPassed(testId);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.testButtonLeft}>
          <View style={[styles.iconContainer, passed && styles.iconContainerPassed]}>
            <Icon size={24} color={passed ? colors.success : colors.primary} />
          </View>
          <View style={styles.testButtonContent}>
            <Text style={styles.testButtonTitle}>{title}</Text>
            <Text style={styles.testButtonDescription}>{description}</Text>
          </View>
        </View>
        {passed && <CheckCircle2 size={20} color={colors.success} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Rapide</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🧪 Tests Smoke</Text>
          <Text style={styles.infoText}>
            Testez rapidement les fonctionnalités principales de l'application.
            Cliquez sur chaque test pour l'exécuter.
          </Text>
          {user && (
            <View style={styles.userInfo}>
              <Text style={styles.userInfoText}>
                Utilisateur : {user.shop_name || user.phone}
              </Text>
              {isAdmin && <Text style={styles.adminBadge}>👑 Admin</Text>}
            </View>
          )}
        </View>

        {/* Tests Navigation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Navigation</Text>

          <TestButton
            icon={Home}
            title="Page d'accueil"
            description="Ouvrir l'onglet Accueil"
            onPress={() => router.push('/(tabs)/')}
            testId="nav-home"
          />

          <TestButton
            icon={FileText}
            title="Factures"
            description="Ouvrir l'onglet Factures"
            onPress={() => router.push('/(tabs)/invoices')}
            testId="nav-invoices"
          />

          <TestButton
            icon={Package}
            title="Stock"
            description="Ouvrir l'onglet Stock"
            onPress={() => router.push('/(tabs)/stock')}
            testId="nav-stock"
          />

          <TestButton
            icon={Wallet}
            title="Dettes"
            description="Ouvrir l'onglet Dettes"
            onPress={() => router.push('/(tabs)/debts')}
            testId="nav-debts"
          />

          <TestButton
            icon={BarChart3}
            title="Statistiques"
            description="Ouvrir l'onglet Stats"
            onPress={() => router.push('/(tabs)/stats')}
            testId="nav-stats"
          />
        </View>

        {/* Tests Fonctionnalités */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fonctionnalités</Text>

          <TestButton
            icon={ScanBarcode}
            title="Scanner"
            description="Tester le scanner (caméra ou saisie manuelle)"
            onPress={() => {
              router.push('/(tabs)/stock');
              setTimeout(() => {
                // L'utilisateur devra cliquer sur le bouton scanner dans la page stock
                alert('Cliquez sur l\'icône scanner dans la page Stock');
              }, 500);
            }}
            testId="func-scanner"
          />

          <TestButton
            icon={Plus}
            title="Ajouter un article"
            description="Ouvrir le formulaire d'ajout d'article"
            onPress={() => router.push('/stock/add')}
            testId="func-add-product"
          />

          <TestButton
            icon={FileText}
            title="Nouvelle facture"
            description="Créer une nouvelle facture"
            onPress={() => router.push('/invoice/new')}
            testId="func-new-invoice"
          />
        </View>

        {/* Tests Admin */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>

            <TestButton
              icon={Package}
              title="Panneau Admin"
              description="Accéder au panneau d'administration"
              onPress={() => router.push('/admin')}
              testId="admin-panel"
            />
          </View>
        )}

        {/* Résultats */}
        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>
            ✅ Tests réussis : {Object.keys(testResults).length}
          </Text>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => setTestResults({})}
          >
            <Text style={styles.resetButtonText}>Réinitialiser</Text>
          </TouchableOpacity>
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
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  infoCard: {
    backgroundColor: colors.primary + '15',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  userInfoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  adminBadge: {
    fontSize: fontSize.xs,
    color: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    fontWeight: fontWeight.bold,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  testButtonPassed: {
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  testButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainerPassed: {
    backgroundColor: colors.success + '20',
  },
  testButtonContent: {
    flex: 1,
  },
  testButtonTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  testButtonDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  resultsCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
    marginBottom: spacing.md,
  },
  resetButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
});
