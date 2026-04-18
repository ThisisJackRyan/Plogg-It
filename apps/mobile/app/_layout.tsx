import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Mapbox from '@rnmapbox/maps';
import { Providers } from '../components/Providers';
import { env } from '../lib/env';

// One-time Mapbox init. Must run before any <MapView> mounts.
Mapbox.setAccessToken(env.MAPBOX_TOKEN);

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
        <Stack.Screen name="sign-up" options={{ title: 'Sign up' }} />
      </Stack>
    </Providers>
  );
}
