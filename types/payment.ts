export type PaymentStatus =
  | 'pending'
  | 'verification_required'
  | 'verified'
  | 'declined'
  | 'refunded'
  | 'payout_pending'
  | 'partially_paid'
  | 'paid_to_shopkeeper'
  | 'completed';

export type PaymentVerificationStatus = 'pending' | 'verified' | 'declined' | 'not_required';

export type PaymentPayoutState = 'not_eligible' | 'eligible' | 'locked' | 'released';

export type PaymentMethod = 'upi' | 'card' | 'net_banking' | 'wallet' | 'cod';

export type DeclineReason =
  | 'Payment not received'
  | 'Invalid transaction reference'
  | 'Duplicate payment'
  | 'Incorrect amount'
  | 'Suspicious transaction'
  | 'Payment mismatch'
  | 'Other';

export const DECLINE_REASONS: DeclineReason[] = [
  'Payment not received',
  'Invalid transaction reference',
  'Duplicate payment',
  'Incorrect amount',
  'Suspicious transaction',
  'Payment mismatch',
  'Other',
];

export type PaymentHistoryAction = 'created' | 'verified' | 'declined' | 'refunded' | 'locked' | 'released';

export interface PaymentHistoryEntry {
  action: PaymentHistoryAction;
  status: PaymentStatus;
  by: string;
  at: string;
  reason?: string;
  note?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  shopkeeperId: string;
  shopName: string;
  shopkeeperOwner: string;
  shopkeeperPhone: string;
  orderType: string;
  orderDate: string;
  paymentDate: string;
  orderAmount: number;
  grossAmount: number;
  eligibleShopkeeperAmount: number;
  paymentMethod: PaymentMethod;
  transactionId: string;
  gatewayReference: string;
  utrNumber: string;
  invoiceNumber: string;
  paymentStatus: PaymentStatus;
  verificationStatus: PaymentVerificationStatus;
  payoutState: PaymentPayoutState;
  verifiedBy?: string;
  verifiedAt?: string;
  declineReason?: string;
  declineReasonOther?: string;
  adminNote?: string;
  refundedAt?: string;
  payoutRequestId?: string;
  payoutId?: string;
  history: PaymentHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export type PayoutStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'failed';

export type PayoutMethod = 'bank_transfer' | 'upi' | 'wallet';

export interface PayoutTimelineEntry {
  status: PayoutStatus;
  at: string;
  by: string;
  note?: string;
  reference?: string;
}

export interface PayoutRequest {
  id: string;
  payoutId?: string;
  shopkeeperId: string;
  shopkeeperName: string;
  shopName: string;
  shopkeeperPhone: string;
  requestedAmount: number;
  eligibleBalanceAtRequest: number;
  status: PayoutStatus;
  payoutMethod: PayoutMethod;
  accountDetails: string;
  adminNote?: string;
  rejectReason?: string;
  commissionRate?: number;
  internalCommission?: number;
  netPayout?: number;
  transactionReference?: string;
  completedAt?: string;
  paymentIds: string[];
  timeline: PayoutTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ShopkeeperBalance {
  shopkeeperId: string;
  shopName: string;
  shopkeeperOwner: string;
  shopkeeperPhone: string;
  verifiedEarnings: number;
  lockedAmount: number;
  paidOutAmount: number;
  availableBalance: number;
  verifiedPaymentCount: number;
  openRequestId?: string;
}

export type AuditAction =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_DECLINED'
  | 'PAYMENT_UPDATED'
  | 'REFUND_CREATED'
  | 'PAYOUT_REQUESTED'
  | 'PAYOUT_ON_HOLD'
  | 'PAYOUT_APPROVED'
  | 'PAYOUT_REJECTED'
  | 'PAYOUT_PROCESSING'
  | 'PAYOUT_COMPLETED'
  | 'PAYOUT_FAILED'
  | 'PAYOUT_CANCELLED'
  | 'COMMISSION_CALCULATED'
  | 'COMMISSION_RATE_UPDATED'
  | 'PAYOUT_NOTE_ADDED';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  paymentId?: string;
  payoutRequestId?: string;
  payoutId?: string;
  orderId?: string;
  userId?: string;
  shopkeeperId?: string;
  adminId: string;
  adminName: string;
  previousStatus?: string;
  newStatus?: string;
  amount?: number;
  reason?: string;
  note?: string;
  timestamp: string;
}

export type FinanceNotificationAudience = 'admin' | 'shopkeeper' | 'customer';

export type FinanceNotificationType =
  | 'payment_received'
  | 'payment_verification_required'
  | 'payment_verified'
  | 'payment_declined'
  | 'payment_refunded'
  | 'payout_requested'
  | 'payout_approved'
  | 'payout_processing'
  | 'payout_completed'
  | 'payout_rejected'
  | 'payout_failed';

export interface FinanceNotification {
  id: string;
  audience: FinanceNotificationAudience;
  type: FinanceNotificationType;
  title: string;
  subtitle: string;
  timestamp: string;
  entityId: string;
  entityType: 'payment' | 'payout';
  read: boolean;
}

export interface FinancialStats {
  totalCustomerPayments: number;
  totalCustomerPaymentCount: number;
  verifiedAmount: number;
  verifiedCount: number;
  pendingVerificationAmount: number;
  pendingVerificationCount: number;
  declinedAmount: number;
  declinedCount: number;
  refundedAmount: number;
  refundedCount: number;
  shopkeeperPayable: number;
  pendingPayoutCount: number;
  pendingPayoutAmount: number;
  processingPayoutCount: number;
  processingPayoutAmount: number;
  completedPayoutCount: number;
  completedPayoutAmount: number;
  totalCommission: number;
  todaysPaymentsAmount: number;
  todaysPaymentsCount: number;
  todaysPayoutsCompleted: number;
  monthlyVolume: number;
  monthlyCount: number;
}

export interface PaymentVolumePoint {
  date: string;
  amount: number;
  count: number;
}

export interface FinanceStatusShare {
  key: string;
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface PaymentMethodShare {
  method: PaymentMethod;
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface CommissionPoint {
  date: string;
  commission: number;
  netPayout: number;
  count: number;
}

export interface ShopkeeperPayoutPoint {
  shopkeeperId: string;
  shopName: string;
  amount: number;
  count: number;
}

export interface PaymentFilters {
  search?: string;
  status?: PaymentStatus | '';
  verificationStatus?: PaymentVerificationStatus | '';
  shopkeeperId?: string;
  userId?: string;
  method?: PaymentMethod | '';
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  sortBy?: 'paymentDate' | 'grossAmount' | 'paymentStatus' | 'createdAt';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PayoutFilters {
  search?: string;
  status?: PayoutStatus | '';
  shopkeeperId?: string;
  method?: PayoutMethod | '';
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  sortBy?: 'createdAt' | 'requestedAmount' | 'status';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface AuditLogFilters {
  search?: string;
  action?: AuditAction | '';
  paymentId?: string;
  payoutRequestId?: string;
  shopkeeperId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}
