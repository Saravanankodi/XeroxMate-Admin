/**
 * Finance service layer — async API used by the Admin UI.
 *
 * Every call goes through the `/api/*` route handlers (`lib/server/finance/*`
 * on the server), so the browser never talks to Firestore. Domain failures
 * arrive as `{ error, code }` and are re-hydrated into `FinanceError` so
 * `toFinanceMessage` surfaces the real user-facing text. Successful mutations
 * emit a store event so `useFinanceSync` screens refetch.
 */

import type { TimeRange } from '@/types/analytics';
import type { Order } from '@/types/order';
import type {
  AuditLogEntry,
  AuditLogFilters,
  CommissionPoint,
  FinanceNotification,
  FinanceNotificationAudience,
  FinanceStatusShare,
  FinancialStats,
  Payment,
  PaymentFilters,
  PaymentMethodShare,
  PaymentVolumePoint,
  PayoutFilters,
  PayoutMethod,
  PayoutRequest,
  ShopkeeperBalance,
  ShopkeeperPayoutPoint,
} from '@/types/payment';
import type { PaginatedResult } from '@/lib/api';
import { ApiError, apiGet, apiSend, buildQuery } from '@/lib/api/client';
import { CURRENT_ADMIN } from './config';
import { FinanceError, toFinanceMessage, type FinanceErrorCode } from './errors';
import { emitFinance, subscribeFinance } from './store';

const FINANCE_CODES: ReadonlySet<string> = new Set<FinanceErrorCode>([
  'PAYMENT_NOT_FOUND',
  'PAYMENT_ALREADY_VERIFIED',
  'PAYMENT_ALREADY_DECLINED',
  'PAYMENT_ALREADY_PROCESSED',
  'PAYMENT_LOCKED_BY_PAYOUT',
  'PAYMENT_REFUNDED',
  'PAYOUT_NOT_FOUND',
  'PAYOUT_INVALID_STATE',
  'PAYOUT_IN_PROGRESS',
  'DUPLICATE_REQUEST',
  'INSUFFICIENT_BALANCE',
  'BELOW_MINIMUM',
  'INVALID_AMOUNT',
  'SHOPKEEPER_NOT_FOUND',
  'COMMISSION_RATE_INVALID',
  'NETWORK_FAILURE',
  'UNAUTHORIZED',
]);

function domainError(error: unknown): FinanceError {
  if (error instanceof FinanceError) {
    return error;
  }

  if (
    error instanceof ApiError &&
    error.code !== undefined &&
    FINANCE_CODES.has(error.code)
  ) {
    return new FinanceError(
      error.code as FinanceErrorCode,
      error.message
    );
  }

  return new FinanceError('NETWORK_FAILURE');
}

async function get<T>(path: string): Promise<T> {
  try {
    return await apiGet<T>(path);
  } catch (error) {
    throw domainError(error);
  }
}

async function send<T>(
  method: 'POST' | 'PATCH',
  path: string,
  body?: unknown
): Promise<T> {
  try {
    return await apiSend<T>(method, path, body);
  } catch (error) {
    throw domainError(error);
  }
}

function paymentPath(id: string): string {
  return `/api/payments/${encodeURIComponent(id)}`;
}

