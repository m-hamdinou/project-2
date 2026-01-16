import React, { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { LanguageProvider } from '@/lib/i18n';
import { AuthProvider } from '@/lib/supabase';

export default function RootLayout() {
  useFrameworkReady();
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      // Si on est sur les tabs principaux, empêcher la sortie accidentelle
      const mainTabs = ['/', '/invoices', '/stock', '/debts', '/stats'];
      if (mainTabs.includes(pathname)) {
        // Laisser l'utilisateur sortir intentionnellement (double-tap nécessaire)
        return false;
      }
      // Sinon, comportement normal (navigation arrière)
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [pathname]);

  return (
    <LanguageProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="invoice" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="test" />

          {/* ✅ Modal natif iOS/Web: Ajouter produit */}
          <Stack.Screen
            name="stock/add"
            options={{ presentation: 'modal', headerShown: false }}
          />

          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </LanguageProvider>
  );
}
