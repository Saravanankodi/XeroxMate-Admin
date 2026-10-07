import "server-only";

import type { TimeRange } from "@/types/analytics";
import type {
  CommissionPoint,
  FinanceStatusShare,
  FinancialStats,
  Payment,
  PaymentMethod,
  PaymentMethodShare,
  PaymentStatus,
  PaymentVolumePoint,
  PayoutRequest,
  PayoutStatus,
  ShopkeeperPayoutPoint,
} from "@/types/payment";
import { allBalances } from "./balances";
import {
  isToday,
  round2,
  withinLastDays,
} from "./helpers";
import { listAllPayments } from "./payments";
import { listAllPayouts } from "./payouts";

export const RANGE_DAYS: Record<TimeRange, number> = {
  "7d": 7,
  "30d": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  upi: "UPI",
  card: "Card",
  net_banking: "Net Banking",
  wallet: "Wallet",
  cod: "Cash on Delivery",
};

export async function computeStats(): Promise<FinancialStats> {
  const [payments, requests, balances] = await Promise.all([
    listAllPayments(),
    listAllPayouts(),
    allBalances(),
  ]);

  const sum = (list: Payment[]) => round2(list.reduce((acc, p) => acc + p.grossAmount, 0));

  const received = payments.filter((p) => p.paymentStatus !== "declined");
  const verified = payments.filter((p) => p.verificationStatus === "verified");
  const pending = payments.filter((p) => p.verificationStatus === "pending");
  const declined = payments.filter((p) => p.paymentStatus === "declined");
  const refunded = payments.filter((p) => p.paymentStatus === "refunded");
  const todayPayments = payments.filter((p) => isToday(p.paymentDate));
  const monthPayments = payments.filter((p) => withinLastDays(p.paymentDate, 30));

  const pendingPayouts = requests.filter((r) => ["requested", "under_review"].includes(r.status));
  const processingPayouts = requests.filter((r) => ["approved", "processing"].includes(r.status));
  const completedPayouts = requests.filter((r) => r.status === "completed");

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
    shopkeeperPayable: round2(balances.reduce((acc, b) => acc + b.availableBalance, 0)),
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

export async function paymentVolumeSeries(
  days: number
): Promise<PaymentVolumePoint[]> {
  const payments = await listAllPayments();
  const buckets = new Map<string, { amount: number; count: number }>();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { amount: 0, count: 0 });
  }

  payments.forEach((p) => {
    if (p.paymentStatus === "declined") return;
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

export async function commissionSeries(
  days: number
): Promise<CommissionPoint[]> {
  const requests = await listAllPayouts();
  const buckets = new Map<string, { commission: number; netPayout: number; count: number }>();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { commission: 0, netPayout: 0, count: 0 });
  }

  requests.forEach((r) => {
    const approved = r.timeline.find((t) => t.status === "approved");
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

export async function statusDistribution(
  kind: "payment" | "payout"
): Promise<FinanceStatusShare[]> {
  if (kind === "payment") {
    const payments = await listAllPayments();
    const groups = new Map<PaymentStatus, Payment[]>();
    payments.forEach((p) => {
      const list = groups.get(p.paymentStatus) ?? [];
      list.push(p);
      groups.set(p.paymentStatus, list);
    });
    const total = payments.length || 1;
    return Array.from(groups.entries())
      .map(([key, list]) => ({
        key,
        label: key.replace(/_/g, " "),
        count: list.length,
        amount: round2(list.reduce((acc, p) => acc + p.grossAmount, 0)),
        percentage: Math.round((list.length / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }

  const requests = await listAllPayouts();
  const groups = new Map<PayoutStatus, PayoutRequest[]>();
  requests.forEach((r) => {
    const list = groups.get(r.status) ?? [];
    list.push(r);
    groups.set(r.status, list);
  });
  const total = requests.length || 1;
  return Array.from(groups.entries())
    .map(([key, list]) => ({
      key,
      label: key.replace(/_/g, " "),
      count: list.length,
      amount: round2(list.reduce((acc, r) => acc + r.requestedAmount, 0)),
      percentage: Math.round((list.length / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export async function paymentMethodDistribution(): Promise<PaymentMethodShare[]> {
  const payments = await listAllPayments();
  const groups = new Map<PaymentMethod, { count: number; amount: number }>();
  let totalAmount = 0;

  payments
    .filter((p) => p.paymentStatus !== "declined")
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
}

export async function shopkeeperPayoutTop(
  limit = 6
): Promise<ShopkeeperPayoutPoint[]> {
  const requests = await listAllPayouts();
  const map = new Map<string, ShopkeeperPayoutPoint>();

  requests
    .filter((r) => r.status === "completed" || r.status === "processing" || r.status === "approved")
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
