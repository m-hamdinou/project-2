import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';

export default function RegisterScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { register } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!phone.trim()) {
      newErrors.phone = t.common.required;
    } else if (phone.replace(/\s/g, '').length < 8) {
      newErrors.phone = t.auth.invalidPhone;
    }

    if (!password) {
      newErrors.password = t.common.required;
    } else if (password.length < 4) {
      newErrors.password = t.common.required;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = t.auth.passwordMismatch;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    const result = await register({
      phone,
      password,
      shopName,
      shopAddress,
    });

    setLoading(false);

    if (result.success) {
      router.replace('/(tabs)');
    } else if (result.error) {
      const errorKey = result.error as keyof typeof t.auth;
      setErrors({ general: t.auth[errorKey] || result.error });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.title, isRTL && styles.textRTL]}>
            {t.auth.createAccount}
          </Text>

          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Input
              label={t.auth.phone}
              placeholder={t.auth.phonePlaceholder}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              error={errors.phone}
              required
            />

            <Input
              label={t.auth.password}
              value={password}
              onChangeText={setPassword}
              isPassword
              error={errors.password}
              required
            />

            <Input
              label={t.auth.confirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              error={errors.confirmPassword}
              required
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.common.optional}</Text>
              <View style={styles.dividerLine} />
            </View>

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

            <Button
              title={t.auth.createMyAccount}
              onPress={handleRegister}
              loading={loading}
              style={styles.submitButton}
            />

            <Button
              title={t.common.back}
              onPress={() => router.back()}
              variant="ghost"
            />
          </View>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.md,
    padding: spacing.xs,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  textRTL: {
    textAlign: 'right',
  },
  errorBanner: {
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    color: colors.errorDark,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.md,
  },
  submitButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});
