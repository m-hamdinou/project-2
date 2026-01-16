import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FileText, Globe } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/supabase';
import { Button } from '@/components/ui';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { isAuthenticated, isLoading, isPending, isActive, isBlocked, isAdmin } = useAuth();

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (isBlocked) {
        // Blocked users cannot access the app
        return;
      } else if (isAdmin || isActive) {
        // Admins and active users go directly to the app
        router.replace('/(tabs)');
      } else if (isPending) {
        // Pending users must activate their account
        router.replace('/auth/activation');
      }
    }
  }, [isAuthenticated, isLoading, isPending, isActive, isBlocked, isAdmin]);

  if (isLoading) {
    return (
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.loadingContainer}
      >
        <View style={styles.iconCircle}>
          <FileText size={60} color={colors.primary} />
        </View>
        <Text style={styles.appName}>{t.appName}</Text>
      </LinearGradient>
    );
  }

  const toggleLanguage = async () => {
    await setLanguage(language === 'fr' ? 'ar' : 'fr');
  };

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      style={styles.container}
    >
      <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage}>
        <Globe size={20} color={colors.textOnPrimary} />
        <Text style={styles.languageText}>
          {language === 'fr' ? 'AR' : 'FR'}
        </Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <FileText size={60} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.appName, isRTL && styles.textRTL]}>
          {t.appName}
        </Text>
        <Text style={[styles.slogan, isRTL && styles.textRTL]}>
          {t.slogan}
        </Text>

        <View style={styles.buttonsContainer}>
          <Button
            title={t.auth.createAccount}
            onPress={() => router.push('/auth/register')}
            variant="secondary"
            style={styles.button}
          />
          <Button
            title={t.auth.login}
            onPress={() => router.push('/auth/login')}
            variant="outline"
            style={{ ...styles.button, ...styles.loginButton }}
            textStyle={styles.loginButtonText}
          />
        </View>
      </View>

      <View style={styles.footerContainer}>
        <Text style={styles.footer}>Fatora v1.0</Text>
        <Text style={styles.developer}>Développé par MD HAMDINOU</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  loadingText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
  },
  languageButton: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    zIndex: 10,
  },
  languageText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.xs,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.textOnPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appName: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    marginBottom: spacing.sm,
  },
  slogan: {
    fontSize: fontSize.lg,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  textRTL: {
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 320,
  },
  button: {
    marginBottom: spacing.md,
  },
  loginButton: {
    borderColor: colors.textOnPrimary,
  },
  loginButtonText: {
    color: colors.textOnPrimary,
  },
  footerContainer: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  footer: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  developer: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: fontSize.xs,
    textAlign: 'center',
    fontWeight: fontWeight.medium,
  },
});
