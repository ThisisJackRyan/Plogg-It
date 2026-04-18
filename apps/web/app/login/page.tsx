'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { SignInInput } from '@plogg/types';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, FieldError, FormShell, Input } from '@/components/ui';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

function LoginForm() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const params = useSearchParams();
  const initialError = params.get('error');
  const [submitError, setSubmitError] = useState<string | null>(initialError);

  const {
    register,
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
    router.refresh();
  }

  return (
    <>
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
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </div>
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-brand-700 hover:underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="text-brand-700 hover:underline">
          Create an account
        </Link>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <FormShell title="Welcome back" subtitle="Sign in to Plogg It">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </FormShell>
  );
}
