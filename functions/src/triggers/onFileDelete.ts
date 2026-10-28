import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onFileDelete = functions.firestore
  .document('users/{adminUid}/customers/{customerId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (!after.isDeleted || before.isDeleted) return;

    // Soft delete clean up of storage references if permanently purged
    const storageBucket = admin.storage().bucket();
    const proofs = after.idProofs || [];
    for (const proof of proofs) {
      if (proof.storagePath) {
        try {
          await storageBucket.file(proof.storagePath).delete();
        } catch {
          // file may already be absent
        }
      }
    }
  });
