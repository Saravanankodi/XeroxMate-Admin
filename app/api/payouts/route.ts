import type { PayoutRequest } from "@/types/payment";
import { parsePayoutFilters } from "@/lib/server/finance/helpers";
import { createPayout, listPayouts } from "@/lib/server/finance/payouts";
import {
  json,
  paginate,
  query,
  readJson,
  withAdmin,
} from "@/lib/server/http";

export const GET = withAdmin(async ({ searchParams }) => {
  const filters = parsePayoutFilters(searchParams);
  const rows = await listPayouts(filters);

  if (query.str(searchParams, "all") === "1") {
    return json({
      data: rows,
      total: rows.length,
      page: 1,
      pageSize: rows.length,
      totalPages: 1,
    });
  }

  return json(paginate(rows, filters.page ?? 1, filters.pageSize ?? 10));
});

export const POST = withAdmin(async ({ admin, request }) => {
  const body = await readJson<{
    shopkeeperId?: string;
    requestedAmount?: number;
    payoutMethod?: PayoutRequest["payoutMethod"];
    accountDetails?: string;
  }>(request);

  const payout = await createPayout(
    {
      shopkeeperId: String(body.shopkeeperId ?? ""),
      requestedAmount: Number(body.requestedAmount),
      payoutMethod: body.payoutMethod ?? "bank_transfer",
      accountDetails: String(body.accountDetails ?? ""),
    },
    admin
  );

  return json(payout);
});
