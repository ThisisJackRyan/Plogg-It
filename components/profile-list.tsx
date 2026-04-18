import type { Profile } from '@plogg/types';
import Link from 'next/link';

export function ProfileList({
  profiles,
  emptyLabel,
}: {
  profiles: Profile[];
  emptyLabel: string;
}) {
  if (profiles.length === 0) {
    return <p className="py-8 text-center text-sm opacity-60">{emptyLabel}</p>;
  }
  return (
    <ul className="divide-y divide-black/5 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      {profiles.map((p) => (
        <li key={p.id}>
          <Link
            href={p.username ? `/u/${p.username}` : '#'}
            className="flex items-center gap-3 px-4 py-3 hover:bg-black/5"
          >
            {p.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-brand-600/10" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {p.displayName ?? p.username ?? 'Anonymous'}
              </p>
              {p.username ? (
                <p className="truncate text-xs text-black/60">@{p.username}</p>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
