/**
 * Finance store — the authoritative "server side" for payments, payouts,
 * the shopkeeper ledger, audit logging and finance notifications.
 *
 * Every financial mutation in the application goes through this module so
 * that amounts, commission and balances are never trusted from the UI.
 * Mutations are serialised through a lock (single-writer transaction model)
 * which prevents duplicate payouts, double spends and race conditions.
 */

import { mockOrders } from '@/data/orders';
import { mockShopkeepers } from '@/data/shopkeepers';
import type { Order } from '@/types/order';
import type {
  AuditAction,
  AuditLogEntry,
  CommissionPoint,
  FinanceNotification,
  FinanceNotificationType,
  FinanceStatusShare,
  FinancialStats,
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentVolumePoint,
  PayoutMethod,
  PayoutRequest,
  PayoutStatus,
  ShopkeeperBalance,
  ShopkeeperPayoutPoint,
} from '@/types/payment';
import { CURRENT_ADMIN, DEFAULT_COMMISSION_RATE } from './config';
import { FinanceError } from './errors';

// ─── Constants ───────────────────────────────────────────────────────────────

export const MIN_PAYOUT_AMOUNT = 50;
export const COMMISSION_RATE_MAX = 50;

/** Payout states that hold (lock) funds out of the available balance. */
const LOCKING_STATUSES: PayoutStatus[] = ['requested', 'under_review', 'approved', 'processing'];

const PAYMENT_METHOD_CYCLE: PaymentMethod[] = [
  'upi', 'card', 'net_banking', 'upi', 'wallet', 'upi', 'cod', 'card', 'net_banking', 'upi',
];

// ─── State ───────────────────────────────────────────────────────────────────

interface FinanceState {
  payments: Payment[];
  payoutRequests: PayoutRequest[];
  auditLogs: AuditLogEntry[];
  notifications: FinanceNotification[];
  commissionRate: number;
  counters: {
    payment: number;
    payout: number;
    payoutRequest: number;
    audit: number;
    notification: number;
  };
}

type Listener = () => void;

const listeners = new Set<Listener>();

let mutationQueue: Promise<unknown> = Promise.resolve();

function emit(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* a broken subscriber must not break the store */
    }
  });
}

/** Serialises every mutation — the equivalent of a database transaction lock. */
export function withFinanceLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const result = mutationQueue.then(
    () => fn(),
    () => fn()
  );
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export function subscribeFinance(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function nowIso(): string {
  return new Date().toISOString();
}

function shiftIso(base: number, ms: number): string {
  return new Date(base + ms).toISOString();
}

function isToday(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function withinLastDays(iso: string, days: number): boolean {
  return new Date(iso).getTime() >= Date.now() - days * 86400000;
}

function paymentMethodFor(orderId: string): PaymentMethod {
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) hash = (hash * 31 + orderId.charCodeAt(i)) % 9973;
  return PAYMENT_METHOD_CYCLE[hash % PAYMENT_METHOD_CYCLE.length];
}

function commissionFor(amount: number, rate: number): { commission: number; net: number } {
  const commission = round2((amount * rate) / 100);
  return { commission, net: round2(amount - commission) };
}

function shopkeeperRecord(shopkeeperId: string) {
  return mockShopkeepers.find((s) => s.id === shopkeeperId);
}

function requireShopkeeper(shopkeeperId: string) {
  const record = shopkeeperRecord(shopkeeperId);
  if (!record) throw new FinanceError('SHOPKEEPER_NOT_FOUND');
  return record;
}

// ─── Seed data ───────────────────────────────────────────────────────────────

const FULLY_VERIFIED_ORDERS = new Set([
  'OMX-1046', 'OMX-1045', 'OMX-1044', 'OMX-1042', 'OMX-1040', 'OMX-1039',
  'OMX-1038', 'OMX-1037', 'OMX-1036', 'OMX-1034', 'OMX-1032', 'OMX-1031',
]);
const AWAITING_VERIFICATION_ORDERS = new Set(['OMX-1048', 'OMX-1047']);

function buildPayment(
  order: Order,
  id: string,
  index: number,
  overrides: Partial<Payment> = {}
): Payment {
  const createdAt = new Date(order.createdAt).getTime();
  const paymentDate = shiftIso(createdAt, 4 * 60000);
  const grossAmount = order.amountPaid;
  const seq = order.id.replace('OMX-', '');

  let paymentStatus: PaymentStatus;
  if (order.paymentStatus === 'refunded') paymentStatus = 'refunded';
  else if (order.paymentStatus === 'partially_paid') paymentStatus = 'partially_paid';
  else if (AWAITING_VERIFICATION_ORDERS.has(order.id)) paymentStatus = 'verification_required';
  else if (FULLY_VERIFIED_ORDERS.has(order.id)) paymentStatus = 'verified';
  else paymentStatus = 'pending';

  const verified = paymentStatus === 'verified';
  const verifiedAt = verified ? shiftIso(createdAt, 24 * 60000) : undefined;

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
    orderType: 'Print Order',
    orderDate: order.createdAt,
    paymentDate,
    orderAmount: order.totalAmount,
    grossAmount,
    eligibleShopkeeperAmount: grossAmount,
    paymentMethod: paymentMethodFor(order.id),
    transactionId: `TXN-${seq}-${7412 + index * 137}`,
    gatewayReference: `GP-${seq}-${3100 + index * 17}`,
    utrNumber: String(620410000000 + index * 450913),
    invoiceNumber: `INV-2026-${seq}`,
    paymentStatus,
    verificationStatus: verified ? 'verified' : paymentStatus === 'refunded' ? 'not_required' : 'pending',
    payoutState: verified ? 'eligible' : 'not_eligible',
    verifiedBy: verified ? CURRENT_ADMIN.name : undefined,
    verifiedAt,
    history: [
      {
        action: 'created',
        status: paymentStatus,
        by: 'Customer Payment Gateway',
        at: paymentDate,
        note: 'Amount received in the company payment account.',
      },
      ...(verified
        ? [
            {
              action: 'verified' as const,
              status: 'verified' as PaymentStatus,
              by: CURRENT_ADMIN.name,
              at: verifiedAt!,
              note: 'Transaction reference validated against the company payment account.',
            },
          ]
        : []),
      ...(paymentStatus === 'refunded'
        ? [
            {
              action: 'refunded' as const,
              status: 'refunded' as PaymentStatus,
              by: CURRENT_ADMIN.name,
              at: shiftIso(createdAt, 6 * 3600000),
              reason: 'Order cancelled by customer',
            },
          ]
        : []),
    ],
    createdAt: paymentDate,
    updatedAt: verified ? verifiedAt! : paymentDate,
    ...overrides,
  };

  return payment;
}

function seedPayments(): Payment[] {
  const payments: Payment[] = [];
  let index = 0;

  for (const order of mockOrders) {
    if (order.paymentStatus === 'unpaid') continue;
    index += 1;
    payments.push(buildPayment(order, `PAY-${1000 + index}`, index));
  }

  // Duplicate capture attempt — declined by the admin, kept forever in history.
  const duplicateOrder = mockOrders.find((o) => o.id === 'OMX-1046');
  if (duplicateOrder) {
    index += 1;
    const createdAt = new Date(duplicateOrder.createdAt).getTime();
    const declinedAt = shiftIso(createdAt, 45 * 60000);
    payments.push(
      buildPayment(duplicateOrder, `PAY-${1000 + index}`, index, {
        paymentStatus: 'declined',
        verificationStatus: 'declined',
        payoutState: 'not_eligible',
        transactionId: 'TXN-1046-9931',
        gatewayReference: 'GP-1046-9931',
        utrNumber: '620419993100',
        invoiceNumber: 'INV-2026-1046-D',
        paymentDate: declinedAt,
        declineReason: 'Duplicate payment',
        adminNote: 'Second capture for the same order — only the original transaction is payable.',
        history: [
          {
            action: 'created',
            status: 'verification_required',
            by: 'Customer Payment Gateway',
            at: declinedAt,
          },
          {
            action: 'declined',
            status: 'declined',
            by: CURRENT_ADMIN.name,
            at: shiftIso(createdAt, 52 * 60000),
            reason: 'Duplicate payment',
            note: 'Same order already settled by an earlier transaction.',
          },
        ],
        createdAt: declinedAt,
        updatedAt: shiftIso(createdAt, 52 * 60000),
      })
    );
  }

  return payments;
}

