import { zodResolver } from '@hookform/resolvers/zod';
import { SignUpInput } from '@plogg/types';
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { Button, FieldError, FormShell, Input } from '../components/ui';
import { supabase } from '../lib/supabase';

export default function SignupScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(SignUpInput),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: { email: string; password: string }) {
    setSubmitError(null);
    // Deep-link back into the app after email verification.
    const redirectTo = Linking.createURL('/auth-callback');
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <FormShell title="Check your email" subtitle={`We sent a confirmation link to ${sentTo}`}>
        <Text style={{ fontSize: 14, color: '#00000099', textAlign: 'center', marginTop: 8 }}>
          Open the email on this device and tap the link. It will bring you back here signed in.
        </Text>
        <Link href="/login" style={{ color: '#256e45', fontSize: 14, textAlign: 'center', marginTop: 16 }}>
          Back to sign in
        </Link>
      </FormShell>
    );
  }

  return (
    <FormShell title="Create your account" subtitle="Join Plogg It">
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <Input
              placeholder="Email"
              keyboardType="email-address"
              autoComplete="email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
            />
            <FieldError>{errors.email?.message}</FieldError>
          </View>
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <Input
              placeholder="Password"
              secureTextEntry
              autoComplete="new-password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </View>
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <Input
              placeholder="Confirm password"
              secureTextEntry
              autoComplete="new-password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
            />
            <FieldError>{errors.confirmPassword?.message}</FieldError>
          </View>
        )}
      />
      {submitError ? <Text style={{ color: '#dc2626', fontSize: 13 }}>{submitError}</Text> : null}
      <Button
        label={isSubmitting ? 'Creating account…' : 'Create account'}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      />
      <Link href="/login" style={{ color: '#256e45', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
        Already have an account? Sign in
      </Link>
    </FormShell>
  );
}
