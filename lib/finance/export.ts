/** Client-side CSV report export used by the finance module. */

import type {
  AuditLogEntry,
  Payment,
  PayoutRequest,
  ShopkeeperBalance,
} from '@/types/payment';

function escapeCell(value: unknown): string {
  const str = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | undefined)[][]
): void {
  const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function exportPaymentsCsv(payments: Payment[]): void {
  downloadCsv(
    `xeroxmate-payments-${stamp()}.csv`,
    [
      'Payment ID', 'Order ID', 'Transaction ID', 'UTR', 'Invoice', 'User ID', 'User Name',
      'User Email', 'User Phone', 'Shopkeeper ID', 'Shop Name', 'Shopkeeper Owner',
      'Order Type', 'Order Date', 'Payment Date', 'Order Amount', 'Amount', 'Payment Method',
      'Payment Status', 'Verification Status', 'Payout State', 'Verified By', 'Verified At',
      'Decline Reason', 'Created At',
    ],
    payments.map((p) => [
      p.id, p.orderId, p.transactionId, p.utrNumber, p.invoiceNumber, p.userId, p.userName,
      p.userEmail, p.userPhone, p.shopkeeperId, p.shopName, p.shopkeeperOwner,
      p.orderType, p.orderDate, p.paymentDate, p.orderAmount, p.grossAmount, p.paymentMethod,
      p.paymentStatus, p.verificationStatus, p.payoutState, p.verifiedBy ?? '', p.verifiedAt ?? '',
      p.declineReason ?? '', p.createdAt,
    ])
  );
}

export function exportPayoutsCsv(requests: PayoutRequest[]): void {
  downloadCsv(
    `xeroxmate-payouts-${stamp()}.csv`,
    [
      'Request ID', 'Payout ID', 'Shopkeeper ID', 'Shop Name', 'Shopkeeper', 'Requested Amount',
      'Balance At Request', 'Status', 'Payout Method', 'Account', 'Commission Rate %',
      'Commission', 'Net Payout', 'Reference', 'Created At', 'Completed At', 'Reject Reason',
    ],
    requests.map((r) => [
      r.id, r.payoutId ?? '', r.shopkeeperId, r.shopName, r.shopkeeperName, r.requestedAmount,
      r.eligibleBalanceAtRequest, r.status, r.payoutMethod, r.accountDetails,
      r.commissionRate ?? '', r.internalCommission ?? '', r.netPayout ?? '',
      r.transactionReference ?? '', r.createdAt, r.completedAt ?? '', r.rejectReason ?? '',
    ])
  );
}

export function exportBalancesCsv(balances: ShopkeeperBalance[]): void {
  downloadCsv(
    `xeroxmate-shopkeeper-balances-${stamp()}.csv`,
    [
      'Shopkeeper ID', 'Shop Name', 'Owner', 'Verified Earnings', 'Locked Amount',
      'Paid Out', 'Available Balance', 'Verified Payments', 'Open Request',
    ],
    balances.map((b) => [
      b.shopkeeperId, b.shopName, b.shopkeeperOwner, b.verifiedEarnings, b.lockedAmount,
      b.paidOutAmount, b.availableBalance, b.verifiedPaymentCount, b.openRequestId ?? '',
    ])
  );
}

export function exportAuditCsv(logs: AuditLogEntry[]): void {
  downloadCsv(
    `xeroxmate-finance-audit-${stamp()}.csv`,
    [
      'Action ID', 'Action', 'Payment ID', 'Payout Request ID', 'Payout ID', 'Order ID',
      'User ID', 'Shopkeeper ID', 'Admin ID', 'Admin', 'Previous Status', 'New Status',
      'Amount', 'Reason', 'Note', 'Timestamp',
    ],
    logs.map((l) => [
      l.id, l.action, l.paymentId ?? '', l.payoutRequestId ?? '', l.payoutId ?? '', l.orderId ?? '',
      l.userId ?? '', l.shopkeeperId ?? '', l.adminId, l.adminName, l.previousStatus ?? '',
      l.newStatus ?? '', l.amount ?? '', l.reason ?? '', l.note ?? '', l.timestamp,
    ])
  );
}
