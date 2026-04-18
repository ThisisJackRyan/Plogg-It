import { zodResolver } from '@hookform/resolvers/zod';
import { ResetPasswordInput } from '@plogg/types';
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { Button, FieldError, FormShell, Input } from '../components/ui';
import { supabase } from '../lib/supabase';

export default function ForgotPasswordScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(ResetPasswordInput),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: { email: string }) {
    setSubmitError(null);
    const redirectTo = Linking.createURL('/reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, { redirectTo });
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <FormShell title="Check your email" subtitle={`Password reset link sent to ${sentTo}`}>
        <Link href="/login" style={{ color: '#256e45', fontSize: 14, textAlign: 'center', marginTop: 16 }}>
          Back to sign in
        </Link>
      </FormShell>
    );
  }

  return (
    <FormShell title="Reset password" subtitle="We'll email you a link to set a new password">
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
      {submitError ? <Text style={{ color: '#dc2626', fontSize: 13 }}>{submitError}</Text> : null}
      <Button
        label={isSubmitting ? 'Sending…' : 'Send reset link'}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      />
      <Link href="/login" style={{ color: '#256e45', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
        Back to sign in
      </Link>
    </FormShell>
  );
}
