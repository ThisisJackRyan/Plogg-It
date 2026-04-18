import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

/**
 * Deep-link landing screen for email verification.
 * Supabase redirects to `plogg://auth-callback?code=...` after the user taps
 * the verify link; we exchange the code for a session and route home.
 */
export default function AuthCallbackScreen() {
  const { code, error_description: errorDescription } = useLocalSearchParams<{
    code?: string;
    error_description?: string;
  }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      if (errorDescription) {
        setError(errorDescription);
        return;
      }
      if (!code) {
        setError('Missing auth code.');
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }
      router.replace('/');
    }
    void run();
  }, [code, errorDescription]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
      {error ? (
        <>
          <Text style={{ color: '#dc2626', textAlign: 'center' }}>{error}</Text>
          <Text
            style={{ color: '#256e45', marginTop: 8 }}
            onPress={() => router.replace('/login')}
          >
            Back to sign in
          </Text>
        </>
      ) : (
        <>
          <ActivityIndicator />
          <Text style={{ color: '#00000099' }}>Signing you in…</Text>
        </>
      )}
    </View>
  );
}