interface PayoutSeedSpec {
  shopkeeperId: string;
  amount: number;
  status: PayoutStatus;
  createdMsAgo: number;
  stages: { status: PayoutStatus; msAgo: number; note?: string; reference?: string }[];
  rejectReason?: string;
  payoutMethod?: PayoutMethod;
}

function seedPayouts(payments: Payment[]): PayoutRequest[] {
  const now = Date.now();
  const HOUR = 3600000;
  const DAY = 86400000;

  const specs: PayoutSeedSpec[] = [
    {
      shopkeeperId: 'SHOP-015',
      amount: 200,
      status: 'requested',
      createdMsAgo: 3 * HOUR,
      stages: [{ status: 'requested', msAgo: 3 * HOUR, note: 'Payout requested from the shopkeeper app.' }],
    },
    {
      shopkeeperId: 'SHOP-010',
      amount: 150,
      status: 'under_review',
      createdMsAgo: DAY,
      stages: [
        { status: 'requested', msAgo: DAY, note: 'Payout requested from the shopkeeper app.' },
        { status: 'under_review', msAgo: 20 * HOUR, note: 'Reviewing shop KYC and linked orders.' },
      ],
    },
    {
      shopkeeperId: 'SHOP-008',
      amount: 150,
      status: 'approved',
      createdMsAgo: 2 * DAY,
      stages: [
        { status: 'requested', msAgo: 2 * DAY, note: 'Payout requested from the shopkeeper app.' },
        { status: 'under_review', msAgo: 38 * HOUR, note: 'Eligible transactions reconciled.' },
        { status: 'approved', msAgo: DAY, note: 'Commission applied and funds reserved.' },
      ],
    },
    {
      shopkeeperId: 'SHOP-006',
      amount: 250,
      status: 'processing',
      createdMsAgo: 4 * DAY,
      stages: [
        { status: 'requested', msAgo: 4 * DAY, note: 'Payout requested from the shopkeeper app.' },
        { status: 'under_review', msAgo: 3 * DAY + 6 * HOUR, note: 'Eligible transactions reconciled.' },
        { status: 'approved', msAgo: 2 * DAY + 12 * HOUR, note: 'Commission applied and funds reserved.' },
        { status: 'processing', msAgo: 2 * DAY, note: 'Bank transfer initiated by finance team.' },
      ],
    },
    {
      shopkeeperId: 'SHOP-005',
      amount: 400,
      status: 'completed',
      createdMsAgo: 12 * DAY,
      payoutMethod: 'bank_transfer',
      stages: [
        { status: 'requested', msAgo: 12 * DAY, note: 'Payout requested from the shopkeeper app.' },
        { status: 'under_review', msAgo: 11 * DAY, note: 'Eligible transactions reconciled.' },
        { status: 'approved', msAgo: 10 * DAY, note: 'Commission applied and funds reserved.' },
        { status: 'processing', msAgo: 9 * DAY, note: 'Bank transfer initiated by finance team.' },
        {
          status: 'completed',
          msAgo: 6 * DAY,
          note: 'Funds credited to the shopkeeper account.',
          reference: 'IMPS/260918/004213',
        },
      ],
    },
    {
      shopkeeperId: 'SHOP-008',
      amount: 200,
      status: 'rejected',
      createdMsAgo: 10 * DAY,
      rejectReason: 'Invalid payout account details',
      stages: [
        { status: 'requested', msAgo: 10 * DAY, note: 'Payout requested from the shopkeeper app.' },
        { status: 'under_review', msAgo: 9 * DAY + 12 * HOUR, note: 'Checking payout account ownership.' },
        {
          status: 'rejected',
          msAgo: 9 * DAY,
          note: 'Account name does not match shop KYC records.',
        },
      ],
    },
  ];

  const requests: PayoutRequest[] = [];
  const rate = DEFAULT_COMMISSION_RATE;

  specs.forEach((spec, i) => {
    const shop = requireShopkeeper(spec.shopkeeperId);
    const balance = balanceFor(spec.shopkeeperId, payments, requests);
    // Locked stages must never exceed the balance available at seed time.
    if (LOCKING_STATUSES.includes(spec.status) && spec.amount > balance.availableBalance) return;
    const amount = spec.amount;
    const createdAt = shiftIso(now - spec.createdMsAgo, 0);
    const id = `PR-${3001 + i}`;
    const isLockedStage = ['approved', 'processing', 'completed'].includes(spec.status);
    const paymentIds = isLockedStage
      ? allocateEligiblePayments(spec.shopkeeperId, amount, payments, (p) => p.payoutState === 'eligible')
      : [];
    const commissionApplicable = ['approved', 'processing', 'completed'].includes(spec.status);
    const { commission, net } = commissionFor(amount, rate);

    const timeline = spec.stages.map((stage) => ({
      status: stage.status,
      at: shiftIso(now - stage.msAgo, 0),
      by:
        stage.status === 'requested'
          ? `${shop.ownerName} (Shopkeeper)`
          : CURRENT_ADMIN.name,
      note: stage.note,
      reference: stage.reference,
    }));

    const approvedEntry = timeline.find((s) => s.status === 'approved');
    const completedEntry = timeline.find((s) => s.status === 'completed');
    const processingEntry = timeline.find((s) => s.status === 'processing');
    const rejectedEntry = timeline.find((s) => s.status === 'rejected');

    const request: PayoutRequest = {
      id,
      payoutId: commissionApplicable ? `PO-${4001 + i}` : undefined,
      shopkeeperId: spec.shopkeeperId,
      shopkeeperName: shop.ownerName,
      shopName: shop.shopName,
      shopkeeperPhone: shop.phone,
      requestedAmount: amount,
      eligibleBalanceAtRequest: round2(balance.availableBalance + amount),
      status: spec.status,
      payoutMethod: spec.payoutMethod ?? (i % 2 === 0 ? 'upi' : 'bank_transfer'),
      accountDetails: `XXXXXX${String(4821 + i * 137).slice(-4)}`,
      adminNote: commissionApplicable ? 'Reconciled against verified customer payments.' : undefined,
      rejectReason: spec.rejectReason,
      commissionRate: commissionApplicable ? rate : undefined,
      internalCommission: commissionApplicable ? commission : undefined,
      netPayout: commissionApplicable ? net : undefined,
      transactionReference: completedEntry?.reference,
      completedAt: completedEntry?.at,
      paymentIds,
      timeline,
      createdAt,
      updatedAt:
        rejectedEntry?.at ?? completedEntry?.at ?? processingEntry?.at ?? approvedEntry?.at ?? createdAt,
    };

    paymentIds.forEach((pid) => {
      const payment = payments.find((p) => p.id === pid);
      if (!payment) return;
      payment.payoutState = spec.status === 'completed' ? 'released' : 'locked';
      payment.paymentStatus = spec.status === 'completed' ? 'completed' : 'payout_pending';
      payment.payoutRequestId = id;
      payment.payoutId = request.payoutId;
      payment.updatedAt = request.updatedAt;
      payment.history.push({
        action: spec.status === 'completed' ? 'released' : 'locked',
        status: payment.paymentStatus,
        by: CURRENT_ADMIN.name,
        at: request.updatedAt,
        note:
          spec.status === 'completed'
            ? `Included in completed payout ${request.payoutId}.`
            : `Reserved for payout request ${id}.`,
      });
    });

    requests.push(request);
  });

  return requests;
}

