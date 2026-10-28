import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBHn9MNHMTk6Ur2eqAyS4dBMXKU1bE6vCE',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'senthur-finance.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'senthur-finance',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'senthur-finance.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '122448599911',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:122448599911:web:8f997fba273ed0896c2dc2',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-CDFYQPH8E3',
};

// Initialize App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with offline persistence and undefined property stripping
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (e) {
  // If already initialized
  firestoreInstance = getFirestore(app);
}

export const db: Firestore = firestoreInstance;
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

// Safe Analytics initialization for Web and Mobile
export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported && firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('Dummy')) {
        try {
          analytics = getAnalytics(app);
        } catch (e) {
          // Non-critical: Firebase Analytics is optional
        }
      }
    })
    .catch(() => {
      // Analytics not supported in this environment
    });
}
