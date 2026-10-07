import { FinanceError } from "@/lib/finance/errors";
import { contributingPayments } from "@/lib/server/finance/payouts";
import { json, readJson, withAdmin } from "@/lib/server/http";

export const POST = withAdmin(async ({ request }) => {
  const body = await readJson<{
    shopkeeperId?: string;
    paymentIds?: string[];
  }>(request);

  const shopkeeperId = typeof body.shopkeeperId === "string" ? body.shopkeeperId : "";
  const paymentIds = Array.isArray(body.paymentIds)
    ? body.paymentIds.filter((id): id is string => typeof id === "string")
    : [];

  if (!shopkeeperId && paymentIds.length === 0) {
    throw new FinanceError(
      "INVALID_AMOUNT",
      "A shopkeeperId or paymentIds list is required."
    );
  }

  const payments = await contributingPayments({ shopkeeperId, paymentIds });

  return json(payments);
});
