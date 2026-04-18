import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPloggClient, type SupabaseClient } from '@plogg/supabase';
import { AppState } from 'react-native';
import { env } from './env';

// NOTE: We deliberately use AsyncStorage here (not expo-secure-store) because
// SecureStore has a ~2 KB per-item limit on iOS and Supabase session JSON can
// exceed that. Refresh-token rotation is enforced server-side, so this is a
// reasonable trade-off for the MVP. If the threat model tightens we can swap
// in a chunking SecureStore adapter.
export const supabase: SupabaseClient = createPloggClient({
  url: env.SUPABASE_URL,
  anonKey: env.SUPABASE_ANON_KEY,
  storage: AsyncStorage,
  // Mobile listens for deep links explicitly via expo-linking, so disable
  // the client's own URL detection.
  detectSessionInUrl: false,
});

// Tell Supabase to auto-refresh the session while the app is foregrounded,
// and pause refresh timers while backgrounded. This is the documented RN
// pattern and avoids unnecessary token churn.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
