import "server-only";

import { FinanceError } from "@/lib/finance/errors";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { AuthenticatedAdmin } from "@/lib/firebase/auth";
import { getOrder, listAllOrders } from "@/lib/server/orders";
import type { Order } from "@/types/order";
import type {
  Payment,
  PaymentFilters,
} from "@/types/payment";
import { writeAudit } from "./audit";
import {
  adminStamp,
  filterPayments,
  getShopInfo,
  mapPayment,
  nextPaymentId,
  nowIso,
  paymentMethodFor,
  sanitize,
} from "./helpers";
import { writeNotification } from "./notifications";

const PAYMENTS_COLLECTION = "payments";

// ─── Read helpers ────────────────────────────────────────────────────────────

export async function listAllPayments(): Promise<Payment[]> {
  const snapshot = await getAdminFirestore()
    .collection(PAYMENTS_COLLECTION)
    .get();

  return snapshot.docs.map((document) =>
    mapPayment(document.id, document.data())
  );
}

export async function getPaymentsWhere(
  field: string,
  value: string
): Promise<Payment[]> {
  const snapshot = await getAdminFirestore()
    .collection(PAYMENTS_COLLECTION)
    .where(field, "==", value)
    .get();

  return snapshot.docs.map((document) =>
    mapPayment(document.id, document.data())
  );
}

export async function getPayment(
  paymentId: string
): Promise<Payment | null> {
  if (!paymentId) return null;

  const document = await getAdminFirestore()
    .collection(PAYMENTS_COLLECTION)
    .doc(paymentId)
    .get();

  if (!document.exists) return null;

  return mapPayment(document.id, document.data() ?? {});
}

export async function listPayments(
  filters: PaymentFilters = {}
): Promise<Payment[]> {
  const payments = await listAllPayments();
  return filterPayments(payments, filters);
}

export async function savePayment(payment: Payment): Promise<void> {
  await getAdminFirestore()
    .collection(PAYMENTS_COLLECTION)
    .doc(payment.id)
    .set(sanitize(payment));
}

async function findPayment(paymentId: string): Promise<Payment> {
  const payment = await getPayment(paymentId);
  if (!payment) throw new FinanceError("PAYMENT_NOT_FOUND");
  return payment;
}

/** Payments on an order that still count as the active capture. */
async function findActivePayment(orderId: string): Promise<Payment | undefined> {
  const payments = await getPaymentsWhere("orderId", orderId);
  return payments.find(
    (p) => p.paymentStatus !== "declined" && p.paymentStatus !== "refunded"
  );
}

/**
 * Server counterpart of the store's `syncOrderPayment` — mirrors a payment
 * status change back onto the order document (plain update).
 */
async function syncOrderPaymentStatus(
  orderId: string,
  next: Order["paymentStatus"]
): Promise<void> {
  if (!orderId) return;

  const ref = getAdminFirestore().collection("orders").doc(orderId);
  const snapshot = await ref.get();

  if (!snapshot.exists) return;

  await ref.update({
    paymentStatus: next,
    updatedAt: nowIso(),
  });
}

// ─── Mutations (ported line-by-line from lib/finance/store.ts) ──────────────

