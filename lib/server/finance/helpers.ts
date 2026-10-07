import "server-only";

import {
  COMMISSION_RATE_BOUNDS,
  DEFAULT_COMMISSION_RATE,
} from "@/lib/finance/config";
import { FinanceError } from "@/lib/finance/errors";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { AuthenticatedAdmin } from "@/lib/firebase/auth";
import { query } from "@/lib/server/http";
import type {
  AuditLogEntry,
  AuditLogFilters,
  Payment,
  PaymentFilters,
  PaymentMethod,
  PaymentStatus,
  PaymentVerificationStatus,
  PayoutFilters,
  PayoutMethod,
  PayoutRequest,
  PayoutStatus,
} from "@/types/payment";
import { writeAudit } from "./audit";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Payout states that hold (lock) funds out of the available balance. */
export const LOCKING_STATUSES: PayoutStatus[] = [
  "requested",
  "under_review",
  "approved",
  "processing",
];

/** Fallback minimum payout when `platform/settings` is missing. */
export const DEFAULT_MIN_PAYOUT = 100;

const PAYMENT_METHOD_CYCLE: PaymentMethod[] = [
  "upi", "card", "net_banking", "upi", "wallet", "upi", "cod", "card", "net_banking", "upi",
];

// ─── Numeric & time helpers (ported from lib/finance/store.ts) ──────────────

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function isToday(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function withinLastDays(iso: string, days: number): boolean {
  return new Date(iso).getTime() >= Date.now() - days * 86400000;
}

export function commissionFor(
  amount: number,
  rate: number
): { commission: number; net: number } {
  const commission = round2((amount * rate) / 100);
  return { commission, net: round2(amount - commission) };
}

export function paymentMethodFor(orderId: string): PaymentMethod {
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) hash = (hash * 31 + orderId.charCodeAt(i)) % 9973;
  return PAYMENT_METHOD_CYCLE[hash % PAYMENT_METHOD_CYCLE.length];
}

// ─── Ids ─────────────────────────────────────────────────────────────────────

/**
 * Firestore has no in-memory counters, so ids keep the store's prefix
 * families while deriving uniqueness from the clock plus a random suffix.
 */
