/**
 * Finance store — client-side sync primitives only.
 *
 * The authoritative finance state now lives on the server
 * (`lib/server/finance/*`, exposed through `/api/*`); this module keeps the
 * pub/sub channel `useFinanceSync` subscribes to so finance screens refetch
 * after a successful mutation.
 */

/** Mirrors `platform/settings.minWithdrawalAmount` (server is authoritative). */
export const MIN_PAYOUT_AMOUNT = 100;

export const COMMISSION_RATE_MAX = 50;

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeFinance(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Called by the finance service layer after a successful server mutation so
 * every finance-driven screen refetches its data.
 */
export function emitFinance(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      console.error('[finance] listener failed:', error);
    }
  }
}
