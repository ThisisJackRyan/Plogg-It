import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { error?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', error, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none ring-0 transition focus:border-brand-600 focus:bg-white dark:border-white/15 dark:bg-white/5 ${
        error ? 'border-red-500 dark:border-red-500' : ''
      } ${className}`}
      aria-invalid={Boolean(error)}
      {...props}
    />
  );
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

export function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';
  const variantStyles =
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'bg-transparent text-brand-700 hover:bg-brand-500/10';
  return <button className={`${base} ${variantStyles} ${className}`} {...props} />;
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-red-600">{children}</p>;
}

export function FormShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-sm opacity-70">{subtitle}</p> : null}
        </header>
        {children}
      </div>
    </main>
  );
}
