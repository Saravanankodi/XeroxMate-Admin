import "server-only";

import { FinanceError } from "@/lib/finance/errors";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { AuthenticatedAdmin } from "@/lib/firebase/auth";
import type {
  Payment,
  PayoutFilters,
  PayoutRequest,
  PayoutStatus,
} from "@/types/payment";
import { writeAudit } from "./audit";
import { balanceFor } from "./balances";
import {
  adjustWallet,
  adminStamp,
  commissionFor,
  filterPayouts,
  getCommissionRate,
  getPlatformSettings,
  LOCKING_STATUSES,
  mapPayout,
  nextPayoutId,
  nextRequestId,
  nowIso,
  requireShop,
  round2,
  sanitize,
} from "./helpers";
import {
  getPayment,
  getPaymentsWhere,
  listAllPayments,
  savePayment,
} from "./payments";
import { writeNotification } from "./notifications";

const PAYOUTS_COLLECTION = "payouts";

// ─── Read helpers ────────────────────────────────────────────────────────────

export async function listAllPayouts(): Promise<PayoutRequest[]> {
  const snapshot = await getAdminFirestore()
    .collection(PAYOUTS_COLLECTION)
    .get();

  return snapshot.docs.map((document) =>
    mapPayout(document.id, document.data())
  );
}

export async function getPayout(
  requestId: string
): Promise<PayoutRequest | null> {
  if (!requestId) return null;

  const document = await getAdminFirestore()
    .collection(PAYOUTS_COLLECTION)
    .doc(requestId)
    .get();

  if (!document.exists) return null;

  return mapPayout(document.id, document.data() ?? {});
}

export async function listPayouts(
  filters: PayoutFilters = {}
): Promise<PayoutRequest[]> {
  const requests = await listAllPayouts();
  return filterPayouts(requests, filters);
}

