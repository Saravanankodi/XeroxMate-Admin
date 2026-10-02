/**
 * Finance service layer — async API used by the Admin UI.
 *
 * Mirrors the rest of the console's service layer (`lib/api.ts`) but every
 * write path is delegated to the finance store under a serialised lock so
 * all financial rules are enforced in one authoritative place.
 */

import type { TimeRange } from '@/types/analytics';
import type { Order } from '@/types/order';
import type {
  AuditLogEntry,
  AuditLogFilters,
  CommissionPoint,
  FinanceNotification,
  FinanceStatusShare,
  FinancialStats,
  Payment,
  PaymentFilters,
  PaymentMethod,
  PaymentMethodShare,
  PaymentVolumePoint,
  PayoutFilters,
  PayoutMethod,
  PayoutRequest,
  ShopkeeperBalance,
  ShopkeeperPayoutPoint,
} from '@/types/payment';
import type { PaginatedResult } from '@/lib/api';
import { CURRENT_ADMIN, financeDelay } from './config';
import { toFinanceMessage } from './errors';
import * as store from './store';
import { subscribeFinance } from './store';

const RANGE_DAYS: Record<TimeRange, number> = {
  '7d': 7,
  '30d': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  upi: 'UPI',
  card: 'Card',
  net_banking: 'Net Banking',
  wallet: 'Wallet',
  cod: 'Cash on Delivery',
};