function seedAuditLogs(payments: Payment[], requests: PayoutRequest[]): AuditLogEntry[] {
  const logs: AuditLogEntry[] = [];
  let seq = 0;

  const push = (entry: Omit<AuditLogEntry, 'id'>) => {
    seq += 1;
    logs.push({ id: `AUD-${1001 + seq}`, ...entry });
  };

  payments.forEach((payment) => {
    push({
      action: 'PAYMENT_RECEIVED',
      paymentId: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      shopkeeperId: payment.shopkeeperId,
      adminId: 'SYSTEM',
      adminName: 'Payment Gateway',
      newStatus: 'verification_required',
      amount: payment.grossAmount,
      timestamp: payment.paymentDate,
    });

    if (payment.verificationStatus === 'verified') {
      push({
        action: 'PAYMENT_VERIFIED',
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        shopkeeperId: payment.shopkeeperId,
        adminId: CURRENT_ADMIN.id,
        adminName: CURRENT_ADMIN.name,
        previousStatus: 'verification_required',
        newStatus: 'verified',
        amount: payment.grossAmount,
        note: 'Transaction reference validated against the company payment account.',
        timestamp: payment.verifiedAt ?? payment.updatedAt,
      });
    }

    if (payment.paymentStatus === 'declined') {
      push({
        action: 'PAYMENT_DECLINED',
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        shopkeeperId: payment.shopkeeperId,
        adminId: CURRENT_ADMIN.id,
        adminName: CURRENT_ADMIN.name,
        previousStatus: 'verification_required',
        newStatus: 'declined',
        amount: payment.grossAmount,
        reason: payment.declineReason,
        note: payment.adminNote,
        timestamp: payment.updatedAt,
      });
    }

    if (payment.paymentStatus === 'refunded') {
      push({
        action: 'REFUND_CREATED',
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        shopkeeperId: payment.shopkeeperId,
        adminId: CURRENT_ADMIN.id,
        adminName: CURRENT_ADMIN.name,
        previousStatus: 'verified',
        newStatus: 'refunded',
        amount: payment.grossAmount,
        reason: 'Order cancelled by customer',
        timestamp: payment.updatedAt,
      });
    }
  });

  requests.forEach((request) => {
    request.timeline.forEach((entry) => {
      const map: Partial<Record<PayoutStatus, AuditAction>> = {
        requested: 'PAYOUT_REQUESTED',
        under_review: 'PAYOUT_ON_HOLD',
        approved: 'PAYOUT_APPROVED',
        processing: 'PAYOUT_PROCESSING',
        completed: 'PAYOUT_COMPLETED',
        rejected: 'PAYOUT_REJECTED',
        cancelled: 'PAYOUT_CANCELLED',
        failed: 'PAYOUT_FAILED',
      };
      const action = map[entry.status];
      if (!action) return;
      const isShopkeeperAction = entry.status === 'requested';
      push({
        action,
        payoutRequestId: request.id,
        payoutId: request.payoutId,
        shopkeeperId: request.shopkeeperId,
        adminId: isShopkeeperAction ? request.shopkeeperId : CURRENT_ADMIN.id,
        adminName: isShopkeeperAction ? `${request.shopkeeperName} (Shopkeeper)` : CURRENT_ADMIN.name,
        previousStatus: undefined,
        newStatus: entry.status,
        amount: request.requestedAmount,
        note: entry.note,
        reason: entry.status === 'rejected' ? request.rejectReason : undefined,
        timestamp: entry.at,
      });
    });

    if (request.internalCommission !== undefined && request.commissionRate !== undefined) {
      push({
        action: 'COMMISSION_CALCULATED',
        payoutRequestId: request.id,
        payoutId: request.payoutId,
        shopkeeperId: request.shopkeeperId,
        adminId: CURRENT_ADMIN.id,
        adminName: CURRENT_ADMIN.name,
        amount: request.internalCommission,
        note: `Gross ₹${request.requestedAmount.toLocaleString('en-IN')} − ${request.commissionRate}% commission = Net ₹${(request.netPayout ?? 0).toLocaleString('en-IN')}`,
        timestamp: request.timeline.find((t) => t.status === 'approved')?.at ?? request.updatedAt,
      });
    }
  });

  return logs;
}

function seedNotifications(payments: Payment[], requests: PayoutRequest[]): FinanceNotification[] {
  const notifications: FinanceNotification[] = [];
  let seq = 0;

  const push = (n: Omit<FinanceNotification, 'id' | 'read'>) => {
    seq += 1;
    notifications.push({ id: `FN-${2001 + seq}`, read: false, ...n });
  };

  payments
    .filter((p) => p.paymentStatus === 'verification_required')
    .forEach((p) => {
      push({
        audience: 'admin',
        type: 'payment_verification_required',
        title: 'Payment requires verification',
        subtitle: `${p.userName} • ₹${p.grossAmount.toLocaleString('en-IN')} • ${p.orderId}`,
        timestamp: p.paymentDate,
        entityId: p.id,
        entityType: 'payment',
      });
    });

  const declined = payments.find((p) => p.paymentStatus === 'declined');
  if (declined) {
    push({
      audience: 'admin',
      type: 'payment_declined',
      title: 'Payment declined',
      subtitle: `${declined.id} • ${declined.declineReason}`,
      timestamp: declined.updatedAt,
      entityId: declined.id,
      entityType: 'payment',
    });
    push({
      audience: 'customer',
      type: 'payment_declined',
      title: 'Payment verification issue',
      subtitle: `Payment ${declined.id} could not be verified`,
      timestamp: declined.updatedAt,
      entityId: declined.id,
      entityType: 'payment',
    });
  }

  const refunded = payments.find((p) => p.paymentStatus === 'refunded');
  if (refunded) {
    push({
      audience: 'admin',
      type: 'payment_refunded',
      title: 'Payment refunded',
      subtitle: `${refunded.id} • ₹${refunded.grossAmount.toLocaleString('en-IN')} • ${refunded.orderId}`,
      timestamp: refunded.updatedAt,
      entityId: refunded.id,
      entityType: 'payment',
    });
    push({
      audience: 'customer',
      type: 'payment_refunded',
      title: 'Refund processed',
      subtitle: `₹${refunded.grossAmount.toLocaleString('en-IN')} refunded for ${refunded.orderId}`,
      timestamp: refunded.updatedAt,
      entityId: refunded.id,
      entityType: 'payment',
    });
  }

  const seeded: { status: PayoutStatus; type: FinanceNotificationType; title: string }[] = [
    { status: 'requested', type: 'payout_requested', title: 'New shopkeeper payout request' },
    { status: 'approved', type: 'payout_approved', title: 'Payout request approved' },
    { status: 'processing', type: 'payout_processing', title: 'Payout is processing' },
    { status: 'completed', type: 'payout_completed', title: 'Payout completed' },
    { status: 'rejected', type: 'payout_rejected', title: 'Payout request rejected' },
  ];

  seeded.forEach(({ status, type, title }) => {
    const request = requests.find((r) => r.status === status);
    if (!request) return;
    const entry = request.timeline[request.timeline.length - 1];
    push({
      audience: 'admin',
      type,
      title,
      subtitle: `${request.shopName} • ₹${request.requestedAmount.toLocaleString('en-IN')} • ${request.id}`,
      timestamp: entry?.at ?? request.updatedAt,
      entityId: request.id,
      entityType: 'payout',
    });
    push({
      audience: 'shopkeeper',
      type,
      title,
      subtitle: `${request.id} • ₹${request.requestedAmount.toLocaleString('en-IN')}`,
      timestamp: entry?.at ?? request.updatedAt,
      entityId: request.id,
      entityType: 'payout',
    });
  });

  return notifications;
}

