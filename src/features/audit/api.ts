import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AuditLog } from './types';
import { generateInitialAuditHistory } from './auditEngine';

let localAuditLogsMemory: AuditLog[] = [];

export async function fetchAuditLogsFromDb(adminUid: string): Promise<AuditLog[]> {
  if (adminUid) {
    try {
      const auditRef = collection(db, 'users', adminUid, 'auditLogs');
      const q = query(auditRef, orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fromDb: AuditLog[] = [];
        snap.forEach((d) => fromDb.push(d.data() as AuditLog));

        // Merge with local memory, deduplicating by id
        const map = new Map<string, AuditLog>();
        fromDb.forEach((l) => map.set(l.id, l));
        localAuditLogsMemory.forEach((l) => {
          if (!map.has(l.id)) map.set(l.id, l);
        });
        localAuditLogsMemory = Array.from(map.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return localAuditLogsMemory;
      }
    } catch (e) {
      // offline fallback
    }
  }

  return localAuditLogsMemory;
}

export async function recordAuditLogToDb(adminUid: string, log: AuditLog): Promise<AuditLog> {
  localAuditLogsMemory.unshift(log);

  if (adminUid) {
    try {
      const docRef = doc(db, 'users', adminUid, 'auditLogs', log.id);
      await setDoc(docRef, log);
    } catch (e) {
      // offline
    }
  }

  return log;
}
