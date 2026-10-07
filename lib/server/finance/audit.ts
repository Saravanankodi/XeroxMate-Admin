import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import type { AuditLogEntry, AuditLogFilters } from "@/types/payment";
import {
  filterAuditLogs,
  mapAudit,
  nextAuditId,
  nowIso,
  sanitize,
} from "./helpers";

const AUDIT_COLLECTION = "auditLogs";

export type AuditWriteInput = Omit<AuditLogEntry, "id" | "timestamp"> & {
  timestamp?: string;
};

/** Appends an audit entry — the server counterpart of the store's `logAudit`. */
export async function writeAudit(
  entry: AuditWriteInput
): Promise<AuditLogEntry> {
  const log: AuditLogEntry = {
    ...entry,
    id: nextAuditId(),
    timestamp: entry.timestamp ?? nowIso(),
  };

  await getAdminFirestore()
    .collection(AUDIT_COLLECTION)
    .doc(log.id)
    .set(sanitize(log));

  return log;
}

export async function listAllAuditLogs(): Promise<AuditLogEntry[]> {
  const snapshot = await getAdminFirestore()
    .collection(AUDIT_COLLECTION)
    .get();

  return snapshot.docs.map((document) =>
    mapAudit(document.id, document.data())
  );
}

export async function listAuditLogs(
  filters: AuditLogFilters = {}
): Promise<AuditLogEntry[]> {
  const logs = await listAllAuditLogs();
  return filterAuditLogs(logs, filters);
}

/** Audit trail for a single payment or payout request (newest first). */
export async function entityLogs(entity: {
  paymentId?: string;
  payoutRequestId?: string;
}): Promise<AuditLogEntry[]> {
  const logs = await listAllAuditLogs();

  return logs
    .filter(
      (l) =>
        (entity.paymentId && l.paymentId === entity.paymentId) ||
        (entity.payoutRequestId && l.payoutRequestId === entity.payoutRequestId)
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
