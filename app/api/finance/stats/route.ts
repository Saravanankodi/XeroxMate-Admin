import { reconcilePayments } from "@/lib/server/finance/payments";
import { computeStats } from "@/lib/server/finance/stats";
import { json, withAdmin } from "@/lib/server/http";

export const GET = withAdmin(async ({ admin }) => {
  await reconcilePayments(admin);

  return json(await computeStats());
});
