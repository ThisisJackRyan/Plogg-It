import { zodResolver } from '@hookform/resolvers/zod';
import { PasswordSchema } from '@plogg/types';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { z } from 'zod';
import { Button, FieldError, FormShell, Input } from '../components/ui';
import { supabase } from '../lib/supabase';

const NewPasswordInput = z
  .object({
    password: PasswordSchema,
    confirmPassword: PasswordSchema,
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export default function ResetPasswordScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(NewPasswordInput),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values: { password: string }) {
    setSubmitError(null);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setSubmitError(error.message);
      return;
    }
    router.replace('/');
  }

  return (
    <FormShell title="Set a new password" subtitle="You must have come from the reset email link.">
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <Input
              placeholder="New password"
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
              placeholder="Confirm new password"
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
        label={isSubmitting ? 'Updating…' : 'Update password'}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      />
    </FormShell>
  );
}
