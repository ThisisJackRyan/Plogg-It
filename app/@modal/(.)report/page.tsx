'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import ReportPage from '@/app/report/page';

export default function ReportModal() {
  const pathname = usePathname();
  if (pathname !== '/report') return null;
  return (
    <div className="fixed inset-x-0 bottom-0 top-12 z-10 overflow-y-auto bg-white">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <ReportPage />
      </motion.div>
    </div>
  );
}