export function generateId(prefix: string): string {
  const time = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${time}${random}`;
}

export function nextPaymentId(): string {
  return generateId("PAY");
}

export function nextRequestId(): string {
  return generateId("PR");
}

export function nextPayoutId(): string {
  return generateId("PO");
}

export function nextAuditId(): string {
  return generateId("AUD");
}

export function nextNotificationId(): string {
  return generateId("FN");
}

// ─── Admin identity ──────────────────────────────────────────────────────────

export interface AdminStamp {
  id: string;
  name: string;
}

/**
 * Real authenticated admin for audit/timeline/verification stamps —
 * falls back to the session email, then to a generic "Admin".
 */
export function adminStamp(admin: AuthenticatedAdmin): AdminStamp {
  const record = admin.admin ?? {};
  const explicit =
    typeof record.displayName === "string" && record.displayName.trim()
      ? record.displayName.trim()
      : typeof record.name === "string" && record.name.trim()
        ? record.name.trim()
        : "";
  const name = explicit || admin.email || "Admin";
  return { id: admin.uid, name };
}

// ─── Firestore document sanitising ───────────────────────────────────────────

/**
 * Firestore rejects `undefined` field values (including nested ones inside
 * history/timeline arrays), so optional fields are dropped before writes.
 */
export function sanitize<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item)) as unknown as T;
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry !== undefined) output[key] = sanitize(entry);
    }
    return output as T;
  }

  return value;
}

// ─── Document mappers ────────────────────────────────────────────────────────

export function mapPayment(
  id: string,
  data: Record<string, unknown>
): Payment {
  return { ...(data as unknown as Payment), id };
}

export function mapPayout(
  id: string,
  data: Record<string, unknown>
): PayoutRequest {
  return { ...(data as unknown as PayoutRequest), id };
}

export function mapAudit(
  id: string,
  data: Record<string, unknown>
): AuditLogEntry {
  return { ...(data as unknown as AuditLogEntry), id };
}

// ─── Shop & wallet joins ─────────────────────────────────────────────────────

export interface ShopInfo {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
}

export interface WalletLedger {
  totalEarned: number;
  pendingRequested: number;
  withdrawn: number;
  ordersCounted: number;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function toShopInfo(
  id: string,
  data: Record<string, unknown>
): ShopInfo {
  return {
    id,
    shopName: str(data.name),
    ownerName: str(data.ownerName),
    phone: str(data.phone) || str(data.ownerPhone),
  };
}

export function toWallet(data: Record<string, unknown>): WalletLedger {
  const num = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;

  return {
    totalEarned: num(data.totalEarned),
    pendingRequested: num(data.pendingRequested),
    withdrawn: num(data.withdrawn),
    ordersCounted: num(data.ordersCounted),
  };
}

export async function getShopInfo(
  shopkeeperId: string
): Promise<ShopInfo | null> {
  if (!shopkeeperId) return null;

  const snapshot = await getAdminFirestore()
    .collection("shops")
    .doc(shopkeeperId)
    .get();

  if (!snapshot.exists) return null;

  return toShopInfo(shopkeeperId, snapshot.data() ?? {});
}

export async function requireShop(shopkeeperId: string): Promise<ShopInfo> {
  const shop = await getShopInfo(shopkeeperId);
  if (!shop) throw new FinanceError("SHOPKEEPER_NOT_FOUND");
  return shop;
}

export async function getWallet(
  shopkeeperId: string
): Promise<WalletLedger | null> {
  if (!shopkeeperId) return null;

  const snapshot = await getAdminFirestore()
    .collection("wallets")
    .doc(shopkeeperId)
    .get();

  if (!snapshot.exists) return null;

  return toWallet(snapshot.data() ?? {});
}

/**
 * Atomic wallet ledger maintenance — missing wallet docs (shop apps that
 * have not written one yet) are skipped, balances then fall back to
 * payment/payout derived figures.
 */
export async function adjustWallet(
  shopkeeperId: string,
  change: { pendingDelta?: number; withdrawnDelta?: number }
): Promise<void> {
  const pendingDelta = change.pendingDelta ?? 0;
  const withdrawnDelta = change.withdrawnDelta ?? 0;
  if (!shopkeeperId || (pendingDelta === 0 && withdrawnDelta === 0)) return;

  const db = getAdminFirestore();
  const ref = db.collection("wallets").doc(shopkeeperId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return;

    const wallet = toWallet(snapshot.data() ?? {});
    const patch: Record<string, unknown> = { updatedAt: nowIso() };

    if (pendingDelta !== 0) {
      patch.pendingRequested = round2(wallet.pendingRequested + pendingDelta);
    }
    if (withdrawnDelta !== 0) {
      patch.withdrawn = round2(wallet.withdrawn + withdrawnDelta);
    }

    transaction.update(ref, patch);
  });
}

// ─── Platform settings ───────────────────────────────────────────────────────

export interface PlatformSettings {
  minWithdrawalAmount: number;
  commissionPercent: number;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const snapshot = await getAdminFirestore()
    .collection("platform")
    .doc("settings")
    .get();

  if (!snapshot.exists) {
    return {
      minWithdrawalAmount: DEFAULT_MIN_PAYOUT,
      commissionPercent: DEFAULT_COMMISSION_RATE,
    };
  }

  const data = snapshot.data() ?? {};
  const min = Number(data.minWithdrawalAmount);
  const rate = Number(data.commissionPercent);

  return {
    minWithdrawalAmount:
      Number.isFinite(min) && min >= 0 ? min : DEFAULT_MIN_PAYOUT,
    commissionPercent: Number.isFinite(rate)
      ? rate
      : DEFAULT_COMMISSION_RATE,
  };
}

export async function getCommissionRate(): Promise<number> {
  const settings = await getPlatformSettings();
  return settings.commissionPercent;
}

export async function setCommissionRate(
  rate: number,
  admin: AuthenticatedAdmin
): Promise<number> {
  const value = round2(Number(rate));

  if (
    !Number.isFinite(value) ||
    value < COMMISSION_RATE_BOUNDS.min ||
    value > COMMISSION_RATE_BOUNDS.max
  ) {
    throw new FinanceError("COMMISSION_RATE_INVALID");
  }

  const ref = getAdminFirestore().collection("platform").doc("settings");
  const snapshot = await ref.get();
  const previous = snapshot.exists
    ? Number(
        (snapshot.data() ?? {}).commissionPercent ?? DEFAULT_COMMISSION_RATE
      )
    : DEFAULT_COMMISSION_RATE;

  if (previous === value) return value;

  await ref.set(
    sanitize({ commissionPercent: value, updatedAt: nowIso() }),
    { merge: true }
  );

  const stamp = adminStamp(admin);

  await writeAudit({
    action: "COMMISSION_RATE_UPDATED",
    adminId: stamp.id,
    adminName: stamp.name,
    previousStatus: `${previous}%`,
    newStatus: `${value}%`,
    note: "Platform commission rate updated from Platform Settings.",
  });

  return value;
}

// ─── Filter parsing (query string → typed filters) ───────────────────────────

export function parsePaymentFilters(
  params: URLSearchParams
): PaymentFilters {
  return {
    search: query.str(params, "search"),
    status: query.str(params, "status") as PaymentStatus | "",
    verificationStatus: query.str(
      params,
      "verificationStatus"
    ) as PaymentVerificationStatus | "",
    shopkeeperId: query.str(params, "shopkeeperId"),
    userId: query.str(params, "userId"),
    method: query.str(params, "method") as PaymentMethod | "",
    dateFrom: query.str(params, "dateFrom"),
    dateTo: query.str(params, "dateTo"),
    minAmount: query.num(params, "minAmount", null),
    maxAmount: query.num(params, "maxAmount", null),
    sortBy: query.str(
      params,
      "sortBy",
      "paymentDate"
    ) as PaymentFilters["sortBy"],
    sortDir:
      query.str(params, "sortDir") === "asc" ? "asc" : "desc",
    page: query.int(params, "page", 1),
    pageSize: query.int(params, "pageSize", 10),
  };
}

export function parsePayoutFilters(params: URLSearchParams): PayoutFilters {
  return {
    search: query.str(params, "search"),
    status: query.str(params, "status") as PayoutStatus | "",
    shopkeeperId: query.str(params, "shopkeeperId"),
    method: query.str(params, "method") as PayoutMethod | "",
    dateFrom: query.str(params, "dateFrom"),
    dateTo: query.str(params, "dateTo"),
    minAmount: query.num(params, "minAmount", null),
    maxAmount: query.num(params, "maxAmount", null),
    sortBy: query.str(
      params,
      "sortBy",
      "createdAt"
    ) as PayoutFilters["sortBy"],
    sortDir:
      query.str(params, "sortDir") === "asc" ? "asc" : "desc",
    page: query.int(params, "page", 1),
    pageSize: query.int(params, "pageSize", 10),
  };
}

export function parseAuditFilters(params: URLSearchParams): AuditLogFilters {
  return {
    search: query.str(params, "search"),
    action: query.str(params, "action") as AuditLogFilters["action"],
    paymentId: query.str(params, "paymentId"),
    payoutRequestId: query.str(params, "payoutRequestId"),
    shopkeeperId: query.str(params, "shopkeeperId"),
    dateFrom: query.str(params, "dateFrom"),
    dateTo: query.str(params, "dateTo"),
    page: query.int(params, "page", 1),
    pageSize: query.int(params, "pageSize", 12),
  };
}

// ─── Filter predicates (ported from lib/finance/api.ts) ──────────────────────

export function filterPayments(
  payments: Payment[],
  filters: PaymentFilters = {}
): Payment[] {
  const {
    search = "",
    status = "",
    verificationStatus = "",
    shopkeeperId = "",
    userId = "",
    method = "",
    dateFrom = "",
    dateTo = "",
    minAmount = null,
    maxAmount = null,
    sortBy = "paymentDate",
    sortDir = "desc",
  } = filters;

  let result = [...payments];

  if (search) {
    const q = search.toLowerCase();
    result = result.filter((p) =>
      [
        p.id, p.orderId, p.transactionId, p.utrNumber, p.invoiceNumber, p.gatewayReference,
        p.userName, p.userEmail, p.userPhone, p.userId, p.shopName, p.shopkeeperOwner, p.shopkeeperId,
      ].some((field) => field.toLowerCase().includes(q))
    );
  }
  if (status) result = result.filter((p) => p.paymentStatus === status);
  if (verificationStatus) result = result.filter((p) => p.verificationStatus === verificationStatus);
  if (shopkeeperId) result = result.filter((p) => p.shopkeeperId === shopkeeperId);
  if (userId) result = result.filter((p) => p.userId === userId);
  if (method) result = result.filter((p) => p.paymentMethod === method);
  if (dateFrom) result = result.filter((p) => dateOnly(p.paymentDate) >= dateFrom);
  if (dateTo) result = result.filter((p) => dateOnly(p.paymentDate) <= dateTo);
  if (minAmount !== null && minAmount !== undefined && !Number.isNaN(minAmount)) {
    result = result.filter((p) => p.grossAmount >= minAmount);
  }
  if (maxAmount !== null && maxAmount !== undefined && !Number.isNaN(maxAmount)) {
    result = result.filter((p) => p.grossAmount <= maxAmount);
  }

  result.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "grossAmount") cmp = a.grossAmount - b.grossAmount;
    else if (sortBy === "paymentStatus") cmp = a.paymentStatus.localeCompare(b.paymentStatus);
    else {
      const key = sortBy as "paymentDate" | "createdAt";
      cmp = new Date(a[key]).getTime() - new Date(b[key]).getTime();
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return result;
}

export function filterPayouts(
  requests: PayoutRequest[],
  filters: PayoutFilters = {}
): PayoutRequest[] {
  const {
    search = "",
    status = "",
    shopkeeperId = "",
    method = "",
    dateFrom = "",
    dateTo = "",
    minAmount = null,
    maxAmount = null,
    sortBy = "createdAt",
    sortDir = "desc",
  } = filters;

  let result = [...requests];

  if (search) {
    const q = search.toLowerCase();
    result = result.filter((r) =>
      [r.id, r.payoutId ?? "", r.shopName, r.shopkeeperName, r.shopkeeperId, r.shopkeeperPhone, r.transactionReference ?? ""]
        .some((field) => field.toLowerCase().includes(q))
    );
  }
  if (status) result = result.filter((r) => r.status === status);
  if (shopkeeperId) result = result.filter((r) => r.shopkeeperId === shopkeeperId);
  if (method) result = result.filter((r) => r.payoutMethod === method);
  if (dateFrom) result = result.filter((r) => dateOnly(r.createdAt) >= dateFrom);
  if (dateTo) result = result.filter((r) => dateOnly(r.createdAt) <= dateTo);
  if (minAmount !== null && minAmount !== undefined && !Number.isNaN(minAmount)) {
    result = result.filter((r) => r.requestedAmount >= minAmount);
  }
  if (maxAmount !== null && maxAmount !== undefined && !Number.isNaN(maxAmount)) {
    result = result.filter((r) => r.requestedAmount <= maxAmount);
  }

  result.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "requestedAmount") cmp = a.requestedAmount - b.requestedAmount;
    else if (sortBy === "status") cmp = a.status.localeCompare(b.status);
    else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortDir === "asc" ? cmp : -cmp;
  });

  return result;
}

export function filterAuditLogs(
  logs: AuditLogEntry[],
  filters: AuditLogFilters = {}
): AuditLogEntry[] {
  const { search = "", action = "", paymentId = "", payoutRequestId = "", shopkeeperId = "", dateFrom = "", dateTo = "" } = filters;

  let result = [...logs];

  if (search) {
    const q = search.toLowerCase();
    result = result.filter((l) =>
      [l.id, l.paymentId ?? "", l.payoutRequestId ?? "", l.payoutId ?? "", l.orderId ?? "", l.adminName, l.reason ?? "", l.note ?? ""]
        .some((field) => field.toLowerCase().includes(q))
    );
  }
  if (action) result = result.filter((l) => l.action === action);
  if (paymentId) result = result.filter((l) => l.paymentId === paymentId);
  if (payoutRequestId) result = result.filter((l) => l.payoutRequestId === payoutRequestId);
  if (shopkeeperId) result = result.filter((l) => l.shopkeeperId === shopkeeperId);
  if (dateFrom) result = result.filter((l) => dateOnly(l.timestamp) >= dateFrom);
  if (dateTo) result = result.filter((l) => dateOnly(l.timestamp) <= dateTo);

  result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return result;
}
