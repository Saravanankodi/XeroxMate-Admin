'use client';

import { emitFinance } from './store';

/**
 * Singleton SSE connection to `/api/stream`.
 *
 * The server listens to Firestore and pushes a `change` event per finance
 * collection; we translate that into a `subscribeFinance` emission so open
 * screens refetch. The connection stays alive across client-side navigations
 * and drops after errors so the next screen mount reconnects.
 */
let source: EventSource | null = null;

export function ensureFinanceStream(): void {
  if (typeof window === 'undefined' || source) {
    return;
  }

  const eventSource = new EventSource('/api/stream');
  source = eventSource;

  eventSource.addEventListener('change', () => {
    emitFinance();
  });

  eventSource.onerror = () => {
    if (eventSource.readyState === EventSource.CLOSED) {
      if (source === eventSource) {
        source = null;
      }

      eventSource.close();
    }

    // Otherwise the browser is retrying automatically — keep it.
  };
}
