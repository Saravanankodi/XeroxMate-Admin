import { FinanceError } from "@/lib/finance/errors";
import { reconcilePayments } from "@/lib/server/finance/payments";
import {
  paymentMethodDistribution,
  shopkeeperPayoutTop,
  statusDistribution,
} from "@/lib/server/finance/stats";
import { json, query, withAdmin } from "@/lib/server/http";

export const GET = withAdmin(async ({ admin, searchParams }) => {
  const kind = query.str(searchParams, "kind", "paymentStatus");
  const limit = query.int(searchParams, "limit", 6);

  switch (kind) {
    case "paymentStatus":
      await reconcilePayments(admin);
      return json(await statusDistribution("payment"));

    case "payoutStatus":
      return json(await statusDistribution("payout"));

    case "paymentMethod":
      await reconcilePayments(admin);
      return json(await paymentMethodDistribution());

    case "topPayouts":
      return json(await shopkeeperPayoutTop(limit));

    default:
      throw new FinanceError("INVALID_AMOUNT", "Invalid distribution kind.");
  }
});