export async function verifyPayment(
  paymentId: string,
  options: { note?: string } = {},
  admin: AuthenticatedAdmin
): Promise<Payment> {
  const payment = await findPayment(paymentId);

  if (payment.verificationStatus === "verified") throw new FinanceError("PAYMENT_ALREADY_VERIFIED");
  if (payment.verificationStatus === "declined") throw new FinanceError("PAYMENT_ALREADY_DECLINED");
  if (payment.paymentStatus === "refunded") throw new FinanceError("PAYMENT_REFUNDED");

  const previous = payment.paymentStatus;
  const at = nowIso();
  const stamp = adminStamp(admin);

  payment.verificationStatus = "verified";
  payment.verifiedBy = stamp.name;
  payment.verifiedAt = at;
  payment.payoutState = "eligible";
  payment.paymentStatus = payment.grossAmount < payment.orderAmount ? "partially_paid" : "verified";
  payment.adminNote = options.note ?? payment.adminNote;
  payment.updatedAt = at;
  payment.history.push({
    action: "verified",
    status: payment.paymentStatus,
    by: stamp.name,
    at,
    note: options.note ?? "Payment verified — amount credited to shopkeeper earnings.",
  });

  await savePayment(payment);

  await syncOrderPaymentStatus(
    payment.orderId,
    payment.grossAmount >= payment.orderAmount ? "paid" : "partially_paid"
  );

  const shop = await getShopInfo(payment.shopkeeperId);

  await writeAudit({
    action: "PAYMENT_VERIFIED",
    paymentId: payment.id,
    orderId: payment.orderId,
    userId: payment.userId,
    shopkeeperId: payment.shopkeeperId,
    adminId: stamp.id,
    adminName: stamp.name,
    previousStatus: previous,
    newStatus: payment.paymentStatus,
    amount: payment.grossAmount,
    note: options.note,
    timestamp: at,
  });

  await Promise.all([
    writeNotification({
      audience: "admin",
      type: "payment_verified",
      title: "Payment verified",
      subtitle: `${payment.id} • ₹${payment.grossAmount.toLocaleString("en-IN")} • ${payment.shopName}`,
      entityId: payment.id,
      entityType: "payment",
      timestamp: at,
    }),
    writeNotification({
      audience: "shopkeeper",
      type: "payment_verified",
      title: "Earnings credited",
      subtitle: `₹${payment.grossAmount.toLocaleString("en-IN")} added to ${shop?.shopName ?? payment.shopName} earnings`,
      entityId: payment.id,
      entityType: "payment",
      timestamp: at,
    }),
    writeNotification({
      audience: "customer",
      type: "payment_verified",
      title: "Payment confirmed",
      subtitle: `Payment for ${payment.orderId} has been confirmed`,
      entityId: payment.id,
      entityType: "payment",
      timestamp: at,
    }),
  ]);

  return payment;
}

export async function declinePayment(
  paymentId: string,
  options: { reason: string; otherReason?: string; note?: string },
  admin: AuthenticatedAdmin
): Promise<Payment> {
  const payment = await findPayment(paymentId);

  if (payment.verificationStatus === "declined") throw new FinanceError("PAYMENT_ALREADY_DECLINED");
  if (payment.verificationStatus === "verified") {
    if (payment.payoutState !== "eligible") throw new FinanceError("PAYMENT_LOCKED_BY_PAYOUT");
    throw new FinanceError("PAYMENT_ALREADY_VERIFIED");
  }
  if (payment.paymentStatus === "refunded") throw new FinanceError("PAYMENT_REFUNDED");
  if (!options.reason) throw new FinanceError("INVALID_AMOUNT", "A decline reason is required.");

  const previous = payment.paymentStatus;
  const at = nowIso();
  const stamp = adminStamp(admin);
  const reason = options.reason === "Other" ? options.otherReason || "Other" : options.reason;

  payment.paymentStatus = "declined";
  payment.verificationStatus = "declined";
  payment.payoutState = "not_eligible";
  payment.declineReason = options.reason;
  payment.declineReasonOther = options.reason === "Other" ? options.otherReason : undefined;
  payment.adminNote = options.note ?? payment.adminNote;
  payment.updatedAt = at;
  payment.history.push({
    action: "declined",
    status: "declined",
    by: stamp.name,
    at,
    reason,
    note: options.note,
  });

  await savePayment(payment);

  const others = await getPaymentsWhere("orderId", payment.orderId);
  const otherActive = others.find(
    (p) =>
      p.id !== payment.id &&
      p.paymentStatus !== "declined" &&
      p.paymentStatus !== "refunded"
  );
  if (!otherActive) await syncOrderPaymentStatus(payment.orderId, "unpaid");

  await writeAudit({
    action: "PAYMENT_DECLINED",
    paymentId: payment.id,
    orderId: payment.orderId,
    userId: payment.userId,
    shopkeeperId: payment.shopkeeperId,
    adminId: stamp.id,
    adminName: stamp.name,
    previousStatus: previous,
    newStatus: "declined",
    amount: payment.grossAmount,
    reason,
    note: options.note,
    timestamp: at,
  });

  await Promise.all([
    writeNotification({
      audience: "admin",
      type: "payment_declined",
      title: "Payment declined",
      subtitle: `${payment.id} • ${reason}`,
      entityId: payment.id,
      entityType: "payment",
      timestamp: at,
    }),
    writeNotification({
      audience: "customer",
      type: "payment_declined",
      title: "Payment verification issue",
      subtitle: `Payment ${payment.id} could not be verified — ${reason}`,
      entityId: payment.id,
      entityType: "payment",
      timestamp: at,
    }),
  ]);

  return payment;
}

