import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onPaymentCreate = functions.firestore
  .document('users/{adminUid}/payments/{paymentId}')
  .onCreate(async (snapshot, context) => {
    const { adminUid, paymentId } = context.params;
    const payment = snapshot.data();
    if (!payment) return;

    const db = admin.firestore();
    const loanRef = db.doc(`users/${adminUid}/loans/${payment.loanId}`);
    const customerRef = db.doc(`users/${adminUid}/customers/${payment.customerId}`);
    const today = new Date().toISOString().split('T')[0];
    const dailyStatsRef = db.doc(`users/${adminUid}/stats/daily/${today}`);

    await db.runTransaction(async (t) => {
      const loanDoc = await t.get(loanRef);
      if (!loanDoc.exists) return;
      const loan = loanDoc.data()!;

      const newOutstanding = Math.max(0, loan.outstandingPrincipal - (payment.allocation?.principal || 0));
      const newTotalPaid = (loan.totalPaid || 0) + payment.amount;
      const newProgress = Math.min(100, Math.round((newTotalPaid / loan.totalPayable) * 100));
      const isClosed = newOutstanding === 0;

      t.update(loanRef, {
        outstandingPrincipal: newOutstanding,
        totalPaid: newTotalPaid,
        progressPercent: newProgress,
        status: isClosed ? 'CLOSED' : loan.status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update customer totals
      const customerDoc = await t.get(customerRef);
      if (customerDoc.exists) {
        const cust = customerDoc.data()!;
        const totals = cust.totals || {};
        t.update(customerRef, {
          'totals.totalOutstanding': Math.max(0, (totals.totalOutstanding || 0) - (payment.allocation?.principal || 0)),
          'totals.totalPaid': (totals.totalPaid || 0) + payment.amount,
          'totals.overdueAmount': Math.max(0, (totals.overdueAmount || 0) - payment.amount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Upsert daily stats aggregation doc
      t.set(
        dailyStatsRef,
        {
          date: today,
          totalCollected: admin.firestore.FieldValue.increment(payment.amount),
          collectionCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
  });
