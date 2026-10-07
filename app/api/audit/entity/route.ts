import { entityLogs } from "@/lib/server/finance/audit";
import { json, query, withAdmin } from "@/lib/server/http";

export const GET = withAdmin(async ({ searchParams }) => {
  const paymentId = query.str(searchParams, "paymentId");
  const payoutRequestId = query.str(searchParams, "payoutRequestId");

  const logs = await entityLogs({
    paymentId: paymentId || undefined,
    payoutRequestId: payoutRequestId || undefined,
  });

  return json(logs);
});
