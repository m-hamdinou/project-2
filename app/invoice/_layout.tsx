import { Stack } from 'expo-router';

export default function InvoiceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="new" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="success" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
