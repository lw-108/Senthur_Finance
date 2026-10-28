import * as admin from 'firebase-admin';

// Initialize Firebase Admin singleton
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export { onPaymentCreate } from './triggers/onPaymentCreate';
export { onLoanCreate } from './triggers/onLoanCreate';
export { onFileDelete } from './triggers/onFileDelete';
export { dailyAccrual } from './scheduled/dailyAccrual';
export { sendReminders } from './scheduled/sendReminders';
