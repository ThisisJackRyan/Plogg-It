import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import { clerkAppearance } from '@/lib/clerk-appearance';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plogg.Club',
  description: 'Drop a pin on trash. Clean it up. Earn points.',
};

export const viewport: Viewport = {
  themeColor: '#2e8b57',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>
          <Providers>
            {children}
            <Toaster position="top-center" richColors />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
