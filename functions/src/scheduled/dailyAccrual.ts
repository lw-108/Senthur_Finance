import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const dailyAccrual = functions.pubsub
  .schedule('30 0 * * *') // 00:30 AM every night
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const db = admin.firestore();
    const todayStr = new Date().toISOString().split('T')[0];

    // Query all admin users
    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const adminUid = userDoc.id;
      const loansRef = db.collection(`users/${adminUid}/loans`);
      const activeLoansSnap = await loansRef.where('status', 'in', ['ACTIVE', 'OVERDUE']).get();

      let totalOutstandingDay = 0;
      let totalOverdueDay = 0;

      for (const loanDoc of activeLoansSnap.docs) {
        const loan = loanDoc.data();
        const scheduleRef = db.collection(`users/${adminUid}/loans/${loanDoc.id}/schedule`);
        const scheduleSnap = await scheduleRef.where('status', 'in', ['UPCOMING', 'DUE_TODAY', 'OVERDUE']).get();

        let daysOverdue = 0;
        let penaltyAccrued = loan.penaltyAccrued || 0;

        for (const instDoc of scheduleSnap.docs) {
          const inst = instDoc.data();
          if (inst.dueDate === todayStr && inst.status === 'UPCOMING') {
            await instDoc.ref.update({ status: 'DUE_TODAY' });
          } else if (inst.dueDate < todayStr && inst.status !== 'PAID') {
            const diffDays = Math.floor(
              (new Date(todayStr).getTime() - new Date(inst.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            daysOverdue = Math.max(daysOverdue, diffDays);

            // Add flat penalty if grace period passed
            const grace = loan.penalty?.graceDays || 3;
            if (diffDays > grace && loan.penalty?.type === 'FLAT_PER_DAY') {
              penaltyAccrued += loan.penalty.value || 5000;
            }

            await instDoc.ref.update({
              status: 'OVERDUE',
              penaltyDue: penaltyAccrued,
            });
          }
        }

        const isNowOverdue = daysOverdue > 0;
        await loanDoc.ref.update({
          status: isNowOverdue ? 'OVERDUE' : loan.status,
          daysOverdue,
          penaltyAccrued,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        totalOutstandingDay += loan.outstandingPrincipal || 0;
        if (isNowOverdue) {
          totalOverdueDay += loan.outstandingPrincipal || 0;
        }
      }

      // Record daily snapshot in stats/daily/{yyyy-mm-dd}
      await db.doc(`users/${adminUid}/stats/daily/${todayStr}`).set(
        {
          date: todayStr,
          totalOutstanding: totalOutstandingDay,
          totalOverdue: totalOverdueDay,
          recordedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  });
