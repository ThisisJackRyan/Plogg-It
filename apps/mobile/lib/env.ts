// Expo inlines any env var prefixed with EXPO_PUBLIC_ at build time.
const required = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing required env var: ${name}. Add it to .env.local.`);
  return value;
};

export const env = {
  SUPABASE_URL: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  MAPBOX_TOKEN: required('EXPO_PUBLIC_MAPBOX_TOKEN', process.env.EXPO_PUBLIC_MAPBOX_TOKEN),
} as const;
