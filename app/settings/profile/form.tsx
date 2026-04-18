'use client';

import { useUpdateProfile } from '@plogg/supabase';
import { ProfileUpdate, Username } from '@plogg/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, FieldError, Input } from '@/components/ui';
import { useSupabaseBrowser } from '@/lib/supabase/browser';

export function ProfileSettingsForm({
  userId,
  initialUsername,
  initialDisplayName,
  initialBio,
  initialAvatarUrl,
}: {
  userId: string;
  initialUsername: string;
  initialDisplayName: string;
  initialBio: string;
  initialAvatarUrl: string | null;
}) {
  const supabase = useSupabaseBrowser();
  const router = useRouter();
  const update = useUpdateProfile(supabase, userId);

  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = ProfileUpdate.safeParse({
      username: username || undefined,
      displayName: displayName || undefined,
      bio: bio || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input.');
      return;
    }

    try {
      await update.mutateAsync(parsed.data);
      router.push(`/u/${parsed.data.username ?? Username.parse(username)}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      setError(
        /duplicate|unique/i.test(msg) ? 'That username is already taken.' : msg,
      );
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {initialAvatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={initialAvatarUrl}
          alt=""
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : null}

      <div>
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
          placeholder="e.g. litterpicker"
          autoComplete="off"
          required
        />
        <p className="mt-1 text-xs opacity-60">
          3–20 lowercase letters, numbers, or underscores. Shown in your profile URL.
        </p>
      </div>

      <div>
        <label htmlFor="displayName" className="text-sm font-medium">
          Display name
        </label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
        />
      </div>

      <div>
        <label htmlFor="bio" className="text-sm font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={3}
          className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-brand-600 focus:bg-white"
        />
      </div>

      <FieldError>{error}</FieldError>

      <Button type="submit" className="w-full" disabled={update.isPending}>
        {update.isPending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}
