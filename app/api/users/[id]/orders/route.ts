import { json, withAdmin } from "@/lib/server/http";
import { getUserOrders } from "@/lib/server/users";

export const GET = withAdmin(async ({ params }) =>
  json(await getUserOrders(params.id))
);
