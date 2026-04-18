import { useOAuth, useSignUp } from '@clerk/clerk-expo';
import { Link, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, FieldError, FormShell, Input } from '../components/ui';

type Stage = 'collect' | 'verify';

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const [stage, setStage] = useState<Stage>('collect');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onStart = useCallback(async () => {
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStage('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.');
    } finally {
      setSubmitting(false);
    }
  }, [isLoaded, signUp, email, password]);

  const onVerify = useCallback(async () => {
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      } else {
        setError('Verification incomplete.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  }, [isLoaded, signUp, setActive, code]);

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
      setError(err instanceof Error ? err.message : 'Google sign-up failed.');
    }
  }, [startOAuthFlow]);

  if (stage === 'verify') {
    return (
      <FormShell title="Check your email" subtitle={`We sent a code to ${email}.`}>
        <Input
          placeholder="Verification code"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
        />
        {error ? <FieldError>{error}</FieldError> : null}
        <Button
          label={submitting ? 'Verifying…' : 'Verify'}
          onPress={onVerify}
          disabled={submitting || !isLoaded}
        />
      </FormShell>
    );
  }

  return (
    <FormShell title="Create your account" subtitle="Sign up for Plogg It">
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
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
      />
      {error ? <FieldError>{error}</FieldError> : null}
      <Button
        label={submitting ? 'Creating account…' : 'Create account'}
        onPress={onStart}
        disabled={submitting || !isLoaded}
      />
      <Button label="Continue with Google" variant="ghost" onPress={onGoogle} />
      <View style={{ marginTop: 8, alignItems: 'center' }}>
        <Link href="/sign-in" style={{ color: '#256e45', fontSize: 14 }}>
          Already have an account? Sign in
        </Link>
      </View>
    </FormShell>
  );
}
