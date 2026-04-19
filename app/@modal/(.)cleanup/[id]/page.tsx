'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import CleanupPage from '@/app/cleanup/[id]/page';

export default function CleanupModal() {
  const pathname = usePathname();
  if (!pathname.startsWith('/cleanup/')) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 top-[calc(3rem+env(safe-area-inset-top))] z-10 overflow-y-auto bg-white">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <CleanupPage />
      </motion.div>
    </div>
  );
}
