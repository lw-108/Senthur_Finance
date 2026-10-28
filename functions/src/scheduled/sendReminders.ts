import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const sendReminders = functions.pubsub
  .schedule('0 9 * * *') // 9:00 AM every morning
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const db = admin.firestore();
    const todayStr = new Date().toISOString().split('T')[0];

    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const adminUid = userDoc.id;
      const settingsDoc = await db.doc(`users/${adminUid}/settings/general`).get();
      const fcmToken = settingsDoc.data()?.fcmToken;

      // Count due today and overdue
      const loansRef = db.collection(`users/${adminUid}/loans`);
      const overdueSnap = await loansRef.where('status', '==', 'OVERDUE').get();
      const dueSnap = await loansRef.where('nextDueDate', '==', todayStr).get();

      const overdueCount = overdueSnap.size;
      const dueCount = dueSnap.size;

      if (fcmToken && (overdueCount > 0 || dueCount > 0)) {
        const payload: admin.messaging.Message = {
          token: fcmToken,
          notification: {
            title: 'LoanLedger Morning Digest',
            body: `${dueCount} installment(s) due today • ${overdueCount} overdue loan(s) needing attention.`,
          },
          data: {
            screen: 'home',
            date: todayStr,
          },
        };

        try {
          await admin.messaging().send(payload);
        } catch {
          // invalid or expired token
        }
      }
    }
  });
