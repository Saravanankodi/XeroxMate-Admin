/**
 * Central error type for the finance domain.
 * Messages are user-facing and never expose raw storage/database details.
 */
export type FinanceErrorCode =
  | 'PAYMENT_NOT_FOUND'
  | 'PAYMENT_ALREADY_VERIFIED'
  | 'PAYMENT_ALREADY_DECLINED'
  | 'PAYMENT_ALREADY_PROCESSED'
  | 'PAYMENT_LOCKED_BY_PAYOUT'
  | 'PAYMENT_REFUNDED'
  | 'PAYOUT_NOT_FOUND'
  | 'PAYOUT_INVALID_STATE'
  | 'PAYOUT_IN_PROGRESS'
  | 'DUPLICATE_REQUEST'
  | 'INSUFFICIENT_BALANCE'
  | 'BELOW_MINIMUM'
  | 'INVALID_AMOUNT'
  | 'SHOPKEEPER_NOT_FOUND'
  | 'COMMISSION_RATE_INVALID'
  | 'NETWORK_FAILURE'
  | 'UNAUTHORIZED';

const DEFAULT_MESSAGES: Record<FinanceErrorCode, string> = {
  PAYMENT_NOT_FOUND: 'Payment record not found. It may have been merged or removed.',
  PAYMENT_ALREADY_VERIFIED: 'This payment has already been verified.',
  PAYMENT_ALREADY_DECLINED: 'This payment has already been declined.',
  PAYMENT_ALREADY_PROCESSED: 'This payment has already been processed and can no longer be changed.',
  PAYMENT_LOCKED_BY_PAYOUT: 'This payment is locked by an active payout request and cannot be changed.',
  PAYMENT_REFUNDED: 'This payment has already been refunded.',
  PAYOUT_NOT_FOUND: 'Payout request not found.',
  PAYOUT_INVALID_STATE: 'This action is not allowed for the current payout status.',
  PAYOUT_IN_PROGRESS: 'This payout is already in progress. Mark it as failed instead of rejecting it.',
  DUPLICATE_REQUEST: 'A payout request is already open for this shopkeeper.',
  INSUFFICIENT_BALANCE: 'Requested amount exceeds the available eligible balance.',
  BELOW_MINIMUM: 'Requested amount is below the minimum payout threshold.',
  INVALID_AMOUNT: 'The amount provided is invalid.',
  SHOPKEEPER_NOT_FOUND: 'Shopkeeper record not found.',
  COMMISSION_RATE_INVALID: 'Commission rate must be between 0% and 50%.',
  NETWORK_FAILURE: 'Network failure. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this financial action.',
};

export class FinanceError extends Error {
  code: FinanceErrorCode;

  constructor(code: FinanceErrorCode, message?: string) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = 'FinanceError';
    this.code = code;
  }
}

export function toFinanceMessage(err: unknown): string {
  if (err instanceof FinanceError) return err.message;
  return 'Something went wrong while processing this financial action. Please try again.';
}
