/**
 * Finance module configuration.
 *
 * The current admin identity is treated as the authenticated server-side
 * session. Client code never supplies the acting admin for financial
 * mutations — every privileged action is stamped with this identity.
 */

export interface AdminIdentity {
  id: string;
  name: string;
  email: string;
}

export const CURRENT_ADMIN: AdminIdentity = {
  id: 'ADM-001',
  name: 'Admin User',
  email: 'admin@xeroxmate.in',
};

/** Default internal platform commission (percent). Admin configurable via Settings. */
export const DEFAULT_COMMISSION_RATE = 10;

export const COMMISSION_RATE_BOUNDS = { min: 0, max: 50 };

/** Simulated network latency so the finance UI matches the rest of the console. */
export function financeDelay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
