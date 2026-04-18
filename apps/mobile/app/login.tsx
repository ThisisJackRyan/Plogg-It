import { zodResolver } from '@hookform/resolvers/zod';
import { SignInInput } from '@plogg/types';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { Button, FieldError, FormShell, Input } from '../components/ui';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(SignInInput),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: { email: string; password: string }) {
    setSubmitError(null);
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    router.replace('/');
  }

  return (
    <FormShell title="Welcome back" subtitle="Sign in to Plogg It">
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
              autoComplete="current-password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </View>
        )}
      />
      {submitError ? <Text style={{ color: '#dc2626', fontSize: 13 }}>{submitError}</Text> : null}
      <Button
        label={isSubmitting ? 'Signing in…' : 'Sign in'}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Link href="/forgot-password" style={{ color: '#256e45', fontSize: 14 }}>
          Forgot password?
        </Link>
        <Link href="/signup" style={{ color: '#256e45', fontSize: 14 }}>
          Create an account
        </Link>
      </View>
    </FormShell>
  );
}
