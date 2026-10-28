import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onLoanCreate = functions.firestore
  .document('users/{adminUid}/loans/{loanId}')
  .onCreate(async (snapshot, context) => {
    const { adminUid, loanId } = context.params;
    const loan = snapshot.data();
    if (!loan) return;

    const db = admin.firestore();
    const customerRef = db.doc(`users/${adminUid}/customers/${loan.customerId}`);

    // Update customer totals: activeLoans and totalLent
    await customerRef.update({
      'totals.activeLoans': admin.firestore.FieldValue.increment(1),
      'totals.totalLent': admin.firestore.FieldValue.increment(loan.principal),
      'totals.totalOutstanding': admin.firestore.FieldValue.increment(loan.principal),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
