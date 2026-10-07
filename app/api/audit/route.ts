import { listAuditLogs } from "@/lib/server/finance/audit";
import { parseAuditFilters } from "@/lib/server/finance/helpers";
import { json, paginate, withAdmin } from "@/lib/server/http";

export const GET = withAdmin(async ({ searchParams }) => {
  const filters = parseAuditFilters(searchParams);
  const rows = await listAuditLogs(filters);

  return json(paginate(rows, filters.page ?? 1, filters.pageSize ?? 12));
});
