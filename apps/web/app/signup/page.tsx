'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { SignUpInput } from '@plogg/types';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, FieldError, FormShell, Input } from '@/components/ui';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

export default function SignupPage() {
  const supabase = getSupabaseBrowser();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(SignUpInput),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: { email: string; password: string }) {
    setSubmitError(null);
    const origin = window.location.origin;
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/`,
      },
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
        <p className="rounded-lg border border-black/10 bg-black/2 p-3 text-sm opacity-80 dark:border-white/10 dark:bg-white/4">
          Click the link in the email to verify your account. The link will open this site and sign
          you in automatically.
        </p>
        <Link href="/login" className="block text-center text-sm text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </FormShell>
    );
  }

  return (
    <FormShell title="Create your account" subtitle="Join Plogg It">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            error={errors.password?.message}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
            Confirm password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          <FieldError>{errors.confirmPassword?.message}</FieldError>
        </div>
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <Link href="/login" className="block text-center text-sm text-brand-700 hover:underline">
        Already have an account? Sign in
      </Link>
    </FormShell>
  );
}
