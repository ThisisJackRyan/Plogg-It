import * as SecureStore from 'expo-secure-store';
import type { TokenCache } from '@clerk/clerk-expo/dist/cache';

/**
 * Clerk token cache backed by expo-secure-store. Clerk session tokens are
 * small (well under SecureStore's ~2KB-per-item iOS limit), so SecureStore is
 * the preferred place to persist them.
 */
export const tokenCache: TokenCache = {
  async getToken(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      await SecureStore.deleteItemAsync(key).catch(() => undefined);
      return null;
    }
  },
  async saveToken(key, value) {
    await SecureStore.setItemAsync(key, value);
  },
};
