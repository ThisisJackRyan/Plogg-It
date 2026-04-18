import { z } from 'zod';

export const EmailSchema = z.string().trim().toLowerCase().email();

// Keep in sync with Supabase Auth password policy.
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

export const SignInInput = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});
export type SignInInput = z.infer<typeof SignInInput>;

export const SignUpInput = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    confirmPassword: PasswordSchema,
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
export type SignUpInput = z.infer<typeof SignUpInput>;

export const ResetPasswordInput = z.object({
  email: EmailSchema,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>;
