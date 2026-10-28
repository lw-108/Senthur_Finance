import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Cross-platform Secure Storage abstraction.
 * - On iOS/Android: uses native Keychain / Android Keystore via expo-secure-store.
 * - On Web: uses localStorage with an in-memory fallback to prevent missing native module crashes.
 */
class SecureStorageService {
  private memoryFallback: Map<string, string> = new Map();

  async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    }
    try {
      return await SecureStore.isAvailableAsync();
    } catch {
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch {
        // LocalStorage access restricted in private mode
      }
      return this.memoryFallback.get(key) || null;
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn(`[SecureStore] Native getItem failed for key "${key}":`, e);
      return this.memoryFallback.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch {
        // LocalStorage access restricted
      }
      this.memoryFallback.set(key, value);
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
      this.memoryFallback.set(key, value);
    } catch (e) {
      console.warn(`[SecureStore] Native setItem failed for key "${key}":`, e);
      this.memoryFallback.set(key, value);
    }
  }

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch {
        // LocalStorage access restricted
      }
      this.memoryFallback.delete(key);
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
      this.memoryFallback.delete(key);
    } catch (e) {
      console.warn(`[SecureStore] Native deleteItem failed for key "${key}":`, e);
      this.memoryFallback.delete(key);
    }
  }

  async removeItem(key: string): Promise<void> {
    return this.deleteItem(key);
  }
}

export const secureStorage = new SecureStorageService();
