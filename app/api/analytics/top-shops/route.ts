import { json, withAdmin } from "@/lib/server/http";
import { getTopShopkeepers } from "@/lib/server/analytics";

export const GET = withAdmin(async () =>
  json(await getTopShopkeepers())
);