function createState(): FinanceState {
  const payments = seedPayments();
  const payoutRequests = seedPayouts(payments);
  const auditLogs = seedAuditLogs(payments, payoutRequests);
  const notifications = seedNotifications(payments, payoutRequests);

  return {
    payments,
    payoutRequests,
    auditLogs,
    notifications,
    commissionRate: DEFAULT_COMMISSION_RATE,
    counters: {
      payment: payments.length,
      payout: payoutRequests.length,
      payoutRequest: payoutRequests.length,
      audit: auditLogs.length,
      notification: notifications.length,
    },
  };
}

export const state: FinanceState = createState();

// ─── Ledger ──────────────────────────────────────────────────────────────────

export interface LedgerBreakdown {
  shopkeeperId: string;
  verifiedEarnings: number;
  lockedAmount: number;
  paidOutAmount: number;
  availableBalance: number;
  verifiedPaymentCount: number;
  openRequestId?: string;
}

/**
 * Available balance is always derived from verified transactions minus
 * completed and currently locked payouts — never from stored counters.
 */
export function balanceFor(
  shopkeeperId: string,
  payments: Payment[] = state.payments,
  requests: PayoutRequest[] = state.payoutRequests
): LedgerBreakdown {
  const verified = payments.filter(
    (p) => p.shopkeeperId === shopkeeperId && p.verificationStatus === 'verified'
  );
  const verifiedEarnings = round2(
    verified.reduce((sum, p) => sum + p.eligibleShopkeeperAmount, 0)
  );
  const shopRequests = requests.filter((r) => r.shopkeeperId === shopkeeperId);
  const lockedAmount = round2(
    shopRequests
      .filter((r) => LOCKING_STATUSES.includes(r.status))
      .reduce((sum, r) => sum + r.requestedAmount, 0)
  );
  const paidOutAmount = round2(
    shopRequests
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + r.requestedAmount, 0)
  );
  const openRequest = shopRequests.find((r) => LOCKING_STATUSES.includes(r.status));

  return {
    shopkeeperId,
    verifiedEarnings,
    lockedAmount,
    paidOutAmount,
    availableBalance: round2(Math.max(0, verifiedEarnings - lockedAmount - paidOutAmount)),
    verifiedPaymentCount: verified.length,
    openRequestId: openRequest?.id,
  };
}

export function allBalances(): ShopkeeperBalance[] {
  const shopIds = new Set<string>();
  state.payments.forEach((p) => shopIds.add(p.shopkeeperId));
  state.payoutRequests.forEach((r) => shopIds.add(r.shopkeeperId));
  mockShopkeepers.forEach((s) => shopIds.add(s.id));

  return Array.from(shopIds)
    .map((id) => {
      const shop = shopkeeperRecord(id);
      const ledger = balanceFor(id);
      return {
        shopkeeperId: id,
        shopName: shop?.shopName ?? id,
        shopkeeperOwner: shop?.ownerName ?? '',
        shopkeeperPhone: shop?.phone ?? '',
        verifiedEarnings: ledger.verifiedEarnings,
        lockedAmount: ledger.lockedAmount,
        paidOutAmount: ledger.paidOutAmount,
        availableBalance: ledger.availableBalance,
        verifiedPaymentCount: ledger.verifiedPaymentCount,
        openRequestId: ledger.openRequestId,
      } satisfies ShopkeeperBalance;
    })
    .sort((a, b) => b.availableBalance - a.availableBalance);
}

// ─── Internal record helpers ─────────────────────────────────────────────────

function nextAuditId(): string {
  state.counters.audit += 1;
  return `AUD-${1001 + state.counters.audit}`;
}

function nextNotificationId(): string {
  state.counters.notification += 1;
  return `FN-${2001 + state.counters.notification}`;
}

function nextPaymentId(): string {
  state.counters.payment += 1;
  return `PAY-${1000 + state.counters.payment}`;
}

function nextRequestId(): string {
  state.counters.payoutRequest += 1;
  return `PR-${3001 + state.counters.payoutRequest}`;
}

function nextPayoutId(): string {
  state.counters.payout += 1;
  return `PO-${4001 + state.counters.payout}`;
}

function logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'> & { timestamp?: string }): void {
  state.auditLogs.push({
    id: nextAuditId(),
    timestamp: entry.timestamp ?? nowIso(),
    ...entry,
  } as AuditLogEntry);
}

function notify(entry: Omit<FinanceNotification, 'id' | 'read' | 'timestamp'> & { timestamp?: string }): void {
  state.notifications.push({
    id: nextNotificationId(),
    read: false,
    timestamp: entry.timestamp ?? nowIso(),
    ...entry,
  } as FinanceNotification);
}

function findPayment(paymentId: string): Payment {
  const payment = state.payments.find((p) => p.id === paymentId);
  if (!payment) throw new FinanceError('PAYMENT_NOT_FOUND');
  return payment;
}

function findRequest(requestId: string): PayoutRequest {
  const request = state.payoutRequests.find((r) => r.id === requestId);
  if (!request) throw new FinanceError('PAYOUT_NOT_FOUND');
  return request;
}

function syncOrderPayment(orderId: string, next: Order['paymentStatus']): void {
  const order = mockOrders.find((o) => o.id === orderId);
  if (!order) return;
  order.paymentStatus = next;
  order.updatedAt = nowIso();
}

