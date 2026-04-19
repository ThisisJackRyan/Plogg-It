'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

// Brands confirmed available on Simple Icons CDN. Others fall back to the
// wordmark — some (Amazon, Uber, Chipotle) are missing due to brand guideline
// removals or were never added.
const SIMPLE_ICON_SLUGS: Record<string, string> = {
  Starbucks: 'starbucks',
  Target: 'target',
  Nike: 'nike',
  DoorDash: 'doordash',
  Apple: 'apple',
  Spotify: 'spotify',
};

function iconUrl(brand: string): string | null {
  const slug = SIMPLE_ICON_SLUGS[brand];
  return slug ? `https://cdn.simpleicons.org/${slug}/ffffff` : null;
}

export type Reward = {
  id: string;
  brand: string;
  title: string;
  description: string | null;
  image_url: string | null;
  accent_color: string | null;
  cost_points: number;
  face_value_cents: number | null;
  currency: string;
};

export function MarketplaceClient({
  rewards,
  initialBalance,
}: {
  rewards: Reward[];
  initialBalance: number;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [pending, setPending] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<Reward | null>(null);

  async function handleBuy(reward: Reward) {
    if (pending) return;
    if (balance < reward.cost_points) {
      toast.error(`Need ${reward.cost_points - balance} more points`);
      return;
    }
    setPending(reward.id);
    try {
      const res = await fetch('/api/marketplace/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rewardId: reward.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.error === 'insufficient_points') {
          toast.error('Not enough points');
        } else {
          toast.error('Redemption failed');
        }
        return;
      }
      setBalance((b) => b - reward.cost_points);
      setCelebrating(reward);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rewards Marketplace</h1>
          <p className="mt-1 text-sm text-black/60">
            Spend your points on real gift cards from brands you love.
          </p>
        </div>
        <div className="rounded-full bg-brand-600 px-4 py-2 text-white shadow-sm">
          <span className="text-xs font-medium opacity-80">Your balance</span>
          <span className="ml-2 text-lg font-bold tabular-nums">{balance} pts</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map((r) => (
          <RewardCard
            key={r.id}
            reward={r}
            balance={balance}
            pending={pending === r.id}
            onBuy={() => handleBuy(r)}
          />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-black/50">
        Redemption codes will be emailed to you — claim flow coming soon.
      </p>

      <AnimatePresence>
        {celebrating ? (
          <CelebrationOverlay reward={celebrating} onDone={() => setCelebrating(null)} />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function GiftCardVisual({
  brand,
  accent,
  faceValueCents,
  currency,
  size = 'md',
}: {
  brand: string;
  accent: string;
  faceValueCents: number | null;
  currency: string;
  size?: 'md' | 'lg';
}) {
  const face =
    faceValueCents != null
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(faceValueCents / 100)
      : null;

  const isLg = size === 'lg';
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{
        background: accent,
      }}
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-25 mix-blend-overlay"
        viewBox="0 0 200 120"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle cx="170" cy="20" r="60" fill="white" fillOpacity="0.18" />
        <circle cx="30" cy="110" r="70" fill="white" fillOpacity="0.12" />
        <circle cx="100" cy="60" r="30" fill="white" fillOpacity="0.08" />
      </svg>

      <div className="absolute left-3 top-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">
        Gift Card
      </div>
      {face ? (
        <div className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-bold tabular-nums text-black/80 shadow-sm">
          {face}
        </div>
      ) : null}

      <div className="relative z-10 flex flex-col items-center gap-2 px-4 text-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
        {iconUrl(brand) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl(brand) as string}
            alt=""
            aria-hidden
            className={isLg ? 'h-12 w-12' : 'h-8 w-8'}
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        <div
          className={`font-extrabold uppercase leading-none tracking-[0.02em] ${
            isLg ? 'text-2xl' : 'text-lg'
          }`}
        >
          {brand}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/15" />
    </div>
  );
}

function RewardCard({
  reward,
  balance,
  pending,
  onBuy,
}: {
  reward: Reward;
  balance: number;
  pending: boolean;
  onBuy: () => void;
}) {
  const canAfford = balance >= reward.cost_points;
  const accent = reward.accent_color || '#2e8b57';
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="h-32">
        <GiftCardVisual
          brand={reward.brand}
          accent={accent}
          faceValueCents={reward.face_value_cents}
          currency={reward.currency}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="font-semibold">{reward.title}</div>
        {reward.description ? (
          <p className="text-sm text-black/60">{reward.description}</p>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="font-bold text-brand-600 tabular-nums">
            {reward.cost_points} pts
          </div>
          <button
            type="button"
            onClick={onBuy}
            disabled={pending || !canAfford}
            className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-transform duration-150 active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {pending ? 'Buying…' : canAfford ? 'Buy' : 'Locked'}
          </button>
        </div>
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ['#2e8b57', '#ffd60a', '#ff6b6b', '#5b8def', '#f97316', '#a855f7'];

function CelebrationOverlay({ reward, onDone }: { reward: Reward; onDone: () => void }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 1.4 + Math.random() * 1.2,
        rotate: Math.random() * 720 - 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 8,
      })),
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={onDone}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            initial={{ y: '-10vh', x: `${p.x}vw`, opacity: 0, rotate: 0 }}
            animate={{ y: '110vh', opacity: [0, 1, 1, 0], rotate: p.rotate }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: 'easeIn',
              times: [0, 0.1, 0.8, 1],
            }}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size * 0.4,
              backgroundColor: p.color,
              borderRadius: 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotateX: -30 }}
        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }}
          className="h-40"
        >
          <GiftCardVisual
            brand={reward.brand}
            accent={reward.accent_color || '#2e8b57'}
            faceValueCents={reward.face_value_cents}
            currency={reward.currency}
            size="lg"
          />
        </motion.div>
        <div className="p-5 text-center">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-sm font-medium text-black/60">You redeemed</div>
            <div className="mt-1 text-lg font-bold">{reward.title}</div>
            <div className="mt-2 text-sm text-brand-600">
              −{reward.cost_points} pts
            </div>
            <p className="mt-4 text-xs text-black/50">
              Your code will be emailed when the claim flow launches.
            </p>
            <button
              type="button"
              onClick={onDone}
              className="mt-5 w-full rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-150 active:scale-95"
            >
              Nice
            </button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
