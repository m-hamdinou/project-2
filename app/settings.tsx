import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Store,
  Globe,
  CircleDollarSign,
  RefreshCw,
  HelpCircle,
  LogOut,
  ChevronRight,
  X,
  Key,
  ShieldCheck,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, isRTL, language, setLanguage } = useLanguage();
  const { user, logout, updateProfile } = useAuth();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [shopName, setShopName] = useState(user?.shop_name || '');
  const [shopAddress, setShopAddress] = useState(user?.shop_address || '');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    const result = await updateProfile({
      shop_name: shopName,
      shop_address: shopAddress,
    });
    setSaving(false);

    if (result.success) {
      setShowProfileModal(false);
    }
  };

  const handleChangeLanguage = async (lang: 'fr' | 'ar') => {
    await setLanguage(lang);
    setShowLanguageModal(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const SettingRow = ({
    icon: Icon,
    title,
    value,
    onPress,
    danger = false,
  }: {
    icon: typeof Store;
    title: string;
    value?: string;
    onPress: () => void;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingRow, isRTL && styles.settingRowRTL]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingLeft, isRTL && styles.settingLeftRTL]}>
        <View style={[styles.iconContainer, danger && styles.iconContainerDanger]}>
          <Icon size={20} color={danger ? colors.error : colors.primary} />
        </View>
        <Text style={[styles.settingTitle, danger && styles.settingTitleDanger, isRTL && styles.textRTL]}>
          {title}
        </Text>
      </View>
      <View style={[styles.settingRight, isRTL && styles.settingRightRTL]}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        <ChevronRight size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.textRTL]}>{t.settings.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {user?.status && (
          <View style={styles.statusBanner}>
            <ShieldCheck
              size={20}
              color={user.status === 'active' ? colors.success : user.status === 'blocked' ? colors.error : colors.warning}
            />
            <Text style={styles.statusText}>
              {user.status === 'active' && 'Compte activé'}
              {user.status === 'pending' && 'Compte en attente d\'activation'}
              {user.status === 'blocked' && 'Compte bloqué'}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <SettingRow
            icon={Store}
            title={t.settings.profile}
            value={user?.shop_name || t.appName}
            onPress={() => {
              setShopName(user?.shop_name || '');
              setShopAddress(user?.shop_address || '');
              setShowProfileModal(true);
            }}
          />
          <SettingRow
            icon={Globe}
            title={t.settings.language}
            value={language === 'fr' ? t.settings.french : t.settings.arabic}
            onPress={() => setShowLanguageModal(true)}
          />
          <SettingRow
            icon={CircleDollarSign}
            title={t.settings.currency}
            value="MRU"
            onPress={() => {}}
          />
          <SettingRow
            icon={RefreshCw}
            title={t.settings.sync}
            value={t.settings.syncNow}
            onPress={() => {}}
          />
        </View>

        <View style={styles.section}>
          {user?.role === 'admin' && (
            <SettingRow
              icon={Key}
              title="Administration"
              onPress={() => router.push('/admin')}
            />
          )}
          <SettingRow
            icon={HelpCircle}
            title={t.settings.support}
            onPress={() => {}}
          />
        </View>

        {/* Test Rapide (pour développement) */}
        {__DEV__ && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.testButton}
              onPress={() => router.push('/test')}
            >
              <Text style={styles.testButtonText}>🧪 Tests Rapides (Dev)</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <SettingRow
            icon={LogOut}
            title={t.settings.logout}
            onPress={() => setShowLogoutModal(true)}
            danger
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Fatora v1.0</Text>
          <Text style={styles.footerSubtext}>{t.slogan}</Text>
        </View>
      </ScrollView>

      <Modal visible={showProfileModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={styles.modalContent}>
                <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
                  <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t.settings.profile}</Text>
                  <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                    <X size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                >
                  <Input
                    label={t.auth.shopName}
                    value={shopName}
                    onChangeText={setShopName}
                  />
                  <Input
                    label={t.auth.shopAddress}
                    value={shopAddress}
                    onChangeText={setShopAddress}
                  />
                  <Input
                    label={t.auth.phone}
                    value={user?.phone || ''}
                    editable={false}
                  />

                  <Button
                    title={t.common.save}
                    onPress={handleSaveProfile}
                    loading={saving}
                    style={styles.modalButton}
                  />
                </ScrollView>
              </View>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showLanguageModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalContentSmall}>
              <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
                <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t.settings.language}</Text>
                <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.languageOption, language === 'fr' && styles.languageOptionActive]}
                onPress={() => handleChangeLanguage('fr')}
              >
                <Text style={[styles.languageText, language === 'fr' && styles.languageTextActive]}>
                  Francais
                </Text>
                <Text style={styles.languageFlag}>FR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.languageOption, language === 'ar' && styles.languageOptionActive]}
                onPress={() => handleChangeLanguage('ar')}
              >
                <Text style={[styles.languageText, language === 'ar' && styles.languageTextActive]}>
                  العربية
                </Text>
                <Text style={styles.languageFlag}>AR</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={showLogoutModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafeAreaCenter}>
            <View style={styles.confirmModal}>
              <Text style={[styles.confirmTitle, isRTL && styles.textRTL]}>
                {t.settings.logoutConfirm}
              </Text>

              <View style={styles.confirmButtons}>
                <Button
                  title={t.common.cancel}
                  onPress={() => setShowLogoutModal(false)}
                  variant="outline"
                  style={styles.confirmButton}
                />
                <Button
                  title={t.settings.logout}
                  onPress={handleLogout}
                  variant="danger"
                  style={styles.confirmButton}
                />
              </View>
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
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingRowRTL: {
    flexDirection: 'row-reverse',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLeftRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainerDanger: {
    backgroundColor: colors.errorLight + '20',
  },
  settingTitle: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  settingTitleDanger: {
    color: colors.error,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingRightRTL: {
    flexDirection: 'row-reverse',
  },
  settingValue: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  footerSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  modalSafeAreaCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    maxHeight: '90%',
    minHeight: '50%',
  },
  modalContentSmall: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalButton: {
    marginTop: spacing.md,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  languageOptionActive: {
    backgroundColor: colors.primaryLight + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  languageText: {
    fontSize: fontSize.lg,
    color: colors.text,
  },
  languageTextActive: {
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  languageFlag: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  confirmModal: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  confirmTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmButton: {
    flex: 1,
  },
  testButton: {
    backgroundColor: colors.primary + '20',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  testButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