function paginate<T>(list: T[], page = 1, pageSize = 10): PaginatedResult<T> {
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const current = Math.min(Math.max(page, 1), totalPages);
  return {
    data: list.slice((current - 1) * pageSize, current * pageSize),
    total,
    page: current,
    pageSize,
    totalPages,
  };
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

async function run<T>(fn: () => T, ms = 220): Promise<T> {
  await financeDelay(ms);
  try {
    return fn();
  } catch (err) {
    throw err instanceof Error ? err : new Error(toFinanceMessage(err));
  }
}

async function mutate<T>(fn: () => T, ms = 320): Promise<T> {
  await financeDelay(ms);
  return store.withFinanceLock(() => {
    try {
      return fn();
    } catch (err) {
      throw err instanceof Error ? err : new Error(toFinanceMessage(err));
    }
  });
}

// ─── Payments ────────────────────────────────────────────────────────────────

export function filterPayments(payments: Payment[], filters: PaymentFilters = {}): Payment[] {
  const {
    search = '',
    status = '',
    verificationStatus = '',
    shopkeeperId = '',
    userId = '',
    method = '',
    dateFrom = '',
    dateTo = '',
    minAmount = null,
    maxAmount = null,
    sortBy = 'paymentDate',
    sortDir = 'desc',
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
    if (sortBy === 'grossAmount') cmp = a.grossAmount - b.grossAmount;
    else if (sortBy === 'paymentStatus') cmp = a.paymentStatus.localeCompare(b.paymentStatus);
    else cmp = new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime();
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return result;
}

export async function getPayments(filters: PaymentFilters = {}): Promise<PaginatedResult<Payment>> {
  return run(() => paginate(filterPayments(store.state.payments, filters), filters.page, filters.pageSize));
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  return run(() => store.state.payments.find((p) => p.id === id) ?? null, 150);
}

export async function verifyPaymentById(id: string, options: { note?: string } = {}): Promise<Payment> {
  return mutate(() => store.verifyPayment(id, options));
}

export async function declinePaymentById(
  id: string,
  options: { reason: string; otherReason?: string; note?: string }
): Promise<Payment> {
  return mutate(() => store.declinePayment(id, options));
}

export async function refundPaymentById(id: string, options: { reason?: string } = {}): Promise<Payment> {
  return mutate(() => store.refundPayment(id, options));
}

/** Automatic payment recording when an order is settled — never keyed in manually. */
export async function syncOrderPayment(order: Order): Promise<Payment | null> {
  return mutate(() => store.recordOrderPaymentChange(order), 120);
}

// ─── Payouts ─────────────────────────────────────────────────────────────────

export function filterPayouts(requests: PayoutRequest[], filters: PayoutFilters = {}): PayoutRequest[] {
  const {
    search = '',
    status = '',
    shopkeeperId = '',
    method = '',
    dateFrom = '',
    dateTo = '',
    minAmount = null,
    maxAmount = null,
    sortBy = 'createdAt',
    sortDir = 'desc',
  } = filters;

  let result = [...requests];

  if (search) {
    const q = search.toLowerCase();
    result = result.filter((r) =>
      [r.id, r.payoutId ?? '', r.shopName, r.shopkeeperName, r.shopkeeperId, r.shopkeeperPhone, r.transactionReference ?? '']
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
    if (sortBy === 'requestedAmount') cmp = a.requestedAmount - b.requestedAmount;
    else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
    else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return result;
}

export async function getPayoutRequests(filters: PayoutFilters = {}): Promise<PaginatedResult<PayoutRequest>> {
  return run(() => paginate(filterPayouts(store.state.payoutRequests, filters), filters.page, filters.pageSize));
}

export async function getPayoutRequestById(id: string): Promise<PayoutRequest | null> {
  return run(() => store.state.payoutRequests.find((r) => r.id === id) ?? null, 150);
}

/** Verified customer payments backing a payout request (audit traceability). */
export async function getPayoutContributingPayments(request: PayoutRequest): Promise<Payment[]> {
  return run(() => {
    const payments = store.state.payments;
    if (request.paymentIds.length > 0) {
      return request.paymentIds
        .map((id) => payments.find((p) => p.id === id))
        .filter((p): p is Payment => Boolean(p));
    }
    return payments
      .filter((p) => p.shopkeeperId === request.shopkeeperId && p.verificationStatus === 'verified')
      .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  }, 180);
}

export async function getShopkeeperPayoutHistory(shopkeeperId: string): Promise<PayoutRequest[]> {
  return run(
    () =>
      store.state.payoutRequests
        .filter((r) => r.shopkeeperId === shopkeeperId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    180
  );
}

export interface PayoutRequestInput {
  shopkeeperId: string;
  requestedAmount: number;
  payoutMethod: PayoutMethod;
  accountDetails: string;
}

export async function createPayoutRequest(input: PayoutRequestInput): Promise<PayoutRequest> {
  return mutate(() => store.requestPayout(input));
}

export async function holdPayoutById(id: string, options: { note?: string } = {}): Promise<PayoutRequest> {
  return mutate(() => store.holdPayout(id, options));
}

export async function approvePayoutById(id: string, options: { note?: string } = {}): Promise<PayoutRequest> {
  return mutate(() => store.approvePayout(id, options));
}

export async function processPayoutById(id: string, options: { note?: string } = {}): Promise<PayoutRequest> {
  return mutate(() => store.processPayout(id, options));
}

export async function completePayoutById(
  id: string,
  options: { reference?: string; note?: string } = {}
): Promise<PayoutRequest> {
  return mutate(() => store.completePayout(id, options));
}

export async function rejectPayoutById(id: string, options: { reason: string; note?: string }): Promise<PayoutRequest> {
  return mutate(() => store.rejectPayout(id, options));
}

export async function failPayoutById(id: string, options: { reason: string; note?: string }): Promise<PayoutRequest> {
  return mutate(() => store.failPayout(id, options));
}

export async function cancelPayoutById(id: string, options: { reason?: string } = {}): Promise<PayoutRequest> {
  return mutate(() => store.cancelPayout(id, options));
}

export async function addPayoutNoteById(id: string, note: string): Promise<PayoutRequest> {
  return mutate(() => store.addPayoutNote(id, note));
}

// ─── Ledger & configuration ──────────────────────────────────────────────────

export async function getShopkeeperBalances(): Promise<ShopkeeperBalance[]> {
  return run(() => store.allBalances(), 200);
}

export async function getCommissionRate(): Promise<number> {
  return run(() => store.state.commissionRate, 100);
}

export async function updateCommissionRate(rate: number): Promise<number> {
  return mutate(() => store.setCommissionRate(rate));
}

export function getCurrentAdmin() {
  return CURRENT_ADMIN;
}

// ─── Statistics & charts ─────────────────────────────────────────────────────

export async function getFinancialStats(): Promise<FinancialStats> {
  return run(() => store.computeStats(), 240);
}

export async function getPaymentVolume(range: TimeRange): Promise<PaymentVolumePoint[]> {
  return run(() => store.paymentVolumeSeries(RANGE_DAYS[range]), 260);
}

export async function getCommissionTrend(range: TimeRange): Promise<CommissionPoint[]> {
  return run(() => store.commissionSeries(RANGE_DAYS[range]), 260);
}

export async function getPaymentStatusDistribution(): Promise<FinanceStatusShare[]> {
  return run(() => store.statusDistribution('payment'), 180);
}

export async function getPayoutStatusDistribution(): Promise<FinanceStatusShare[]> {
  return run(() => store.statusDistribution('payout'), 180);
}

export async function getPaymentMethodDistribution(): Promise<PaymentMethodShare[]> {
  return run(() => {
    const groups = new Map<PaymentMethod, { count: number; amount: number }>();
    let totalAmount = 0;
    store.state.payments
      .filter((p) => p.paymentStatus !== 'declined')
      .forEach((p) => {
        const entry = groups.get(p.paymentMethod) ?? { count: 0, amount: 0 };
        entry.count += 1;
        entry.amount = Math.round((entry.amount + p.grossAmount) * 100) / 100;
        groups.set(p.paymentMethod, entry);
        totalAmount += p.grossAmount;
      });
    return Array.from(groups.entries())
      .map(([method, v]) => ({
        method,
        label: METHOD_LABELS[method],
        count: v.count,
        amount: Math.round(v.amount * 100) / 100,
        percentage: totalAmount > 0 ? Math.round((v.amount / totalAmount) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, 200);
}

export async function getShopkeeperPayoutTop(limit = 6): Promise<ShopkeeperPayoutPoint[]> {
  return run(() => store.shopkeeperPayoutTop(limit), 200);
}

// ─── Audit log ───────────────────────────────────────────────────────────────

export function filterAuditLogs(logs: AuditLogEntry[], filters: AuditLogFilters = {}): AuditLogEntry[] {
  const { search = '', action = '', paymentId = '', payoutRequestId = '', shopkeeperId = '', dateFrom = '', dateTo = '' } = filters;

  let result = [...logs];

  if (search) {
    const q = search.toLowerCase();
    result = result.filter((l) =>
      [l.id, l.paymentId ?? '', l.payoutRequestId ?? '', l.payoutId ?? '', l.orderId ?? '', l.adminName, l.reason ?? '', l.note ?? '']
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

export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<PaginatedResult<AuditLogEntry>> {
  return run(() => paginate(filterAuditLogs(store.state.auditLogs, filters), filters.page, filters.pageSize ?? 12));
}

export async function getAuditLogsForEntity(
  entity: { paymentId?: string; payoutRequestId?: string }
): Promise<AuditLogEntry[]> {
  return run(
    () =>
      store.state.auditLogs
        .filter(
          (l) =>
            (entity.paymentId && l.paymentId === entity.paymentId) ||
            (entity.payoutRequestId && l.payoutRequestId === entity.payoutRequestId)
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    140
  );
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getFinanceNotifications(
  audience: 'admin' | 'shopkeeper' | 'customer' = 'admin'
): Promise<FinanceNotification[]> {
  return run(
    () =>
      store.state.notifications
        .filter((n) => n.audience === audience)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    120
  );
}

export async function markFinanceNotificationsRead(): Promise<void> {
  return mutate(() => store.markNotificationsRead(), 80);
}

export { store as financeStore, subscribeFinance };
export { toFinanceMessage };
