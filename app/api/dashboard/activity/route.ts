import { json, query, withAdmin } from "@/lib/server/http";
import { getRecentActivity } from "@/lib/server/dashboard";

export const GET = withAdmin(async ({ searchParams }) =>
  json(
    await getRecentActivity(
      query.int(searchParams, "limit", 15)
    )
  )
);
