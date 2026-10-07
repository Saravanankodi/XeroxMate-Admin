import { json, withAdmin } from "@/lib/server/http";
import { getShopkeeperOrders } from "@/lib/server/shopkeepers";

export const GET = withAdmin(async ({ params }) =>
  json(await getShopkeeperOrders(params.id))
);
