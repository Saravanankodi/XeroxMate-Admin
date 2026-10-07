'use client';

import { useEffect, useRef } from 'react';
import { ensureFinanceStream } from './realtime';
import { subscribeFinance } from './store';

/**
 * Keeps a finance-driven screen in sync with the server.
 * Any verified payment, payout transition, ledger change or Firestore
 * realtime event triggers `onChange`.
 */
export function useFinanceSync(onChange: () => void): void {
  const handler = useRef(onChange);

  useEffect(() => {
    handler.current = onChange;
  }, [onChange]);

  useEffect(() => {
    ensureFinanceStream();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeFinance(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => handler.current(), 60);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}
