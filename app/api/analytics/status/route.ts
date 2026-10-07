import { json, withAdmin } from "@/lib/server/http";
import { getOrderStatusDistribution } from "@/lib/server/analytics";

export const GET = withAdmin(async () =>
  json(await getOrderStatusDistribution())
);