function allocateEligiblePayments(
  shopkeeperId: string,
  amount: number,
  payments: Payment[] = state.payments,
  predicate: (p: Payment) => boolean = () => true
): string[] {
  const candidates = payments
    .filter(
      (p) =>
        p.shopkeeperId === shopkeeperId &&
        p.verificationStatus === 'verified' &&
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

function releasePayments(request: PayoutRequest, reason: string, at: string): void {
  request.paymentIds.forEach((pid) => {
    const payment = state.payments.find((p) => p.id === pid);
    if (!payment || payment.payoutRequestId !== request.id) return;
    payment.payoutState = 'eligible';
    payment.paymentStatus =
      payment.grossAmount < payment.orderAmount ? 'partially_paid' : 'verified';
    payment.payoutRequestId = undefined;
    payment.payoutId = undefined;
    payment.updatedAt = at;
    payment.history.push({
      action: 'released',
      status: payment.paymentStatus,
      by: CURRENT_ADMIN.name,
      at,
      note: reason,
    });
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function verifyPayment(
  paymentId: string,
  options: { note?: string } = {}
): Payment {
  const payment = findPayment(paymentId);

  if (payment.verificationStatus === 'verified') throw new FinanceError('PAYMENT_ALREADY_VERIFIED');
  if (payment.verificationStatus === 'declined') throw new FinanceError('PAYMENT_ALREADY_DECLINED');
  if (payment.paymentStatus === 'refunded') throw new FinanceError('PAYMENT_REFUNDED');

  const previous = payment.paymentStatus;
  const at = nowIso();

  payment.verificationStatus = 'verified';
  payment.verifiedBy = CURRENT_ADMIN.name;
  payment.verifiedAt = at;
  payment.payoutState = 'eligible';
  payment.paymentStatus = payment.grossAmount < payment.orderAmount ? 'partially_paid' : 'verified';
  payment.adminNote = options.note ?? payment.adminNote;
  payment.updatedAt = at;
  payment.history.push({
    action: 'verified',
    status: payment.paymentStatus,
    by: CURRENT_ADMIN.name,
    at,
    note: options.note ?? 'Payment verified — amount credited to shopkeeper earnings.',
  });

  syncOrderPayment(
    payment.orderId,
    payment.grossAmount >= payment.orderAmount ? 'paid' : 'partially_paid'
  );

  const shop = shopkeeperRecord(payment.shopkeeperId);

  logAudit({
    action: 'PAYMENT_VERIFIED',
    paymentId: payment.id,
    orderId: payment.orderId,
    userId: payment.userId,
    shopkeeperId: payment.shopkeeperId,
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    previousStatus: previous,
    newStatus: payment.paymentStatus,
    amount: payment.grossAmount,
    note: options.note,
    timestamp: at,
  });

  notify({
    audience: 'admin',
    type: 'payment_verified',
    title: 'Payment verified',
    subtitle: `${payment.id} • ₹${payment.grossAmount.toLocaleString('en-IN')} • ${payment.shopName}`,
    entityId: payment.id,
    entityType: 'payment',
    timestamp: at,
  });
  notify({
    audience: 'shopkeeper',
    type: 'payment_verified',
    title: 'Earnings credited',
    subtitle: `₹${payment.grossAmount.toLocaleString('en-IN')} added to ${shop?.shopName ?? payment.shopName} earnings`,
    entityId: payment.id,
    entityType: 'payment',
    timestamp: at,
  });
  notify({
    audience: 'customer',
    type: 'payment_verified',
    title: 'Payment confirmed',
    subtitle: `Payment for ${payment.orderId} has been confirmed`,
    entityId: payment.id,
    entityType: 'payment',
    timestamp: at,
  });

  emit();
  return payment;
}

export function declinePayment(
  paymentId: string,
  options: { reason: string; otherReason?: string; note?: string }
): Payment {
  const payment = findPayment(paymentId);

  if (payment.verificationStatus === 'declined') throw new FinanceError('PAYMENT_ALREADY_DECLINED');
  if (payment.verificationStatus === 'verified') {
    if (payment.payoutState !== 'eligible') throw new FinanceError('PAYMENT_LOCKED_BY_PAYOUT');
    throw new FinanceError('PAYMENT_ALREADY_VERIFIED');
  }
  if (payment.paymentStatus === 'refunded') throw new FinanceError('PAYMENT_REFUNDED');
  if (!options.reason) throw new FinanceError('INVALID_AMOUNT', 'A decline reason is required.');

  const previous = payment.paymentStatus;
  const at = nowIso();
  const reason = options.reason === 'Other' ? options.otherReason || 'Other' : options.reason;

  payment.paymentStatus = 'declined';
  payment.verificationStatus = 'declined';
  payment.payoutState = 'not_eligible';
  payment.declineReason = options.reason;
  payment.declineReasonOther = options.reason === 'Other' ? options.otherReason : undefined;
  payment.adminNote = options.note ?? payment.adminNote;
  payment.updatedAt = at;
  payment.history.push({
    action: 'declined',
    status: 'declined',
    by: CURRENT_ADMIN.name,
    at,
    reason,
    note: options.note,
  });

  const otherActive = state.payments.find(
    (p) =>
      p.orderId === payment.orderId &&
      p.id !== payment.id &&
      p.paymentStatus !== 'declined' &&
      p.paymentStatus !== 'refunded'
  );
  if (!otherActive) syncOrderPayment(payment.orderId, 'unpaid');

  logAudit({
    action: 'PAYMENT_DECLINED',
    paymentId: payment.id,
    orderId: payment.orderId,
    userId: payment.userId,
    shopkeeperId: payment.shopkeeperId,
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    previousStatus: previous,
    newStatus: 'declined',
    amount: payment.grossAmount,
    reason,
    note: options.note,
    timestamp: at,
  });

  notify({
    audience: 'admin',
    type: 'payment_declined',
    title: 'Payment declined',
    subtitle: `${payment.id} • ${reason}`,
    entityId: payment.id,
    entityType: 'payment',
    timestamp: at,
  });
  notify({
    audience: 'customer',
    type: 'payment_declined',
    title: 'Payment verification issue',
    subtitle: `Payment ${payment.id} could not be verified — ${reason}`,
    entityId: payment.id,
    entityType: 'payment',
    timestamp: at,
  });

  emit();
  return payment;
}

export function refundPayment(paymentId: string, options: { reason?: string } = {}): Payment {
  const payment = findPayment(paymentId);

  if (payment.paymentStatus === 'refunded') throw new FinanceError('PAYMENT_REFUNDED');
  if (payment.payoutState === 'locked' || payment.payoutState === 'released') {
    throw new FinanceError('PAYMENT_LOCKED_BY_PAYOUT');
  }
  if (payment.verificationStatus !== 'verified') {
    throw new FinanceError('PAYMENT_ALREADY_PROCESSED', 'Only verified payments can be refunded.');
  }

  const previous = payment.paymentStatus;
  const at = nowIso();

  payment.paymentStatus = 'refunded';
  payment.payoutState = 'not_eligible';
  payment.refundedAt = at;
  payment.updatedAt = at;
  payment.history.push({
    action: 'refunded',
    status: 'refunded',
    by: CURRENT_ADMIN.name,
    at,
    reason: options.reason ?? 'Refund initiated by admin',
  });

  syncOrderPayment(payment.orderId, 'refunded');

  logAudit({
    action: 'REFUND_CREATED',
    paymentId: payment.id,
    orderId: payment.orderId,
    userId: payment.userId,
    shopkeeperId: payment.shopkeeperId,
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    previousStatus: previous,
    newStatus: 'refunded',
    amount: payment.grossAmount,
    reason: options.reason,
    timestamp: at,
  });

  notify({
    audience: 'admin',
    type: 'payment_refunded',
    title: 'Payment refunded',
    subtitle: `${payment.id} • ₹${payment.grossAmount.toLocaleString('en-IN')}`,
    entityId: payment.id,
    entityType: 'payment',
    timestamp: at,
  });
  notify({
    audience: 'customer',
    type: 'payment_refunded',
    title: 'Refund processed',
    subtitle: `₹${payment.grossAmount.toLocaleString('en-IN')} refunded for ${payment.orderId}`,
    entityId: payment.id,
    entityType: 'payment',
    timestamp: at,
  });

  emit();
  return payment;
}

/**
 * Records a payment automatically when an order settles
 * (called by the orders module — payments are never keyed in manually).
 */
export function recordOrderPaymentChange(order: Order): Payment | null {
  const settled = order.paymentStatus === 'paid' || order.paymentStatus === 'partially_paid';
  const active = state.payments.find(
    (p) =>
      p.orderId === order.id &&
      p.paymentStatus !== 'declined' &&
      p.paymentStatus !== 'refunded'
  );

  if (order.paymentStatus === 'refunded') {
    state.payments
      .filter(
        (p) =>
          p.orderId === order.id &&
          p.paymentStatus !== 'refunded' &&
          p.paymentStatus !== 'declined' &&
          p.verificationStatus === 'verified' &&
          p.payoutState === 'eligible'
      )
      .forEach((p) => refundPayment(p.id, { reason: 'Order payment reversed' }));
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
    orderType: 'Print Order',
    orderDate: order.createdAt,
    paymentDate: at,
    orderAmount: order.totalAmount,
    grossAmount: amount,
    eligibleShopkeeperAmount: amount,
    paymentMethod: paymentMethodFor(order.id),
    transactionId: `TXN-${order.id.replace('OMX-', '')}-${Math.floor(1000 + Math.random() * 8999)}`,
    gatewayReference: `GP-${order.id.replace('OMX-', '')}-${Math.floor(100 + Math.random() * 899)}`,
    utrNumber: String(620490000000 + Math.floor(Math.random() * 999999)),
    invoiceNumber: `INV-2026-${order.id.replace('OMX-', '')}`,
    paymentStatus: 'verification_required',
    verificationStatus: 'pending',
    payoutState: 'not_eligible',
    history: [
      {
        action: 'created',
        status: 'verification_required',
        by: 'Customer Payment Gateway',
        at,
        note: 'Amount received in the company payment account.',
      },
    ],
    createdAt: at,
    updatedAt: at,
  };

  state.payments.push(payment);

  logAudit({
    action: 'PAYMENT_RECEIVED',
    paymentId: payment.id,
    orderId: payment.orderId,
    userId: payment.userId,
    shopkeeperId: payment.shopkeeperId,
    adminId: 'SYSTEM',
    adminName: 'Payment Gateway',
    newStatus: 'verification_required',
    amount: payment.grossAmount,
    timestamp: at,
  });

  notify({
    audience: 'admin',
    type: 'payment_received',
    title: 'New customer payment',
    subtitle: `${payment.userName} • ₹${payment.grossAmount.toLocaleString('en-IN')} • ${payment.orderId}`,
    entityId: payment.id,
    entityType: 'payment',
    timestamp: at,
  });
  notify({
    audience: 'admin',
    type: 'payment_verification_required',
    title: 'Payment requires verification',
    subtitle: `${payment.id} • ₹${payment.grossAmount.toLocaleString('en-IN')}`,
    entityId: payment.id,
    entityType: 'payment',
    timestamp: at,
  });

  emit();
  return payment;
}

export interface PayoutRequestInput {
  shopkeeperId: string;
  requestedAmount: number;
  payoutMethod: PayoutMethod;
  accountDetails: string;
}

export function requestPayout(input: PayoutRequestInput): PayoutRequest {
  const shop = requireShopkeeper(input.shopkeeperId);
  const amount = round2(Number(input.requestedAmount));

  if (!Number.isFinite(amount) || amount <= 0) throw new FinanceError('INVALID_AMOUNT');
  if (amount < MIN_PAYOUT_AMOUNT) throw new FinanceError('BELOW_MINIMUM');

  const ledger = balanceFor(input.shopkeeperId);
  const open = state.payoutRequests.find(
    (r) => r.shopkeeperId === input.shopkeeperId && LOCKING_STATUSES.includes(r.status)
  );
  if (open) throw new FinanceError('DUPLICATE_REQUEST');
  if (amount > ledger.availableBalance) throw new FinanceError('INSUFFICIENT_BALANCE');

  const at = nowIso();
  const request: PayoutRequest = {
    id: nextRequestId(),
    shopkeeperId: input.shopkeeperId,
    shopkeeperName: shop.ownerName,
    shopName: shop.shopName,
    shopkeeperPhone: shop.phone,
    requestedAmount: amount,
    eligibleBalanceAtRequest: ledger.availableBalance,
    status: 'requested',
    payoutMethod: input.payoutMethod,
    accountDetails: input.accountDetails || 'XXXX0000',
    paymentIds: [],
    timeline: [
      {
        status: 'requested',
        at,
        by: `${shop.ownerName} (Shopkeeper)`,
        note: 'Payout requested from the shopkeeper app.',
      },
    ],
    createdAt: at,
    updatedAt: at,
  };

  state.payoutRequests.push(request);

  logAudit({
    action: 'PAYOUT_REQUESTED',
    payoutRequestId: request.id,
    shopkeeperId: request.shopkeeperId,
    adminId: request.shopkeeperId,
    adminName: `${shop.ownerName} (Shopkeeper)`,
    newStatus: 'requested',
    amount,
    note: `Available balance at request: ₹${ledger.availableBalance.toLocaleString('en-IN')}`,
    timestamp: at,
  });

  notify({
    audience: 'admin',
    type: 'payout_requested',
    title: 'New shopkeeper payout request',
    subtitle: `${shop.shopName} • ₹${amount.toLocaleString('en-IN')} • ${request.id}`,
    entityId: request.id,
    entityType: 'payout',
    timestamp: at,
  });
  notify({
    audience: 'shopkeeper',
    type: 'payout_requested',
    title: 'Payout request received',
    subtitle: `${request.id} • ₹${amount.toLocaleString('en-IN')}`,
    entityId: request.id,
    entityType: 'payout',
    timestamp: at,
  });

  emit();
  return request;
}

function assertStatus(request: PayoutRequest, allowed: PayoutStatus[]): void {
  if (!allowed.includes(request.status)) throw new FinanceError('PAYOUT_INVALID_STATE');
}

function pushTimeline(
  request: PayoutRequest,
  entry: { status: PayoutStatus; note?: string; reference?: string; by?: string }
): string {
  const at = nowIso();
  request.timeline.push({
    status: entry.status,
    at,
    by: entry.by ?? CURRENT_ADMIN.name,
    note: entry.note,
    reference: entry.reference,
  });
  request.status = entry.status;
  request.updatedAt = at;
  return at;
}

export function holdPayout(requestId: string, options: { note?: string } = {}): PayoutRequest {
  const request = findRequest(requestId);
  assertStatus(request, ['requested', 'approved']);

  const previous = request.status;
  const at = pushTimeline(request, {
    status: 'under_review',
    note: options.note ?? 'Placed under review by admin.',
  });

  logAudit({
    action: 'PAYOUT_ON_HOLD',
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    previousStatus: previous,
    newStatus: 'under_review',
    amount: request.requestedAmount,
    note: options.note,
    timestamp: at,
  });

  emit();
  return request;
}

export function approvePayout(requestId: string, options: { note?: string } = {}): PayoutRequest {
  const request = findRequest(requestId);
  assertStatus(request, ['requested', 'under_review']);

  // Server-side validation: requested amount must fit the earned balance
  // after accounting for completed payouts and other locked requests.
  const ledger = balanceFor(request.shopkeeperId);
  const otherLocks = round2(ledger.lockedAmount - request.requestedAmount);
  const maxAllowed = round2(ledger.verifiedEarnings - ledger.paidOutAmount - otherLocks);
  if (request.requestedAmount > maxAllowed) throw new FinanceError('INSUFFICIENT_BALANCE');

  // Re-approval after a hold re-validates the reservation from scratch.
  if (request.paymentIds.length > 0) {
    releasePayments(request, `Reservation re-validated for payout request ${request.id}.`, nowIso());
    request.paymentIds = [];
  }

  const rate = state.commissionRate;
  const { commission, net } = commissionFor(request.requestedAmount, rate);
  if (net <= 0) throw new FinanceError('INVALID_AMOUNT');

  const at = pushTimeline(request, {
    status: 'approved',
    note: options.note ?? 'Commission applied and payout amount reserved.',
  });

  const paymentIds = allocateEligiblePayments(request.shopkeeperId, request.requestedAmount);
  paymentIds.forEach((pid) => {
    const payment = state.payments.find((p) => p.id === pid);
    if (!payment) return;
    payment.payoutState = 'locked';
    payment.paymentStatus = 'payout_pending';
    payment.payoutRequestId = request.id;
    payment.updatedAt = at;
    payment.history.push({
      action: 'locked',
      status: 'payout_pending',
      by: CURRENT_ADMIN.name,
      at,
      note: `Reserved for payout request ${request.id}.`,
    });
  });

  request.payoutId = request.payoutId ?? nextPayoutId();
  request.commissionRate = rate;
  request.internalCommission = commission;
  request.netPayout = net;
  request.paymentIds = paymentIds;
  request.adminNote = options.note ?? request.adminNote;

  logAudit({
    action: 'PAYOUT_APPROVED',
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    previousStatus: 'under_review',
    newStatus: 'approved',
    amount: request.requestedAmount,
    note: options.note,
    timestamp: at,
  });
  logAudit({
    action: 'COMMISSION_CALCULATED',
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    amount: commission,
    note: `Gross ₹${request.requestedAmount.toLocaleString('en-IN')} − ${rate}% commission = Net ₹${net.toLocaleString('en-IN')}`,
    timestamp: at,
  });

  notify({
    audience: 'admin',
    type: 'payout_approved',
    title: 'Payout request approved',
    subtitle: `${request.shopName} • Net ₹${net.toLocaleString('en-IN')} • ${request.id}`,
    entityId: request.id,
    entityType: 'payout',
    timestamp: at,
  });
  notify({
    audience: 'shopkeeper',
    type: 'payout_approved',
    title: 'Payout request approved',
    subtitle: `${request.id} is approved and being processed`,
    entityId: request.id,
    entityType: 'payout',
    timestamp: at,
  });

  emit();
  return request;
}

export function processPayout(requestId: string, options: { note?: string } = {}): PayoutRequest {
  const request = findRequest(requestId);
  assertStatus(request, ['approved']);

  const previous = request.status;
  const at = pushTimeline(request, {
    status: 'processing',
    note: options.note ?? 'Bank transfer initiated by finance team.',
  });

  logAudit({
    action: 'PAYOUT_PROCESSING',
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    previousStatus: previous,
    newStatus: 'processing',
    amount: request.requestedAmount,
    note: options.note,
    timestamp: at,
  });

  notify({
    audience: 'admin',
    type: 'payout_processing',
    title: 'Payout processing',
    subtitle: `${request.shopName} • ₹${request.requestedAmount.toLocaleString('en-IN')} • ${request.id}`,
    entityId: request.id,
    entityType: 'payout',
    timestamp: at,
  });
  notify({
    audience: 'shopkeeper',
    type: 'payout_processing',
    title: 'Payout processing',
    subtitle: `${request.id} is being transferred`,
    entityId: request.id,
    entityType: 'payout',
    timestamp: at,
  });

  emit();
  return request;
}

export function completePayout(
  requestId: string,
  options: { reference?: string; note?: string } = {}
): PayoutRequest {
  const request = findRequest(requestId);
  assertStatus(request, ['processing']);

  const previous = request.status;
  const reference =
    options.reference?.trim() ||
    `IMPS/${new Date().toISOString().slice(2, 10).replace(/-/g, '')}/${Math.floor(100000 + Math.random() * 899999)}`;
  const at = pushTimeline(request, {
    status: 'completed',
    note: options.note ?? 'Funds credited to the shopkeeper account.',
    reference,
  });

  request.transactionReference = reference;
  request.completedAt = at;

  request.paymentIds.forEach((pid) => {
    const payment = state.payments.find((p) => p.id === pid);
    if (!payment) return;
    payment.payoutState = 'released';
    payment.paymentStatus = 'completed';
    payment.payoutId = request.payoutId;
    payment.updatedAt = at;
    payment.history.push({
      action: 'released',
      status: 'completed',
      by: CURRENT_ADMIN.name,
      at,
      note: `Included in completed payout ${request.payoutId ?? request.id}.`,
    });
  });

  logAudit({
    action: 'PAYOUT_COMPLETED',
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    previousStatus: previous,
    newStatus: 'completed',
    amount: request.netPayout ?? request.requestedAmount,
    note: options.note,
    reason: undefined,
    timestamp: at,
  });

  notify({
    audience: 'admin',
    type: 'payout_completed',
    title: 'Payout completed',
    subtitle: `${request.shopName} • ₹${(request.netPayout ?? request.requestedAmount).toLocaleString('en-IN')} • ${request.id}`,
    entityId: request.id,
    entityType: 'payout',
    timestamp: at,
  });
  notify({
    audience: 'shopkeeper',
    type: 'payout_completed',
    title: 'Payout completed',
    subtitle: `₹${(request.netPayout ?? request.requestedAmount).toLocaleString('en-IN')} credited — ${request.id}`,
    entityId: request.id,
    entityType: 'payout',
    timestamp: at,
  });

  emit();
  return request;
}

export function rejectPayout(
  requestId: string,
  options: { reason: string; note?: string }
): PayoutRequest {
  const request = findRequest(requestId);
  assertStatus(request, ['requested', 'under_review', 'approved']);

  if (!options.reason) throw new FinanceError('INVALID_AMOUNT', 'A rejection reason is required.');

  const previous = request.status;
  const at = nowIso();

  releasePayments(request, `Removed from payout request ${request.id} — request rejected.`, at);

  request.timeline.push({
    status: 'rejected',
    at,
    by: CURRENT_ADMIN.name,
    note: options.note ?? options.reason,
  });
  request.status = 'rejected';
  request.rejectReason = options.reason;
  request.adminNote = options.note ?? request.adminNote;
  request.updatedAt = at;
  request.paymentIds = [];

  logAudit({
    action: 'PAYOUT_REJECTED',
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    previousStatus: previous,
    newStatus: 'rejected',
    amount: request.requestedAmount,
    reason: options.reason,
    note: options.note,
    timestamp: at,
  });

  notify({
    audience: 'admin',
    type: 'payout_rejected',
    title: 'Payout request rejected',
    subtitle: `${request.shopName} • ${options.reason} • ${request.id}`,
    entityId: request.id,
    entityType: 'payout',
    timestamp: at,
  });
  notify({
    audience: 'shopkeeper',
    type: 'payout_rejected',
    title: 'Payout request rejected',
    subtitle: `${request.id} — ${options.reason}`,
    entityId: request.id,
    entityType: 'payout',
    timestamp: at,
  });

  emit();
  return request;
}

export function failPayout(
  requestId: string,
  options: { reason: string; note?: string }
): PayoutRequest {
  const request = findRequest(requestId);
  assertStatus(request, ['processing', 'approved']);

  const previous = request.status;
  const at = nowIso();

  // Failed payouts must never permanently deduct the balance.
  releasePayments(request, `Payout failed — amount returned to the eligible balance.`, at);

  request.timeline.push({
    status: 'failed',
    at,
    by: CURRENT_ADMIN.name,
    note: options.note ?? options.reason,
  });
  request.status = 'failed';
  request.rejectReason = options.reason;
  request.adminNote = options.note ?? request.adminNote;
  request.updatedAt = at;
  request.paymentIds = [];

  logAudit({
    action: 'PAYOUT_FAILED',
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    previousStatus: previous,
    newStatus: 'failed',
    amount: request.requestedAmount,
    reason: options.reason,
    note: options.note,
    timestamp: at,
  });

  notify({
    audience: 'admin',
    type: 'payout_failed',
    title: 'Payout failed',
    subtitle: `${request.shopName} • ${options.reason} — balance restored`,
    entityId: request.id,
    entityType: 'payout',
    timestamp: at,
  });

  emit();
  return request;
}

export function cancelPayout(requestId: string, options: { reason?: string } = {}): PayoutRequest {
  const request = findRequest(requestId);
  assertStatus(request, ['requested', 'under_review']);

  const previous = request.status;
  const at = nowIso();

  releasePayments(request, `Request cancelled — amount returned to the eligible balance.`, at);

  request.timeline.push({
    status: 'cancelled',
    at,
    by: `${request.shopkeeperName} (Shopkeeper)`,
    note: options.reason ?? 'Cancelled by shopkeeper.',
  });
  request.status = 'cancelled';
  request.updatedAt = at;
  request.paymentIds = [];

  logAudit({
    action: 'PAYOUT_CANCELLED',
    payoutRequestId: request.id,
    shopkeeperId: request.shopkeeperId,
    adminId: request.shopkeeperId,
    adminName: `${request.shopkeeperName} (Shopkeeper)`,
    previousStatus: previous,
    newStatus: 'cancelled',
    amount: request.requestedAmount,
    reason: options.reason,
    timestamp: at,
  });

  notify({
    audience: 'admin',
    type: 'payout_rejected',
    title: 'Payout request cancelled',
    subtitle: `${request.shopName} • ${request.id}`,
    entityId: request.id,
    entityType: 'payout',
    timestamp: at,
  });

  emit();
  return request;
}

export function addPayoutNote(requestId: string, note: string): PayoutRequest {
  const request = findRequest(requestId);
  if (!note.trim()) throw new FinanceError('INVALID_AMOUNT', 'Note cannot be empty.');

  request.adminNote = note.trim();
  request.updatedAt = nowIso();

  logAudit({
    action: 'PAYOUT_NOTE_ADDED',
    payoutRequestId: request.id,
    payoutId: request.payoutId,
    shopkeeperId: request.shopkeeperId,
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    newStatus: request.status,
    note: note.trim(),
    timestamp: request.updatedAt,
  });

  emit();
  return request;
}

export function setCommissionRate(rate: number): number {
  const value = round2(Number(rate));
  if (!Number.isFinite(value) || value < 0 || value > COMMISSION_RATE_MAX) {
    throw new FinanceError('COMMISSION_RATE_INVALID');
  }
  const previous = state.commissionRate;
  if (previous === value) return value;

  state.commissionRate = value;

  logAudit({
    action: 'COMMISSION_RATE_UPDATED',
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    previousStatus: `${previous}%`,
    newStatus: `${value}%`,
    note: 'Platform commission rate updated from Platform Settings.',
  });

  emit();
  return value;
}

export function markNotificationsRead(): void {
  state.notifications.forEach((n) => {
    if (n.audience === 'admin') n.read = true;
  });
  emit();
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export function computeStats(): FinancialStats {
  const payments = state.payments;
  const requests = state.payoutRequests;
  const sum = (list: Payment[]) => round2(list.reduce((acc, p) => acc + p.grossAmount, 0));

  const received = payments.filter((p) => p.paymentStatus !== 'declined');
  const verified = payments.filter((p) => p.verificationStatus === 'verified');
  const pending = payments.filter((p) => p.verificationStatus === 'pending');
  const declined = payments.filter((p) => p.paymentStatus === 'declined');
  const refunded = payments.filter((p) => p.paymentStatus === 'refunded');
  const todayPayments = payments.filter((p) => isToday(p.paymentDate));
  const monthPayments = payments.filter((p) => withinLastDays(p.paymentDate, 30));

  const pendingPayouts = requests.filter((r) => ['requested', 'under_review'].includes(r.status));
  const processingPayouts = requests.filter((r) => ['approved', 'processing'].includes(r.status));
  const completedPayouts = requests.filter((r) => r.status === 'completed');

  return {
    totalCustomerPayments: sum(received),
    totalCustomerPaymentCount: received.length,
    verifiedAmount: sum(verified),
    verifiedCount: verified.length,
    pendingVerificationAmount: sum(pending),
    pendingVerificationCount: pending.length,
    declinedAmount: sum(declined),
    declinedCount: declined.length,
    refundedAmount: sum(refunded),
    refundedCount: refunded.length,
    shopkeeperPayable: round2(allBalances().reduce((acc, b) => acc + b.availableBalance, 0)),
    pendingPayoutCount: pendingPayouts.length,
    pendingPayoutAmount: round2(pendingPayouts.reduce((acc, r) => acc + r.requestedAmount, 0)),
    processingPayoutCount: processingPayouts.length,
    processingPayoutAmount: round2(processingPayouts.reduce((acc, r) => acc + r.requestedAmount, 0)),
    completedPayoutCount: completedPayouts.length,
    completedPayoutAmount: round2(
      completedPayouts.reduce((acc, r) => acc + (r.netPayout ?? r.requestedAmount), 0)
    ),
    totalCommission: round2(
      requests.reduce((acc, r) => acc + (r.internalCommission ?? 0), 0)
    ),
    todaysPaymentsAmount: sum(todayPayments),
    todaysPaymentsCount: todayPayments.length,
    todaysPayoutsCompleted: completedPayouts.filter((r) => isToday(r.completedAt)).length,
    monthlyVolume: sum(monthPayments),
    monthlyCount: monthPayments.length,
  };
}

export function paymentVolumeSeries(days: number): PaymentVolumePoint[] {
  const buckets = new Map<string, { amount: number; count: number }>();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { amount: 0, count: 0 });
  }

  state.payments.forEach((p) => {
    if (p.paymentStatus === 'declined') return;
    const key = new Date(p.paymentDate).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) return;
    bucket.amount = round2(bucket.amount + p.grossAmount);
    bucket.count += 1;
  });

  return Array.from(buckets.entries()).map(([date, v]) => ({
    date,
    amount: v.amount,
    count: v.count,
  }));
}

export function commissionSeries(days: number): CommissionPoint[] {
  const buckets = new Map<string, { commission: number; netPayout: number; count: number }>();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { commission: 0, netPayout: 0, count: 0 });
  }

  state.payoutRequests.forEach((r) => {
    const approved = r.timeline.find((t) => t.status === 'approved');
    if (!approved) return;
    const key = new Date(approved.at).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) return;
    bucket.commission = round2(bucket.commission + (r.internalCommission ?? 0));
    bucket.netPayout = round2(bucket.netPayout + (r.netPayout ?? 0));
    bucket.count += 1;
  });

  return Array.from(buckets.entries()).map(([date, v]) => ({ date, ...v }));
}