function payoutPath(id: string): string {
  return `/api/payouts/${encodeURIComponent(id)}`;
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

export function getPayments(filters: PaymentFilters = {}): Promise<PaginatedResult<Payment>> {
  return get<PaginatedResult<Payment>>(`/api/payments${buildQuery(filters)}`);
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  try {
    return await apiGet<Payment>(paymentPath(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw domainError(error);
  }
}

export async function verifyPaymentById(id: string, options: { note?: string } = {}): Promise<Payment> {
  const payment = await send<Payment>('PATCH', paymentPath(id), {
    action: 'verify',
    note: options.note,
  });
  emitFinance();
  return payment;
}

export async function declinePaymentById(
  id: string,
  options: { reason: string; otherReason?: string; note?: string }
): Promise<Payment> {
  const payment = await send<Payment>('PATCH', paymentPath(id), {
    action: 'decline',
    reason: options.reason,
    otherReason: options.otherReason,
    note: options.note,
  });
  emitFinance();
  return payment;
}

export async function refundPaymentById(id: string, options: { reason?: string } = {}): Promise<Payment> {
  const payment = await send<Payment>('PATCH', paymentPath(id), {
    action: 'refund',
    reason: options.reason,
  });
  emitFinance();
  return payment;
}

/** Automatic payment recording when an order is settled — never keyed in manually. */
export async function syncOrderPayment(order: Order): Promise<Payment | null> {
  const result = await send<{ payment: Payment | null }>('POST', '/api/payments/sync', { order });
  emitFinance();
  return result.payment;
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

export function getPayoutRequests(filters: PayoutFilters = {}): Promise<PaginatedResult<PayoutRequest>> {
  return get<PaginatedResult<PayoutRequest>>(`/api/payouts${buildQuery(filters)}`);
}

export async function getPayoutRequestById(id: string): Promise<PayoutRequest | null> {
  try {
    return await apiGet<PayoutRequest>(payoutPath(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw domainError(error);
  }
}

/** Verified customer payments backing a payout request (audit traceability). */
export function getPayoutContributingPayments(request: PayoutRequest): Promise<Payment[]> {
  return send<Payment[]>('POST', '/api/payouts/contributing', {
    shopkeeperId: request.shopkeeperId,
    paymentIds: request.paymentIds,
  });
}

export async function getShopkeeperPayoutHistory(shopkeeperId: string): Promise<PayoutRequest[]> {
  const result = await get<PaginatedResult<PayoutRequest>>(
    `/api/payouts${buildQuery({ shopkeeperId, all: 1 })}`
  );
  return result.data;
}

export interface PayoutRequestInput {
  shopkeeperId: string;
  requestedAmount: number;
  payoutMethod: PayoutMethod;
  accountDetails: string;
}

export async function createPayoutRequest(input: PayoutRequestInput): Promise<PayoutRequest> {
  const payout = await send<PayoutRequest>('POST', '/api/payouts', input);
  emitFinance();
  return payout;
}

function payoutAction(
  action:
    | 'hold'
    | 'approve'
    | 'process'
    | 'complete'
    | 'reject'
    | 'fail'
    | 'cancel',
  id: string,
  options: { note?: string; reason?: string; reference?: string } = {}
): Promise<PayoutRequest> {
  return send<PayoutRequest>('PATCH', payoutPath(id), {
    action,
    ...options,
  }).then((payout) => {
    emitFinance();
    return payout;
  });
}

export function holdPayoutById(id: string, options: { note?: string } = {}): Promise<PayoutRequest> {
  return payoutAction('hold', id, options);
}

export function approvePayoutById(id: string, options: { note?: string } = {}): Promise<PayoutRequest> {
  return payoutAction('approve', id, options);
}

export function processPayoutById(id: string, options: { note?: string } = {}): Promise<PayoutRequest> {
  return payoutAction('process', id, options);
}

export function completePayoutById(
  id: string,
  options: { reference?: string; note?: string } = {}
): Promise<PayoutRequest> {
  return payoutAction('complete', id, options);
}

export function rejectPayoutById(id: string, options: { reason: string; note?: string }): Promise<PayoutRequest> {
  return payoutAction('reject', id, options);
}

export function failPayoutById(id: string, options: { reason: string; note?: string }): Promise<PayoutRequest> {
  return payoutAction('fail', id, options);
}

export function cancelPayoutById(id: string, options: { reason?: string } = {}): Promise<PayoutRequest> {
  return payoutAction('cancel', id, options);
}

export async function addPayoutNoteById(id: string, note: string): Promise<PayoutRequest> {
  const payout = await send<PayoutRequest>('PATCH', payoutPath(id), { action: 'addNote', note });
  emitFinance();
  return payout;
}

// ─── Ledger & configuration ──────────────────────────────────────────────────

export function getShopkeeperBalances(): Promise<ShopkeeperBalance[]> {
  return get<ShopkeeperBalance[]>('/api/balances');
}

export async function getCommissionRate(): Promise<number> {
  const result = await get<{ rate: number }>('/api/commission');
  return result.rate;
}

export async function updateCommissionRate(rate: number): Promise<number> {
  const result = await send<{ rate: number }>('PATCH', '/api/commission', { rate });
  emitFinance();
  return result.rate;
}

export function getCurrentAdmin() {
  return CURRENT_ADMIN;
}

// ─── Statistics & charts ─────────────────────────────────────────────────────

export function getFinancialStats(): Promise<FinancialStats> {
  return get<FinancialStats>('/api/finance/stats');
}

export function getPaymentVolume(range: TimeRange): Promise<PaymentVolumePoint[]> {
  return get<PaymentVolumePoint[]>(`/api/finance/volume${buildQuery({ range })}`);
}

export function getCommissionTrend(range: TimeRange): Promise<CommissionPoint[]> {
  return get<CommissionPoint[]>(`/api/finance/commission-trend${buildQuery({ range })}`);
}

export function getPaymentStatusDistribution(): Promise<FinanceStatusShare[]> {
  return get<FinanceStatusShare[]>('/api/finance/distribution?kind=paymentStatus');
}

export function getPayoutStatusDistribution(): Promise<FinanceStatusShare[]> {
  return get<FinanceStatusShare[]>('/api/finance/distribution?kind=payoutStatus');
}

export function getPaymentMethodDistribution(): Promise<PaymentMethodShare[]> {
  return get<PaymentMethodShare[]>('/api/finance/distribution?kind=paymentMethod');
}

export function getShopkeeperPayoutTop(limit = 6): Promise<ShopkeeperPayoutPoint[]> {
  return get<ShopkeeperPayoutPoint[]>(`/api/finance/distribution${buildQuery({ kind: 'topPayouts', limit })}`);
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

export function getAuditLogs(filters: AuditLogFilters = {}): Promise<PaginatedResult<AuditLogEntry>> {
  return get<PaginatedResult<AuditLogEntry>>(`/api/audit${buildQuery(filters)}`);
}

export function getAuditLogsForEntity(
  entity: { paymentId?: string; payoutRequestId?: string }
): Promise<AuditLogEntry[]> {
  return get<AuditLogEntry[]>(`/api/audit/entity${buildQuery(entity)}`);
}

// ─── Notifications ───────────────────────────────────────────────────────────

export function getFinanceNotifications(
  audience: FinanceNotificationAudience = 'admin'
): Promise<FinanceNotification[]> {
  return get<FinanceNotification[]>(`/api/finance/notifications${buildQuery({ audience })}`);
}

export async function markFinanceNotificationsRead(): Promise<void> {
  await send<{ success: boolean }>('PATCH', '/api/finance/notifications');
  emitFinance();
}

export { subscribeFinance };
export { toFinanceMessage };

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}