export async function refundPayment(
  paymentId: string,
  options: { reason?: string } = {},
  admin: AuthenticatedAdmin
): Promise<Payment> {
  const payment = await findPayment(paymentId);

  if (payment.paymentStatus === "refunded") throw new FinanceError("PAYMENT_REFUNDED");
  if (payment.payoutState === "locked" || payment.payoutState === "released") {
    throw new FinanceError("PAYMENT_LOCKED_BY_PAYOUT");
  }
  if (payment.verificationStatus !== "verified") {
    throw new FinanceError("PAYMENT_ALREADY_PROCESSED", "Only verified payments can be refunded.");
  }

  const previous = payment.paymentStatus;
  const at = nowIso();
  const stamp = adminStamp(admin);

  payment.paymentStatus = "refunded";
  payment.payoutState = "not_eligible";
  payment.refundedAt = at;
  payment.updatedAt = at;
  payment.history.push({
    action: "refunded",
    status: "refunded",
    by: stamp.name,
    at,
    reason: options.reason ?? "Refund initiated by admin",
  });

  await savePayment(payment);

  await syncOrderPaymentStatus(payment.orderId, "refunded");

  await writeAudit({
    action: "REFUND_CREATED",
    paymentId: payment.id,
    orderId: payment.orderId,
    userId: payment.userId,
    shopkeeperId: payment.shopkeeperId,
    adminId: stamp.id,
    adminName: stamp.name,
    previousStatus: previous,
    newStatus: "refunded",
    amount: payment.grossAmount,
    reason: options.reason,
    timestamp: at,
  });

  await Promise.all([
    writeNotification({
      audience: "admin",
      type: "payment_refunded",
      title: "Payment refunded",
      subtitle: `${payment.id} • ₹${payment.grossAmount.toLocaleString("en-IN")}`,
      entityId: payment.id,
      entityType: "payment",
      timestamp: at,
    }),
    writeNotification({
      audience: "customer",
      type: "payment_refunded",
      title: "Refund processed",
      subtitle: `₹${payment.grossAmount.toLocaleString("en-IN")} refunded for ${payment.orderId}`,
      entityId: payment.id,
      entityType: "payment",
      timestamp: at,
    }),
  ]);

  return payment;
}

// ─── Automatic payment recording (store `recordOrderPaymentChange`) ─────────

/**
 * Records a payment automatically when an order settles — payments are
 * never keyed in manually. Idempotent: an order with an active payment
 * (or an unsettled order) produces no writes.
 */