export function statusDistribution(
  kind: 'payment' | 'payout'
): FinanceStatusShare[] {
  if (kind === 'payment') {
    const groups = new Map<PaymentStatus, Payment[]>();
    state.payments.forEach((p) => {
      const list = groups.get(p.paymentStatus) ?? [];
      list.push(p);
      groups.set(p.paymentStatus, list);
    });
    const total = state.payments.length || 1;
    return Array.from(groups.entries())
      .map(([key, list]) => ({
        key,
        label: key.replace(/_/g, ' '),
        count: list.length,
        amount: round2(list.reduce((acc, p) => acc + p.grossAmount, 0)),
        percentage: Math.round((list.length / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }

  const groups = new Map<PayoutStatus, PayoutRequest[]>();
  state.payoutRequests.forEach((r) => {
    const list = groups.get(r.status) ?? [];
    list.push(r);
    groups.set(r.status, list);
  });
  const total = state.payoutRequests.length || 1;
  return Array.from(groups.entries())
    .map(([key, list]) => ({
      key,
      label: key.replace(/_/g, ' '),
      count: list.length,
      amount: round2(list.reduce((acc, r) => acc + r.requestedAmount, 0)),
      percentage: Math.round((list.length / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function shopkeeperPayoutTop(limit = 6): ShopkeeperPayoutPoint[] {
  const map = new Map<string, ShopkeeperPayoutPoint>();
  state.payoutRequests
    .filter((r) => r.status === 'completed' || r.status === 'processing' || r.status === 'approved')
    .forEach((r) => {
      const existing = map.get(r.shopkeeperId);
      if (existing) {
        existing.amount = round2(existing.amount + r.requestedAmount);
        existing.count += 1;
      } else {
        map.set(r.shopkeeperId, {
          shopkeeperId: r.shopkeeperId,
          shopName: r.shopName,
          amount: r.requestedAmount,
          count: 1,
        });
      }
    });
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, limit);
}
