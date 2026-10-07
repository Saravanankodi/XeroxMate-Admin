import { json, query, withAdmin } from "@/lib/server/http";
import { getGrowthData } from "@/lib/server/analytics";
import type { TimeRange } from "@/types/analytics";

export const GET = withAdmin(async ({ searchParams }) =>
  json(
    await getGrowthData(
      query.str(searchParams, "range", "30d") as TimeRange
    )
  )
);
