import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import type {
  FinanceNotification,
  FinanceNotificationAudience,
} from "@/types/payment";
import { nextNotificationId, nowIso, sanitize } from "./helpers";

const NOTIFICATIONS_COLLECTION = "notifications";

export type NotificationWriteInput = Omit<
  FinanceNotification,
  "id" | "read" | "timestamp"
> & { timestamp?: string };

/** Appends a finance notification — the server counterpart of the store's `notify`. */
export async function writeNotification(
  entry: NotificationWriteInput
): Promise<FinanceNotification> {
  const notification: FinanceNotification = {
    ...entry,
    id: nextNotificationId(),
    read: false,
    timestamp: entry.timestamp ?? nowIso(),
  };

  await getAdminFirestore()
    .collection(NOTIFICATIONS_COLLECTION)
    .doc(notification.id)
    .set(sanitize(notification));

  return notification;
}

export async function listNotifications(
  audience: FinanceNotificationAudience
): Promise<FinanceNotification[]> {
  const snapshot = await getAdminFirestore()
    .collection(NOTIFICATIONS_COLLECTION)
    .where("audience", "==", audience)
    .get();

  return snapshot.docs
    .map((document) => ({
      ...(document.data() as FinanceNotification),
      id: document.id,
    }))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

export async function markAllRead(
  audience: FinanceNotificationAudience = "admin"
): Promise<void> {
  const snapshot = await getAdminFirestore()
    .collection(NOTIFICATIONS_COLLECTION)
    .where("audience", "==", audience)
    .get();

  const unread = snapshot.docs.filter(
    (document) => document.data().read !== true
  );

  const db = getAdminFirestore();

  for (let start = 0; start < unread.length; start += 400) {
    const batch = db.batch();
    unread.slice(start, start + 400).forEach((document) => {
      batch.update(document.ref, { read: true });
    });
    await batch.commit();
  }
}
