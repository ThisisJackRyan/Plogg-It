'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

export function SignOutButton() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={onClick} disabled={loading}>
      {loading ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
