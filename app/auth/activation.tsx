import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, MessageCircle } from 'lucide-react-native';
import { Input } from '@/components/ui';
import { colors } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/supabase/AuthContext';

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export default function ActivationScreen() {
  const { t } = useLanguage();
  const { user, session, refreshUserStatus, logout } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActivation = async () => {
    if (!code.trim()) {
      setError(t.activation?.codeRequired || 'Code d\'activation requis');
      return;
    }

    if (!session) {
      setError('Session non valide. Veuillez vous reconnecter.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const functionUrl = `${supabaseUrl}/functions/v1/activate-account`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          code: code.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Échec de l\'activation');
      }

      await refreshUserStatus();

      Alert.alert(
        t.activation?.successTitle || 'Succès',
        data.message || t.activation?.successMessage || 'Votre compte a été activé avec succès !',
      );
    } catch (err: any) {
      console.error('Activation error:', err);
      setError(err.message || t.common?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      t.activation?.contactSupport || 'Contacter le support',
      t.activation?.contactSupportMessage || 'Choisissez votre méthode de contact préférée',
      [
        {
          text: 'WhatsApp',
          onPress: () => {
            const phone = '+22231466868';
            const message = encodeURIComponent('Bonjour, j\'ai besoin d\'aide pour activer mon compte');
            const url = Platform.OS === 'ios'
              ? `whatsapp://send?phone=${phone}&text=${message}`
              : `whatsapp://send?phone=${phone}&text=${message}`;
            Linking.openURL(url).catch(() => {
              Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp');
            });
          },
        },
        {
          text: 'Email',
          onPress: () => {
            const email = 'mihamdinou@gmail.com';
            const subject = encodeURIComponent('Demande d\'activation de compte');
            const body = encodeURIComponent(`Bonjour,\n\nJ'ai besoin d'aide pour activer mon compte.\n\nTéléphone: ${user?.phone}\n\nMerci`);
            Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
          },
        },
        {
          text: t.common?.cancel || 'Annuler',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <ShieldCheck size={80} color={colors.primary} />
        </View>

        <Text style={styles.title}>
          {t.activation?.title || 'Activation requise'}
        </Text>

        <Text style={styles.description}>
          {t.activation?.description ||
            'Votre compte est en attente d\'activation. Veuillez saisir le code d\'activation fourni par l\'administrateur pour accéder à l\'application.'}
        </Text>

        <View style={styles.form}>
          <Input
            label={t.activation?.codeLabel || 'Code d\'activation'}
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase());
              setError('');
            }}
            placeholder="XXXXXXXX"
            autoCapitalize="characters"
            maxLength={8}
            editable={!loading}
          />

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.activateButton, loading && styles.activateButtonDisabled]}
            onPress={handleActivation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.activateButtonText}>
                {t.activation?.activate || 'Activer'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.supportSection}>
          <Text style={styles.supportText}>
            {t.activation?.needHelp || 'Besoin d\'aide ?'}
          </Text>

          <TouchableOpacity
            style={styles.supportButton}
            onPress={handleContactSupport}
            disabled={loading}
          >
            <MessageCircle size={20} color={colors.primary} />
            <Text style={styles.supportButtonText}>
              {t.activation?.contactSupport || 'Contacter le support'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={logout}
          disabled={loading}
        >
          <Text style={styles.signOutText}>
            {t.auth?.signOut || 'Se déconnecter'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  form: {
    marginBottom: spacing.xl,
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  activateButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.lg,
    minHeight: 48,
    justifyContent: 'center',
  },
  activateButtonDisabled: {
    opacity: 0.6,
  },
  activateButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  supportSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  supportText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  supportButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  signOutButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  signOutText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
