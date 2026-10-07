import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import type {
  Payment,
  PayoutRequest,
  ShopkeeperBalance,
} from "@/types/payment";
import {
  getWallet,
  LOCKING_STATUSES,
  mapPayment,
  mapPayout,
  round2,
  toShopInfo,
  toWallet,
  type ShopInfo,
  type WalletLedger,
} from "./helpers";

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
 * Open request = the shop's earliest still-locking payout request
 * (lowest createdAt wins).
 */
function openRequestOf(
  shopkeeperId: string,
  requests: PayoutRequest[]
): string | undefined {
  return [...requests]
    .filter(
      (r) =>
        r.shopkeeperId === shopkeeperId && LOCKING_STATUSES.includes(r.status)
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]?.id;
}

/**
 * Wallet documents are the primary ledger (decision 3); when a wallet is
 * missing the breakdown falls back to the store's payment/payout derivation.
 */
function buildLedger(
  shopkeeperId: string,
  wallet: WalletLedger | null,
  payments: Payment[],
  requests: PayoutRequest[]
): LedgerBreakdown {
  const openRequestId = openRequestOf(shopkeeperId, requests);

  if (wallet) {
    return {
      shopkeeperId,
      verifiedEarnings: round2(wallet.totalEarned),
      lockedAmount: round2(wallet.pendingRequested),
      paidOutAmount: round2(wallet.withdrawn),
      availableBalance: round2(
        wallet.totalEarned - wallet.pendingRequested - wallet.withdrawn
      ),
      verifiedPaymentCount: wallet.ordersCounted,
      openRequestId,
    };
  }

  const verified = payments.filter(
    (p) => p.shopkeeperId === shopkeeperId && p.verificationStatus === "verified"
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
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + r.requestedAmount, 0)
  );

  return {
    shopkeeperId,
    verifiedEarnings,
    lockedAmount,
    paidOutAmount,
    availableBalance: round2(Math.max(0, verifiedEarnings - lockedAmount - paidOutAmount)),
    verifiedPaymentCount: verified.length,
    openRequestId,
  };
}

export async function balanceFor(shopkeeperId: string): Promise<LedgerBreakdown> {
  const db = getAdminFirestore();

  const [wallet, paymentsSnapshot, requestsSnapshot] = await Promise.all([
    getWallet(shopkeeperId),
    db.collection("payments").where("shopkeeperId", "==", shopkeeperId).get(),
    db.collection("payouts").where("shopkeeperId", "==", shopkeeperId).get(),
  ]);

  const payments = paymentsSnapshot.docs.map((document) =>
    mapPayment(document.id, document.data())
  );
  const requests = requestsSnapshot.docs.map((document) =>
    mapPayout(document.id, document.data())
  );

  return buildLedger(shopkeeperId, wallet, payments, requests);
}

export async function allBalances(): Promise<ShopkeeperBalance[]> {
  const db = getAdminFirestore();

  const [walletsSnapshot, shopsSnapshot, paymentsSnapshot, requestsSnapshot] =
    await Promise.all([
      db.collection("wallets").get(),
      db.collection("shops").get(),
      db.collection("payments").get(),
      db.collection("payouts").get(),
    ]);

  const wallets = new Map<string, WalletLedger>();
  walletsSnapshot.docs.forEach((document) =>
    wallets.set(document.id, toWallet(document.data()))
  );

  const shops = new Map<string, ShopInfo>();
  shopsSnapshot.docs.forEach((document) =>
    shops.set(document.id, toShopInfo(document.id, document.data()))
  );

  const payments = paymentsSnapshot.docs.map((document) =>
    mapPayment(document.id, document.data())
  );
  const requests = requestsSnapshot.docs.map((document) =>
    mapPayout(document.id, document.data())
  );

  const ids = new Set<string>();
  wallets.forEach((_, id) => ids.add(id));
  shops.forEach((_, id) => ids.add(id));
  payments.forEach((p) => ids.add(p.shopkeeperId));
  requests.forEach((r) => ids.add(r.shopkeeperId));

  return Array.from(ids)
    .filter(Boolean)
    .map((id) => {
      const shop = shops.get(id);
      const ledger = buildLedger(id, wallets.get(id) ?? null, payments, requests);

      return {
        shopkeeperId: id,
        shopName: shop?.shopName ?? id,
        shopkeeperOwner: shop?.ownerName ?? "",
        shopkeeperPhone: shop?.phone ?? "",
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
