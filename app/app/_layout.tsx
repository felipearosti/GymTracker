import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout/[id]" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="report/[id]" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
    </>
  );
}
