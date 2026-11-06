import { useAuthStore } from '@/store/useAuthStore';
import * as LocalAuthentication from 'expo-local-authentication';
import { secureStorage } from '@/lib/storage/secureStorage';

describe('Biometric Multi-Sensor Authentication Workflow', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([1, 2]);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

    useAuthStore.setState({
      isLocked: true,
      isAuthenticatedSession: false,
      isSessionTimedOut: true,
      isBiometricAvailable: true,
      isBiometricEnabled: true,
      biometricTypeLabel: 'Biometric Unlock',
      biometricIconName: 'finger-print',
      supportedBiometricTypes: [1, 2],
      lastActiveTime: Date.now() - 3600000,
    });
  });

  describe('1. Hardware & Multi-Sensor Type Detection', () => {
    it('detects Fingerprint sensor (Capacitive, In-Display, Touch ID)', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      await useAuthStore.getState().initialize();
      const state = useAuthStore.getState();
      expect(state.isBiometricAvailable).toBe(true);
      expect(state.biometricTypeLabel).toMatch(/Fingerprint|Touch ID/);
      expect(state.biometricIconName).toBe('finger-print');
    });

    it('detects Facial Recognition sensor (Face ID, Android Face Unlock)', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      await useAuthStore.getState().initialize();
      const state = useAuthStore.getState();
      expect(state.isBiometricAvailable).toBe(true);
      expect(state.biometricTypeLabel).toMatch(/Face Unlock|Face ID/);
      expect(state.biometricIconName).toBe('scan-outline');
    });

    it('detects Iris scanner sensor', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.IRIS,
      ]);

      await useAuthStore.getState().initialize();
      const state = useAuthStore.getState();
      expect(state.isBiometricAvailable).toBe(true);
      expect(state.biometricTypeLabel).toBe('Iris Recognition');
      expect(state.biometricIconName).toBe('eye-outline');
    });

    it('detects Dual Biometrics (both Fingerprint and Face Unlock supported)', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      await useAuthStore.getState().initialize();
      const state = useAuthStore.getState();
      expect(state.isBiometricAvailable).toBe(true);
      expect(state.biometricTypeLabel).toBe('Fingerprint & Face Unlock');
      expect(state.biometricIconName).toBe('finger-print');
    });

    it('marks biometric unavailable if hardware is missing or nothing is enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);

      await useAuthStore.getState().initialize();
      const state = useAuthStore.getState();
      expect(state.isBiometricAvailable).toBe(false);
    });
  });

  describe('2. Multi-Sensor Unlock Execution', () => {
    it('unlocks app immediately on sensor validation with requireConfirmation=false', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

      const success = await useAuthStore.getState().unlockWithBiometrics();
      expect(success).toBe(true);

      // Verify that requireConfirmation: false is passed so face unlock & iris do not demand an extra click
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          requireConfirmation: false,
          disableDeviceFallback: false,
          promptMessage: 'Unlock Sri Senthur Finance',
        })
      );

      const state = useAuthStore.getState();
      expect(state.isLocked).toBe(false);
      expect(state.isAuthenticatedSession).toBe(true);
      expect(state.isSessionTimedOut).toBe(false);
      expect(Date.now() - state.lastActiveTime).toBeLessThan(1000);

      // Verify persistent session storage updated
      const sessionActive = await secureStorage.getItem('loanledger_session_active');
      expect(sessionActive).toBe('true');
    });

    it('denies access and keeps app locked when biometric validation fails or cancels', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: false, error: 'user_cancel' });

      const success = await useAuthStore.getState().unlockWithBiometrics();
      expect(success).toBe(false);

      const state = useAuthStore.getState();
      expect(state.isLocked).toBe(true);
      expect(state.isAuthenticatedSession).toBe(false);
    });

    it('refuses unlock if device hardware is missing at runtime', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);

      const success = await useAuthStore.getState().unlockWithBiometrics();
      expect(success).toBe(false);
      expect(useAuthStore.getState().isLocked).toBe(true);
    });
  });

  describe('3. Biometric Toggle & Settings Management', () => {
    it('allows toggling biometric authentication on and off', async () => {
      await useAuthStore.getState().setBiometricEnabled(false);
      expect(useAuthStore.getState().isBiometricEnabled).toBe(false);
      expect(await secureStorage.getItem('loanledger_biometric_enabled')).toBe('false');

      await useAuthStore.getState().setBiometricEnabled(true);
      expect(useAuthStore.getState().isBiometricEnabled).toBe(true);
      expect(await secureStorage.getItem('loanledger_biometric_enabled')).toBe('true');
    });
  });

  describe('4. Biometric Identity Verification for Sensitive Actions', () => {
    it('verifies biometric identity when revealing sensitive data', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

      const verified = await useAuthStore.getState().verifyBiometricsForSensitiveAction();
      expect(verified).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          promptMessage: expect.stringContaining('biometric'),
          requireConfirmation: false,
        })
      );
    });

    it('rejects access if biometric identity fails for sensitive data', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: false });

      const verified = await useAuthStore.getState().verifyBiometricsForSensitiveAction();
      expect(verified).toBe(false);
    });
  });
});
