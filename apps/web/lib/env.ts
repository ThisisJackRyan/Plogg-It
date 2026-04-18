const required = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

export const env = {
  SUPABASE_URL: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  MAPBOX_TOKEN: required('NEXT_PUBLIC_MAPBOX_TOKEN', process.env.NEXT_PUBLIC_MAPBOX_TOKEN),
} as const;
