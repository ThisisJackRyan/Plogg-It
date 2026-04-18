import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-brand-500/[0.06] px-4 py-10">
      <SignUp />
    </main>
  );
}
