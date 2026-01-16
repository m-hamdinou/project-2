import { Stack } from 'expo-router';
import { useRequireRole } from '@/lib/supabase/useRequireRole';

export default function AdminLayout() {
  // Guard: redirige automatiquement si pas admin
  useRequireRole('admin');

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="codes" />
      <Stack.Screen name="users" />
    </Stack>
  );
}