export async function recordOrderPaymentChange(
  order: Order,
  admin: AuthenticatedAdmin
): Promise<Payment | null> {
  const settled = order.paymentStatus === "paid" || order.paymentStatus === "partially_paid";
  const active = await findActivePayment(order.id);

  if (order.paymentStatus === "refunded") {
    const candidates = await getPaymentsWhere("orderId", order.id);
    for (const payment of candidates.filter(
      (p) =>
        p.paymentStatus !== "refunded" &&
        p.paymentStatus !== "declined" &&
        p.verificationStatus === "verified" &&
        p.payoutState === "eligible"
    )) {
      try {
        await refundPayment(payment.id, { reason: "Order payment reversed" }, admin);
      } catch (error) {
        if (error instanceof FinanceError) continue;
        throw error;
      }
    }
    return null;
  }

  if (!settled) return null;
  if (active) return active;

  const at = nowIso();
  const amount = order.amountPaid > 0 ? order.amountPaid : order.totalAmount;
  const id = nextPaymentId();
  const payment: Payment = {
    id,
    orderId: order.id,
    userId: order.userId,
    userName: order.userName,
    userEmail: order.userEmail,
    userPhone: order.userPhone,
    shopkeeperId: order.shopkeeperId,
    shopName: order.shopkeeperName,
    shopkeeperOwner: order.shopkeeperOwner,
    shopkeeperPhone: order.shopkeeperPhone,
    orderType: "Print Order",
    orderDate: order.createdAt,
    paymentDate: at,
    orderAmount: order.totalAmount,
    grossAmount: amount,
    eligibleShopkeeperAmount: amount,
    paymentMethod: paymentMethodFor(order.id),
    transactionId: `TXN-${order.id.replace("OMX-", "")}-${Math.floor(1000 + Math.random() * 8999)}`,
    gatewayReference: `GP-${order.id.replace("OMX-", "")}-${Math.floor(100 + Math.random() * 899)}`,
    utrNumber: String(620490000000 + Math.floor(Math.random() * 999999)),
    invoiceNumber: `INV-2026-${order.id.replace("OMX-", "")}`,
    paymentStatus: "verification_required",
    verificationStatus: "pending",
    payoutState: "not_eligible",
    history: [
      {
        action: "created",
        status: "verification_required",
        by: "Customer Payment Gateway",
        at,
        note: "Amount received in the company payment account.",
      },
    ],
    createdAt: at,
    updatedAt: at,
  };

  await savePayment(payment);

  await writeAudit({
    action: "PAYMENT_RECEIVED",
    paymentId: payment.id,
    orderId: payment.orderId,
    userId: payment.userId,
    shopkeeperId: payment.shopkeeperId,
    adminId: "SYSTEM",
    adminName: "Payment Gateway",
    newStatus: "verification_required",
    amount: payment.grossAmount,
    timestamp: at,
  });

  await Promise.all([
    writeNotification({
      audience: "admin",
      type: "payment_received",
      title: "New customer payment",
      subtitle: `${payment.userName} • ₹${payment.grossAmount.toLocaleString("en-IN")} • ${payment.orderId}`,
      entityId: payment.id,
      entityType: "payment",
      timestamp: at,
    }),
    writeNotification({
      audience: "admin",
      type: "payment_verification_required",
      title: "Payment requires verification",
      subtitle: `${payment.id} • ₹${payment.grossAmount.toLocaleString("en-IN")}`,
      entityId: payment.id,
      entityType: "payment",
      timestamp: at,
    }),
  ]);

  return payment;
}

/**
 * Reconcile-on-read — brings payment docs in line with settled/refunded
 * orders before finance reads are served. Idempotent: only creates or
 * refunds when the store would have done the same.
 */
export async function reconcilePayments(
  admin: AuthenticatedAdmin
): Promise<void> {
  const [orders, payments] = await Promise.all([
    listAllOrders(),
    listAllPayments(),
  ]);

  const byOrder = new Map<string, Payment[]>();
  payments.forEach((payment) => {
    const bucket = byOrder.get(payment.orderId);
    if (bucket) bucket.push(payment);
    else byOrder.set(payment.orderId, [payment]);
  });

  const relevant = orders.filter(
    (order) =>
      order.paymentStatus === "paid" ||
      order.paymentStatus === "partially_paid" ||
      order.paymentStatus === "refunded"
  );

  for (const order of relevant) {
    const orderPayments = byOrder.get(order.id) ?? [];

    const hasActive = orderPayments.some(
      (p) => p.paymentStatus !== "declined" && p.paymentStatus !== "refunded"
    );
    const needsRefund = orderPayments.some(
      (p) =>
        p.paymentStatus !== "refunded" &&
        p.paymentStatus !== "declined" &&
        p.verificationStatus === "verified" &&
        p.payoutState === "eligible"
    );

    if (order.paymentStatus === "refunded") {
      if (!needsRefund) continue;
    } else if (hasActive) {
      continue;
    }

    try {
      await recordOrderPaymentChange(order, admin);
    } catch (error) {
      if (error instanceof FinanceError) continue;
      throw error;
    }
  }
}

/** Reconcile only the order backing a single payment read. */
export async function reconcileOrderForPayment(
  payment: Payment,
  admin: AuthenticatedAdmin
): Promise<void> {
  const order = await getOrder(payment.orderId);
  if (!order) return;

  try {
    await recordOrderPaymentChange(order, admin);
  } catch (error) {
    if (error instanceof FinanceError) return;
    throw error;
  }
}

/**
 * Client-triggered sync (orders page) — mirrors the client-supplied payment
 * status onto the order document, then runs the same ported recording logic.
 */
export async function syncOrderPayment(
  order: Order,
  admin: AuthenticatedAdmin
): Promise<Payment | null> {
  await syncOrderPaymentStatus(order.id, order.paymentStatus);
  return recordOrderPaymentChange(order, admin);
}
