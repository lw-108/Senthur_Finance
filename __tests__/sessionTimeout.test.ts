import { useAuthStore } from '../src/store/useAuthStore';
import { secureStorage } from '../src/lib/storage/secureStorage';

describe('Session Inactivity Timeout & Freeze System', () => {
  beforeEach(async () => {
    useAuthStore.setState({
      hasStoredAccount: true,
      isLockEnabled: true,
      isAuthenticatedSession: true,
      isLocked: false,
      isSessionTimedOut: false,
      sessionTimeoutMinutes: 30,
      lastActiveTime: Date.now(),
    });
  });

  it('keeps session active when returning within configured timeout (e.g. 5 minutes)', () => {
    const store = useAuthStore.getState();
    // Simulate user leaving app 5 minutes ago
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    useAuthStore.setState({ lastActiveTime: fiveMinutesAgo });

    const timedOut = store.checkSessionTimeout();

    expect(timedOut).toBe(false);
    const updated = useAuthStore.getState();
    expect(updated.isSessionTimedOut).toBe(false);
    expect(updated.isLocked).toBe(false);
    expect(updated.isAuthenticatedSession).toBe(true);
  });

  it('freezes screen into lock overlay when inactivity exceeds configured timeout (e.g. 35 minutes on 30m setting)', () => {
    const store = useAuthStore.getState();
    // Simulate user leaving app 35 minutes ago on 30m timeout
    const thirtyFiveMinutesAgo = Date.now() - 35 * 60 * 1000;
    useAuthStore.setState({ lastActiveTime: thirtyFiveMinutesAgo, sessionTimeoutMinutes: 30 });

    const timedOut = store.checkSessionTimeout();

    expect(timedOut).toBe(true);
    const updated = useAuthStore.getState();
    expect(updated.isSessionTimedOut).toBe(true);
    expect(updated.isLocked).toBe(true);
    expect(updated.isAuthenticatedSession).toBe(false);
  });

  it('respects user preference of 15 minutes timeout', async () => {
    const store = useAuthStore.getState();
    await store.setSessionTimeoutMinutes(15);
    expect(useAuthStore.getState().sessionTimeoutMinutes).toBe(15);

    // 16 minutes later -> should freeze/lock
    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
    useAuthStore.setState({ lastActiveTime: sixteenMinutesAgo });

    const timedOut = store.checkSessionTimeout();
    expect(timedOut).toBe(true);
    expect(useAuthStore.getState().isLocked).toBe(true);
  });

  it('respects user preference of 60 minutes timeout', async () => {
    const store = useAuthStore.getState();
    await store.setSessionTimeoutMinutes(60);
    expect(useAuthStore.getState().sessionTimeoutMinutes).toBe(60);

    // 45 minutes later -> should stay active
    const fortyFiveMinutesAgo = Date.now() - 45 * 60 * 1000;
    useAuthStore.setState({ lastActiveTime: fortyFiveMinutesAgo });

    const timedOut = store.checkSessionTimeout();
    expect(timedOut).toBe(false);
    expect(useAuthStore.getState().isLocked).toBe(false);
    expect(useAuthStore.getState().isAuthenticatedSession).toBe(true);
  });

  it('unlocks session cleanly upon unlockSessionTimeout without resetting user route', () => {
    // Put store in locked/timed-out state
    useAuthStore.setState({
      isSessionTimedOut: true,
      isLocked: true,
      isAuthenticatedSession: false,
    });

    useAuthStore.getState().unlockSessionTimeout();

    const updated = useAuthStore.getState();
    expect(updated.isSessionTimedOut).toBe(false);
    expect(updated.isLocked).toBe(false);
    expect(updated.isAuthenticatedSession).toBe(true);
  });
});
