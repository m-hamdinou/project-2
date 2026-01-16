import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { login } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!phone.trim()) {
      newErrors.phone = t.common.required;
    }

    if (!password) {
      newErrors.password = t.common.required;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    const result = await login(phone, password);
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
        <View style={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.title, isRTL && styles.textRTL]}>
            {t.auth.login}
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

            <Button
              title={t.auth.login}
              onPress={handleLogin}
              loading={loading}
              style={styles.submitButton}
            />

            <Button
              title={t.common.back}
              onPress={() => router.back()}
              variant="ghost"
            />
          </View>
        </View>
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
  content: {
    flex: 1,
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
    borderRadius: borderRadius.md,
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
  stayConnectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stayConnectedRowRTL: {
    flexDirection: 'row-reverse',
  },
  stayConnectedText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  stayConnectedTextRTL: {
    marginLeft: 0,
    marginRight: spacing.sm,
  },
  submitButton: {
    marginBottom: spacing.md,
  },
});
