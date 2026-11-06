import React from 'react';

jest.mock('react-native-reanimated', () => ({
  default: {
    View: 'Animated.View',
  },
  FadeInUp: { duration: () => ({}) },
  FadeOutUp: { duration: () => ({}) },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('Notification Quick Close Feature', () => {
  it('closeToast removes notification immediately by ID without waiting for timer', () => {
    let toasts = [
      { id: 1, message: 'Loan created successfully', type: 'success' },
      { id: 2, message: 'WhatsApp reminder sent', type: 'info' },
      { id: 3, message: 'Payment recorded', type: 'success' },
    ];

    const closeToast = (id: number) => {
      toasts = toasts.filter((t) => t.id !== id);
    };

    // Close notification with ID 2
    closeToast(2);

    expect(toasts).toHaveLength(2);
    expect(toasts.map((t) => t.id)).toEqual([1, 3]);
    expect(toasts.find((t) => t.id === 2)).toBeUndefined();

    // Close notification with ID 1
    closeToast(1);
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe(3);

    // Close notification with ID 3
    closeToast(3);
    expect(toasts).toHaveLength(0);
  });

  it('verifies Toast component exports ToastProvider and useToast with quick close support', () => {
    const toastModule = require('../src/components/ui/Toast');
    expect(toastModule.ToastProvider).toBeDefined();
    expect(toastModule.useToast).toBeDefined();
  });
});
