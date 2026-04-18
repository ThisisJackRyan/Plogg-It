import { useOAuth, useSignIn } from '@clerk/clerk-expo';
import { Link, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, FieldError, FormShell, Input } from '../components/ui';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(async () => {
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      } else {
        setError('Additional verification required.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  }, [isLoaded, signIn, setActive, email, password]);

  const onGoogle = useCallback(async () => {
    setError(null);
    try {
      const { createdSessionId, setActive: setActiveFromOAuth } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/'),
      });
      if (createdSessionId && setActiveFromOAuth) {
        await setActiveFromOAuth({ session: createdSessionId });
        router.replace('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    }
  }, [startOAuthFlow]);

  return (
    <FormShell title="Welcome back" subtitle="Sign in to Plogg It">
      <Input
        placeholder="Email"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        placeholder="Password"
        secureTextEntry
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
      />
      {error ? <FieldError>{error}</FieldError> : null}
      <Button
        label={submitting ? 'Signing in…' : 'Sign in'}
        onPress={onSubmit}
        disabled={submitting || !isLoaded}
      />
      <Button label="Continue with Google" variant="ghost" onPress={onGoogle} />
      <View style={{ marginTop: 8, alignItems: 'center' }}>
        <Link href="/sign-up" style={{ color: '#256e45', fontSize: 14 }}>
          Create an account
        </Link>
      </View>
    </FormShell>
  );
}
