jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.mock('expo-contacts', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));
jest.mock('expo-image-picker', () => ({
  getCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-reanimated', () => ({
  default: { View: 'Animated.View' },
  FadeInUp: { duration: () => ({}) },
  FadeOutUp: { duration: () => ({}) },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));
jest.mock('expo', () => ({}));

import { isSetupCompleted, setSetupCompleted, SETUP_COMPLETED_KEY } from '../src/components/onboarding/InitialSetupModal';
import { secureStorage } from '../src/lib/storage/secureStorage';

describe('Organization Setup & Mandatory 4-Digit Security PIN Lock', () => {
  beforeEach(async () => {
    await secureStorage.deleteItem(SETUP_COMPLETED_KEY);
    await secureStorage.deleteItem('loanledger_user_pin');
    await secureStorage.deleteItem('loanledger_lock_enabled');
  });

  describe('isSetupCompleted logic', () => {
    it('returns false if setup completed key is missing', async () => {
      const completed = await isSetupCompleted();
      expect(completed).toBe(false);
    });

    it('returns false if setup completed is true but NO 4-digit PIN is configured', async () => {
      await secureStorage.setItem(SETUP_COMPLETED_KEY, 'true');
      const completed = await isSetupCompleted();
      expect(completed).toBe(false); // PIN is strictly mandatory!
    });

    it('returns true only when setup completed is true AND 4-digit PIN is present', async () => {
      await secureStorage.setItem(SETUP_COMPLETED_KEY, 'true');
      await secureStorage.setItem('loanledger_user_pin', '8887');
      const completed = await isSetupCompleted();
      expect(completed).toBe(true);
    });
  });

  describe('4-Digit PIN Validation Rules', () => {
    const validatePinForm = (appPin: string, confirmPin: string, orgName: string) => {
      if (!appPin || appPin.length !== 4 || !/^\d{4}$/.test(appPin)) {
        return { valid: false, error: 'A 4-digit security PIN lock is mandatory to protect organization ledgers.' };
      }
      if (appPin !== confirmPin) {
        return { valid: false, error: 'PIN confirmation does not match' };
      }
      if (!orgName.trim()) {
        return { valid: false, error: 'Please enter an organization name' };
      }
      return { valid: true, error: null };
    };

    it('rejects empty PIN as mandatory requirement', () => {
      const res = validatePinForm('', '', 'Sri Senthur Finance');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('4-digit security PIN lock is mandatory');
    });

    it('rejects PIN with fewer than 4 digits', () => {
      const res = validatePinForm('123', '123', 'Sri Senthur Finance');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('4-digit security PIN lock is mandatory');
    });

    it('rejects PIN with non-numeric characters', () => {
      const res = validatePinForm('12ab', '12ab', 'Sri Senthur Finance');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('4-digit security PIN lock is mandatory');
    });

    it('rejects mismatching confirmation PIN', () => {
      const res = validatePinForm('8887', '8888', 'Sri Senthur Finance');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('PIN confirmation does not match');
    });

    it('rejects empty organization name when PIN is valid', () => {
      const res = validatePinForm('8887', '8887', '   ');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Please enter an organization name');
    });

    it('accepts valid 4-digit PIN with matching confirmation and organization name', () => {
      const res = validatePinForm('8887', '8887', 'Sri Senthur Finance');
      expect(res.valid).toBe(true);
      expect(res.error).toBeNull();
    });
  });

  describe('Local Storage & Auth PIN Persistence', () => {
    it('stores 4-digit PIN and enables lock in secure storage', async () => {
      const pin = '7766';
      await secureStorage.setItem('loanledger_user_pin', pin);
      await secureStorage.setItem('loanledger_lock_enabled', 'true');

      const savedPin = await secureStorage.getItem('loanledger_user_pin');
      const isLockEnabled = await secureStorage.getItem('loanledger_lock_enabled');

      expect(savedPin).toBe('7766');
      expect(isLockEnabled).toBe('true');
    });
  });
});
