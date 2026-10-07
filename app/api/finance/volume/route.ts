import type { TimeRange } from "@/types/analytics";
import { paymentVolumeSeries, RANGE_DAYS } from "@/lib/server/finance/stats";
import { json, query, withAdmin } from "@/lib/server/http";

export const GET = withAdmin(async ({ searchParams }) => {
  const range = query.str(searchParams, "range", "7d") as TimeRange;
  const days = RANGE_DAYS[range] ?? RANGE_DAYS["7d"];

  return json(await paymentVolumeSeries(days));
});
