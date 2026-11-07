import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Cross-platform Secure Storage abstraction.
 * - On iOS/Android: uses native Keychain / Android Keystore via expo-secure-store.
 * - On Web: uses localStorage with an in-memory fallback to prevent missing native module crashes.
 */
// Android KeyStore has a hard 2048-byte limit per key in EncryptedSharedPreferences.
// Chunks of 1800 bytes prevent native crashes when persisting larger objects (e.g. customer caches, session tokens).
const CHUNK_SIZE = 1800;

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
      // Check if value was stored across multiple chunks
      const countStr = await SecureStore.getItemAsync(`${key}__chunks`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        if (!isNaN(count) && count > 0) {
          const parts: string[] = [];
          for (let i = 0; i < count; i++) {
            const part = await SecureStore.getItemAsync(`${key}__chunk_${i}`);
            if (part !== null) {
              parts.push(part);
            }
          }
          const fullValue = parts.join('');
          this.memoryFallback.set(key, fullValue);
          return fullValue;
        }
      }

      const val = await SecureStore.getItemAsync(key);
      if (val !== null) {
        this.memoryFallback.set(key, val);
      }
      return val;
    } catch (e) {
      console.warn(`[SecureStore] Native getItem failed for key "${key}":`, e);
      return this.memoryFallback.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    this.memoryFallback.set(key, value);

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch {
        // LocalStorage access restricted
      }
      return;
    }

    try {
      if (value.length <= CHUNK_SIZE) {
        // Remove previous chunks if it was previously chunked
        const oldCount = await SecureStore.getItemAsync(`${key}__chunks`);
        if (oldCount) {
          const c = parseInt(oldCount, 10);
          for (let i = 0; i < c; i++) {
            await SecureStore.deleteItemAsync(`${key}__chunk_${i}`).catch(() => {});
          }
          await SecureStore.deleteItemAsync(`${key}__chunks`).catch(() => {});
        }
        await SecureStore.setItemAsync(key, value);
      } else {
        const numChunks = Math.ceil(value.length / CHUNK_SIZE);
        for (let i = 0; i < numChunks; i++) {
          const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await SecureStore.setItemAsync(`${key}__chunk_${i}`, chunk);
        }
        await SecureStore.setItemAsync(`${key}__chunks`, String(numChunks));
        await SecureStore.deleteItemAsync(key).catch(() => {});
      }
    } catch (e) {
      console.warn(`[SecureStore] Native setItem failed for key "${key}":`, e);
    }
  }

  async deleteItem(key: string): Promise<void> {
    this.memoryFallback.delete(key);

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch {
        // LocalStorage access restricted
      }
      return;
    }

    try {
      const countStr = await SecureStore.getItemAsync(`${key}__chunks`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}__chunk_${i}`).catch(() => {});
        }
        await SecureStore.deleteItemAsync(`${key}__chunks`).catch(() => {});
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn(`[SecureStore] Native deleteItem failed for key "${key}":`, e);
    }
  }

  async removeItem(key: string): Promise<void> {
    return this.deleteItem(key);
  }
}

export const secureStorage = new SecureStorageService();
