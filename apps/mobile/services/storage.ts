import { Platform } from 'react-native';

import * as SecureStore from 'expo-secure-store';

/*
 * =========================================================
 * KEY-VALUE STORAGE (token + signed-in user)
 * =========================================================
 *
 * Mobile: expo-secure-store (Keychain / Keystore).
 * Web (Admin portal): expo-secure-store has no web
 * implementation, so the browser's localStorage is used.
 * =========================================================
 */

const isWeb = Platform.OS === 'web';

const webStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const getItem = async (key: string): Promise<string | null> => {
  if (isWeb) {
    return webStorage()?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
};

export const setItem = async (key: string, value: string) => {
  if (isWeb) {
    webStorage()?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
};

export const deleteItem = async (key: string) => {
  if (isWeb) {
    webStorage()?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
};
