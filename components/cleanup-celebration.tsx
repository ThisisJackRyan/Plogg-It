'use client';

import confetti from 'canvas-confetti';
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';

type Props = {
  open: boolean;
  pointsEarned: number;
  totalPoints: number | null;
  onContinue: () => void;
  onSeeLeaderboard: () => void;
  title?: string;
  subtitle?: string;
  unverified?: boolean;
};

function CountUp({ to, duration = 1.2 }: { to: number; duration?: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(mv, to, { duration, ease: 'easeOut' });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [to, duration, mv, rounded]);

  return <>{display}</>;
}

function fireConfetti() {
  const defaults = {
    spread: 360,
    ticks: 90,
    gravity: 0.6,
    decay: 0.94,
    startVelocity: 35,
    colors: ['#16a34a', '#22c55e', '#86efac', '#fde047', '#ffffff'],
  };

  confetti({ ...defaults, particleCount: 80, origin: { x: 0.5, y: 0.35 }, scalar: 1.1 });
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 50, origin: { x: 0.2, y: 0.5 }, scalar: 0.9 });
    confetti({ ...defaults, particleCount: 50, origin: { x: 0.8, y: 0.5 }, scalar: 0.9 });
  }, 250);
}

export function CleanupCelebration({
  open,
  pointsEarned,
  totalPoints,
  onContinue,
  onSeeLeaderboard,
  title,
  subtitle,
  unverified = false,
}: Props) {
  useEffect(() => {
    if (!open || unverified) return;
    fireConfetti();
  }, [open, unverified]);

  const resolvedTitle = unverified
    ? 'Thanks for pitching in!'
    : (title ?? 'Cleanup Complete!');
  const resolvedSubtitle = unverified
    ? "We couldn't verify your photo this time, so no points — but we really appreciate you helping out!"
    : (subtitle ?? 'You made the world a little cleaner.');

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-brand-600/95 to-brand-700/95 px-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Cleanup complete"
        >
          <motion.div
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
            className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-500/15"
            >
              <motion.svg
                viewBox="0 0 52 52"
                className="h-12 w-12 text-brand-600"
                initial="hidden"
                animate="visible"
              >
                <motion.circle
                  cx="26"
                  cy="26"
                  r="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  variants={{
                    hidden: { pathLength: 0, opacity: 0 },
                    visible: {
                      pathLength: 1,
                      opacity: 1,
                      transition: { delay: 0.3, duration: 0.5, ease: 'easeOut' },
                    },
                  }}
                />
                <motion.path
                  d="M14 27 L23 36 L38 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  variants={{
                    hidden: { pathLength: 0 },
                    visible: {
                      pathLength: 1,
                      transition: { delay: 0.55, duration: 0.35, ease: 'easeOut' },
                    },
                  }}
                />
              </motion.svg>
            </motion.div>

            <motion.h2
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.3 }}
              className="text-2xl font-bold tracking-tight"
            >
              {resolvedTitle}
            </motion.h2>
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.3 }}
              className="mt-1 text-sm text-black/60"
            >
              {resolvedSubtitle}
            </motion.p>

            {unverified ? null : (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.35 }}
              className="mt-6 rounded-2xl bg-gradient-to-br from-brand-500/10 to-brand-600/20 p-5"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-700/80">
                Points earned
              </div>
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: [0.9, 1.15, 1] }}
                transition={{ delay: 0.75, duration: 0.6, times: [0, 0.5, 1] }}
                className="mt-1 text-5xl font-extrabold text-brand-700"
              >
                +<CountUp to={pointsEarned} />
              </motion.div>
              {totalPoints !== null ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.3, duration: 0.3 }}
                  className="mt-3 text-xs text-black/60"
                >
                  Total: <span className="font-semibold text-black/80">
                    <CountUp to={totalPoints} duration={1.4} />
                  </span>{' '}
                  pts
                </motion.div>
              ) : null}
            </motion.div>
            )}

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.3 }}
              className="mt-6 flex flex-col gap-2"
            >
              <Button type="button" className="w-full py-3 text-base" onClick={onContinue}>
                Continue
              </Button>
              <button
                type="button"
                onClick={onSeeLeaderboard}
                className="text-xs text-brand-700 hover:underline"
              >
                See the leaderboard
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
