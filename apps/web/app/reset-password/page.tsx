'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PasswordSchema } from '@plogg/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, FieldError, FormShell, Input } from '@/components/ui';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

const NewPasswordInput = z
  .object({
    password: PasswordSchema,
    confirmPassword: PasswordSchema,
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export default function ResetPasswordPage() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
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
    router.refresh();
  }

  return (
    <FormShell title="Set a new password" subtitle="You must have come from the reset email link.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            New password
          </label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          <FieldError>{errors.password?.message}</FieldError>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
            Confirm new password
          </label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
          <FieldError>{errors.confirmPassword?.message}</FieldError>
        </div>
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </FormShell>
  );
}
