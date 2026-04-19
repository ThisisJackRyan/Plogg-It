import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'club.plogg.app',
  appName: 'Plogg Club',
  webDir: 'public',
  server: {
    url: 'https://www.plogg.club',
    cleartext: false,
    allowNavigation: [
      '*.clerk.accounts.dev',
      '*.clerk.com',
      'accounts.google.com',
      '*.googleusercontent.com',
      '*.supabase.co',
      'api.mapbox.com',
      'events.mapbox.com',
      'plogg-it.vercel.app',
    ],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
