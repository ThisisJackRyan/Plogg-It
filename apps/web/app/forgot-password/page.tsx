'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ResetPasswordInput } from '@plogg/types';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, FieldError, FormShell, Input } from '@/components/ui';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

export default function ForgotPasswordPage() {
  const supabase = getSupabaseBrowser();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(ResetPasswordInput),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: { email: string }) {
    setSubmitError(null);
    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <FormShell title="Check your email" subtitle={`Password reset link sent to ${sentTo}`}>
        <Link href="/login" className="block text-center text-sm text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </FormShell>
    );
  }

  return (
    <FormShell title="Reset password" subtitle="We'll email you a link to set a new password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <Link href="/login" className="block text-center text-sm text-brand-700 hover:underline">
        Back to sign in
      </Link>
    </FormShell>
  );
}
