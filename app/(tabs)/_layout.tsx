import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, FileText, Package, Wallet, BarChart3 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, spacing, borderRadius } from '@/lib/theme/colors';
import { useLanguage } from '@/lib/i18n';

export default function TabLayout() {
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  // ✅ STYLE FLOATING : soulève la barre du bas pour une visibilité totale
  const bottomMargin = Math.max(insets.bottom, 12);
  const totalTabBarHeight = 65 + (Platform.OS === 'ios' ? insets.bottom : 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          height: 75,
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? insets.bottom : 15,
          left: 15,
          right: 15,
          borderRadius: 25,
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          paddingBottom: 0, // Centré verticalement dans la barre flottante
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginBottom: 10,
        },
        tabBarIconStyle: {
          marginTop: 10,
        },
        tabBarItemStyle: {
          height: 75,
        },
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.home,
          tabBarIcon: ({ color, size, focused }) => (
            <Home 
              size={focused ? size + 2 : size} 
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: t.tabs.invoices,
          tabBarIcon: ({ color, size, focused }) => (
            <FileText 
              size={focused ? size + 2 : size} 
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: t.tabs.stock,
          tabBarIcon: ({ color, size, focused }) => (
            <Package 
              size={focused ? size + 2 : size} 
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: t.tabs.debts,
          tabBarIcon: ({ color, size, focused }) => (
            <Wallet 
              size={focused ? size + 2 : size} 
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t.tabs.stats,
          tabBarIcon: ({ color, size, focused }) => (
            <BarChart3 
              size={focused ? size + 2 : size} 
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}