export async function payoutHistory(
  shopkeeperId: string
): Promise<PayoutRequest[]> {
  const snapshot = await getAdminFirestore()
    .collection(PAYOUTS_COLLECTION)
    .where("shopkeeperId", "==", shopkeeperId)
    .get();

  return snapshot.docs
    .map((document) => mapPayout(document.id, document.data()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export interface PayoutRequestInput {
  shopkeeperId: string;
  requestedAmount: number;
  payoutMethod: PayoutRequest["payoutMethod"];
  accountDetails: string;
}

/** Verified customer payments backing a payout request (audit traceability). */
export async function contributingPayments(input: {
  shopkeeperId: string;
  paymentIds: string[];
}): Promise<Payment[]> {
  const payments = await listAllPayments();

  if (input.paymentIds.length > 0) {
    return input.paymentIds
      .map((id) => payments.find((p) => p.id === id))
      .filter((p): p is Payment => Boolean(p));
  }

  return payments
    .filter(
      (p) => p.shopkeeperId === input.shopkeeperId && p.verificationStatus === "verified"
    )
    .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
}

async function findRequest(requestId: string): Promise<PayoutRequest> {
  const request = await getPayout(requestId);
  if (!request) throw new FinanceError("PAYOUT_NOT_FOUND");
  return request;
}

async function savePayout(request: PayoutRequest): Promise<void> {
  await getAdminFirestore()
    .collection(PAYOUTS_COLLECTION)
    .doc(request.id)
    .set(sanitize(request));
}

function assertStatus(request: PayoutRequest, allowed: PayoutStatus[]): void {
  if (!allowed.includes(request.status)) throw new FinanceError("PAYOUT_INVALID_STATE");
}

function pushTimeline(
  request: PayoutRequest,
  entry: { status: PayoutStatus; note?: string; reference?: string; by?: string },
  fallbackBy: string
): string {
  const at = nowIso();
  request.timeline.push({
    status: entry.status,
    at,
    by: entry.by ?? fallbackBy,
    note: entry.note,
    reference: entry.reference,
  });
  request.status = entry.status;
  request.updatedAt = at;
  return at;
}

// ─── Payment allocation (store `allocateEligiblePayments`) ──────────────────

async function allocateEligiblePayments(
  shopkeeperId: string,
  amount: number,
  predicate: (p: Payment) => boolean = () => true
): Promise<string[]> {
  const payments = await getPaymentsWhere("shopkeeperId", shopkeeperId);

  const candidates = payments
    .filter(
      (p) =>
        p.shopkeeperId === shopkeeperId &&
        p.verificationStatus === "verified" &&
        predicate(p)
    )
    .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

  const ids: string[] = [];
  let total = 0;
  for (const payment of candidates) {
    if (total >= amount) break;
    ids.push(payment.id);
    total = round2(total + payment.eligibleShopkeeperAmount);
  }
  return ids;
}

async function releasePayments(
  request: PayoutRequest,
  reason: string,
  at: string,
  by: string
): Promise<void> {
  for (const pid of request.paymentIds) {
    const payment = await getPayment(pid);
    if (!payment || payment.payoutRequestId !== request.id) continue;

    payment.payoutState = "eligible";
    payment.paymentStatus =
      payment.grossAmount < payment.orderAmount ? "partially_paid" : "verified";
    payment.payoutRequestId = undefined;
    payment.payoutId = undefined;
    payment.updatedAt = at;
    payment.history.push({
      action: "released",
      status: payment.paymentStatus,
      by,
      at,
      note: reason,
    });

    await savePayment(payment);
  }
}

async function lockPayments(
  request: PayoutRequest,
  paymentIds: string[],
  at: string,
  by: string
): Promise<void> {
  for (const pid of paymentIds) {
    const payment = await getPayment(pid);
    if (!payment) continue;

    payment.payoutState = "locked";
    payment.paymentStatus = "payout_pending";
    payment.payoutRequestId = request.id;
    payment.updatedAt = at;
    payment.history.push({
      action: "locked",
      status: "payout_pending",
      by,
      at,
      note: `Reserved for payout request ${request.id}.`,
    });

    await savePayment(payment);
  }
}

async function completePaymentAllocation(
  request: PayoutRequest,
  at: string,
  by: string
): Promise<void> {
  for (const pid of request.paymentIds) {
    const payment = await getPayment(pid);
    if (!payment) continue;

    payment.payoutState = "released";
    payment.paymentStatus = "completed";
    payment.payoutId = request.payoutId;
    payment.updatedAt = at;
    payment.history.push({
      action: "released",
      status: "completed",
      by,
      at,
      note: `Included in completed payout ${request.payoutId ?? request.id}.`,
    });

    await savePayment(payment);
  }
}

/** Releases the wallet lock a payout request holds on the shop ledger. */
async function releaseWalletLock(request: PayoutRequest): Promise<void> {
  await adjustWallet(request.shopkeeperId, {
    pendingDelta: -request.requestedAmount,
  });
}

// ─── Mutations (ported from lib/finance/store.ts) ───────────────────────────

export async function createPayout(
  input: PayoutRequestInput,
  admin?: AuthenticatedAdmin
): Promise<PayoutRequest> {
  const shop = await requireShop(input.shopkeeperId);
  const amount = round2(Number(input.requestedAmount));

  if (!Number.isFinite(amount) || amount <= 0) throw new FinanceError("INVALID_AMOUNT");

  const settings = await getPlatformSettings();
  if (amount < settings.minWithdrawalAmount) throw new FinanceError("BELOW_MINIMUM");

  const ledger = await balanceFor(input.shopkeeperId);

  const existing = await getAdminFirestore()
    .collection(PAYOUTS_COLLECTION)
    .where("shopkeeperId", "==", input.shopkeeperId)
    .get();
  const open = existing.docs
    .map((document) => mapPayout(document.id, document.data()))
    .find((r) => LOCKING_STATUSES.includes(r.status));

  if (open) throw new FinanceError("DUPLICATE_REQUEST");
  if (amount > ledger.availableBalance) throw new FinanceError("INSUFFICIENT_BALANCE");

  const at = nowIso();
  const stamp = admin ? adminStamp(admin) : undefined;
  const request: PayoutRequest = {
    id: nextRequestId(),
    shopkeeperId: input.shopkeeperId,
    shopkeeperName: shop.ownerName,
    shopName: shop.shopName,
    shopkeeperPhone: shop.phone,
    requestedAmount: amount,
    eligibleBalanceAtRequest: ledger.availableBalance,
    status: "requested",
    payoutMethod: input.payoutMethod,
    accountDetails: input.accountDetails || "XXXX0000",
    paymentIds: [],
    timeline: [
      {
        status: "requested",
        at,
        by: stamp ? stamp.name : `${shop.ownerName} (Shopkeeper)`,
        note: stamp
          ? "Payout request created from the admin console."
          : "Payout requested from the shopkeeper app.",
      },
    ],
    createdAt: at,
    updatedAt: at,
  };

  await savePayout(request);

  await adjustWallet(request.shopkeeperId, { pendingDelta: amount });

  await writeAudit({
    action: "PAYOUT_REQUESTED",
    payoutRequestId: request.id,
    shopkeeperId: request.shopkeeperId,
    adminId: stamp ? stamp.id : request.shopkeeperId,
    adminName: stamp ? stamp.name : `${shop.ownerName} (Shopkeeper)`,
    newStatus: "requested",
    amount,
    note: `Available balance at request: ₹${ledger.availableBalance.toLocaleString("en-IN")}`,
    timestamp: at,
  });

  await Promise.all([
    writeNotification({
      audience: "admin",
      type: "payout_requested",
      title: "New shopkeeper payout request",
      subtitle: `${shop.shopName} • ₹${amount.toLocaleString("en-IN")} • ${request.id}`,
      entityId: request.id,
      entityType: "payout",
      timestamp: at,
    }),
    writeNotification({
      audience: "shopkeeper",
      type: "payout_requested",
      title: "Payout request received",
      subtitle: `${request.id} • ₹${amount.toLocaleString("en-IN")}`,
      entityId: request.id,
      entityType: "payout",
      timestamp: at,
    }),
  ]);

  return request;
}

export async function holdPayout(
  requestId: string,
  options: { note?: string } = {},
  admin: AuthenticatedAdmin
): Promise<PayoutRequest> {
  const request = await findRequest(requestId);
  assertStatus(request, ["requested", "approved"]);

  const stamp = adminStamp(admin);
  const previous = request.status;
  const at = pushTimeline(
    request,
    {
      status: "under_review",
      note: options.note ?? "Placed under review by admin.",
    },
    stamp.name
  );

  await savePayout(request);

  await releaseWalletLock(request);

  await writeAudit({
    action: "PAYOUT_ON_HOLD",
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: stamp.id,
    adminName: stamp.name,
    previousStatus: previous,
    newStatus: "under_review",
    amount: request.requestedAmount,
    note: options.note,
    timestamp: at,
  });

  return request;
}

export async function approvePayout(
  requestId: string,
  options: { note?: string } = {},
  admin: AuthenticatedAdmin
): Promise<PayoutRequest> {
  const request = await findRequest(requestId);
  assertStatus(request, ["requested", "under_review"]);

  const stamp = adminStamp(admin);

  // Server-side validation: requested amount must fit the earned balance
  // after accounting for completed payouts and other locked requests.
  const ledger = await balanceFor(request.shopkeeperId);
  const otherLocks = round2(ledger.lockedAmount - request.requestedAmount);
  const maxAllowed = round2(ledger.verifiedEarnings - ledger.paidOutAmount - otherLocks);
  if (request.requestedAmount > maxAllowed) throw new FinanceError("INSUFFICIENT_BALANCE");

  // Re-approval after a hold re-validates the reservation from scratch.
  if (request.paymentIds.length > 0) {
    await releasePayments(
      request,
      `Reservation re-validated for payout request ${request.id}.`,
      nowIso(),
      stamp.name
    );
    request.paymentIds = [];
  }

  const rate = await getCommissionRate();
  const { commission, net } = commissionFor(request.requestedAmount, rate);
  if (net <= 0) throw new FinanceError("INVALID_AMOUNT");

  const at = pushTimeline(
    request,
    {
      status: "approved",
      note: options.note ?? "Commission applied and payout amount reserved.",
    },
    stamp.name
  );

  const paymentIds = await allocateEligiblePayments(
    request.shopkeeperId,
    request.requestedAmount
  );
  await lockPayments(request, paymentIds, at, stamp.name);

  request.payoutId = request.payoutId ?? nextPayoutId();
  request.commissionRate = rate;
  request.internalCommission = commission;
  request.netPayout = net;
  request.paymentIds = paymentIds;
  request.adminNote = options.note ?? request.adminNote;

  await savePayout(request);

  await writeAudit({
    action: "PAYOUT_APPROVED",
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: stamp.id,
    adminName: stamp.name,
    previousStatus: "under_review",
    newStatus: "approved",
    amount: request.requestedAmount,
    note: options.note,
    timestamp: at,
  });
  await writeAudit({
    action: "COMMISSION_CALCULATED",
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: stamp.id,
    adminName: stamp.name,
    amount: commission,
    note: `Gross ₹${request.requestedAmount.toLocaleString("en-IN")} − ${rate}% commission = Net ₹${net.toLocaleString("en-IN")}`,
    timestamp: at,
  });

  await Promise.all([
    writeNotification({
      audience: "admin",
      type: "payout_approved",
      title: "Payout request approved",
      subtitle: `${request.shopName} • Net ₹${net.toLocaleString("en-IN")} • ${request.id}`,
      entityId: request.id,
      entityType: "payout",
      timestamp: at,
    }),
    writeNotification({
      audience: "shopkeeper",
      type: "payout_approved",
      title: "Payout request approved",
      subtitle: `${request.id} is approved and being processed`,
      entityId: request.id,
      entityType: "payout",
      timestamp: at,
    }),
  ]);

  return request;
}

export async function processPayout(
  requestId: string,
  options: { note?: string } = {},
  admin: AuthenticatedAdmin
): Promise<PayoutRequest> {
  const request = await findRequest(requestId);
  assertStatus(request, ["approved"]);

  const stamp = adminStamp(admin);
  const previous = request.status;
  const at = pushTimeline(
    request,
    {
      status: "processing",
      note: options.note ?? "Bank transfer initiated by finance team.",
    },
    stamp.name
  );

  await savePayout(request);

  await writeAudit({
    action: "PAYOUT_PROCESSING",
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: stamp.id,
    adminName: stamp.name,
    previousStatus: previous,
    newStatus: "processing",
    amount: request.requestedAmount,
    note: options.note,
    timestamp: at,
  });

  await Promise.all([
    writeNotification({
      audience: "admin",
      type: "payout_processing",
      title: "Payout processing",
      subtitle: `${request.shopName} • ₹${request.requestedAmount.toLocaleString("en-IN")} • ${request.id}`,
      entityId: request.id,
      entityType: "payout",
      timestamp: at,
    }),
    writeNotification({
      audience: "shopkeeper",
      type: "payout_processing",
      title: "Payout processing",
      subtitle: `${request.id} is being transferred`,
      entityId: request.id,
      entityType: "payout",
      timestamp: at,
    }),
  ]);

  return request;
}

export async function completePayout(
  requestId: string,
  options: { reference?: string; note?: string } = {},
  admin: AuthenticatedAdmin
): Promise<PayoutRequest> {
  const request = await findRequest(requestId);
  assertStatus(request, ["processing"]);

  const stamp = adminStamp(admin);
  const previous = request.status;
  const reference =
    options.reference?.trim() ||
    `IMPS/${new Date().toISOString().slice(2, 10).replace(/-/g, "")}/${Math.floor(100000 + Math.random() * 899999)}`;
  const at = pushTimeline(
    request,
    {
      status: "completed",
      note: options.note ?? "Funds credited to the shopkeeper account.",
      reference,
    },
    stamp.name
  );

  request.transactionReference = reference;
  request.completedAt = at;

  await completePaymentAllocation(request, at, stamp.name);

  await savePayout(request);

  const net =
    request.netPayout ??
    commissionFor(
      request.requestedAmount,
      request.commissionRate ?? (await getCommissionRate())
    ).net;

  await adjustWallet(request.shopkeeperId, {
    pendingDelta: -request.requestedAmount,
    withdrawnDelta: net,
  });

  await writeAudit({
    action: "PAYOUT_COMPLETED",
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: stamp.id,
    adminName: stamp.name,
    previousStatus: previous,
    newStatus: "completed",
    amount: request.netPayout ?? request.requestedAmount,
    note: options.note,
    timestamp: at,
  });

  await Promise.all([
    writeNotification({
      audience: "admin",
      type: "payout_completed",
      title: "Payout completed",
      subtitle: `${request.shopName} • ₹${(request.netPayout ?? request.requestedAmount).toLocaleString("en-IN")} • ${request.id}`,
      entityId: request.id,
      entityType: "payout",
      timestamp: at,
    }),
    writeNotification({
      audience: "shopkeeper",
      type: "payout_completed",
      title: "Payout completed",
      subtitle: `₹${(request.netPayout ?? request.requestedAmount).toLocaleString("en-IN")} credited — ${request.id}`,
      entityId: request.id,
      entityType: "payout",
      timestamp: at,
    }),
  ]);

  return request;
}

export async function rejectPayout(
  requestId: string,
  options: { reason: string; note?: string },
  admin: AuthenticatedAdmin
): Promise<PayoutRequest> {
  const request = await findRequest(requestId);
  assertStatus(request, ["requested", "under_review", "approved"]);

  if (!options.reason) throw new FinanceError("INVALID_AMOUNT", "A rejection reason is required.");

  const stamp = adminStamp(admin);
  const previous = request.status;
  const at = nowIso();

  await releasePayments(
    request,
    `Removed from payout request ${request.id} — request rejected.`,
    at,
    stamp.name
  );

  request.timeline.push({
    status: "rejected",
    at,
    by: stamp.name,
    note: options.note ?? options.reason,
  });
  request.status = "rejected";
  request.rejectReason = options.reason;
  request.adminNote = options.note ?? request.adminNote;
  request.updatedAt = at;
  request.paymentIds = [];

  await savePayout(request);

  await releaseWalletLock(request);

  await writeAudit({
    action: "PAYOUT_REJECTED",
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: stamp.id,
    adminName: stamp.name,
    previousStatus: previous,
    newStatus: "rejected",
    amount: request.requestedAmount,
    reason: options.reason,
    note: options.note,
    timestamp: at,
  });

  await Promise.all([
    writeNotification({
      audience: "admin",
      type: "payout_rejected",
      title: "Payout request rejected",
      subtitle: `${request.shopName} • ${options.reason} • ${request.id}`,
      entityId: request.id,
      entityType: "payout",
      timestamp: at,
    }),
    writeNotification({
      audience: "shopkeeper",
      type: "payout_rejected",
      title: "Payout request rejected",
      subtitle: `${request.id} — ${options.reason}`,
      entityId: request.id,
      entityType: "payout",
      timestamp: at,
    }),
  ]);

  return request;
}

export async function failPayout(
  requestId: string,
  options: { reason: string; note?: string },
  admin: AuthenticatedAdmin
): Promise<PayoutRequest> {
  const request = await findRequest(requestId);
  assertStatus(request, ["processing", "approved"]);

  const stamp = adminStamp(admin);
  const previous = request.status;
  const at = nowIso();

  // Failed payouts must never permanently deduct the balance.
  await releasePayments(
    request,
    `Payout failed — amount returned to the eligible balance.`,
    at,
    stamp.name
  );

  request.timeline.push({
    status: "failed",
    at,
    by: stamp.name,
    note: options.note ?? options.reason,
  });
  request.status = "failed";
  request.rejectReason = options.reason;
  request.adminNote = options.note ?? request.adminNote;
  request.updatedAt = at;
  request.paymentIds = [];

  await savePayout(request);

  await releaseWalletLock(request);

  await writeAudit({
    action: "PAYOUT_FAILED",
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: stamp.id,
    adminName: stamp.name,
    previousStatus: previous,
    newStatus: "failed",
    amount: request.requestedAmount,
    reason: options.reason,
    note: options.note,
    timestamp: at,
  });

  await writeNotification({
    audience: "admin",
    type: "payout_failed",
    title: "Payout failed",
    subtitle: `${request.shopName} • ${options.reason} — balance restored`,
    entityId: request.id,
    entityType: "payout",
    timestamp: at,
  });

  return request;
}

export async function cancelPayout(
  requestId: string,
  options: { reason?: string } = {},
  admin: AuthenticatedAdmin
): Promise<PayoutRequest> {
  const request = await findRequest(requestId);
  assertStatus(request, ["requested", "under_review"]);

  const stamp = adminStamp(admin);
  const previous = request.status;
  const at = nowIso();

  await releasePayments(
    request,
    `Request cancelled — amount returned to the eligible balance.`,
    at,
    stamp.name
  );

  request.timeline.push({
    status: "cancelled",
    at,
    by: stamp.name,
    note: options.reason ?? "Cancelled by admin.",
  });
  request.status = "cancelled";
  request.updatedAt = at;
  request.paymentIds = [];

  await savePayout(request);

  await releaseWalletLock(request);

  await writeAudit({
    action: "PAYOUT_CANCELLED",
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: stamp.id,
    adminName: stamp.name,
    previousStatus: previous,
    newStatus: "cancelled",
    amount: request.requestedAmount,
    reason: options.reason,
    timestamp: at,
  });

  await writeNotification({
    audience: "admin",
    type: "payout_rejected",
    title: "Payout request cancelled",
    subtitle: `${request.shopName} • ${request.id}`,
    entityId: request.id,
    entityType: "payout",
    timestamp: at,
  });

  return request;
}

export async function addPayoutNote(
  requestId: string,
  note: string,
  admin: AuthenticatedAdmin
): Promise<PayoutRequest> {
  const request = await findRequest(requestId);
  if (!note.trim()) throw new FinanceError("INVALID_AMOUNT", "Note cannot be empty.");

  const stamp = adminStamp(admin);

  request.adminNote = note.trim();
  request.updatedAt = nowIso();

  await savePayout(request);

  await writeAudit({
    action: "PAYOUT_NOTE_ADDED",
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: stamp.id,
    adminName: stamp.name,
    newStatus: request.status,
    note: note.trim(),
    timestamp: request.updatedAt,
  });

  return request;
}
