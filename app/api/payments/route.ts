import { parsePaymentFilters } from "@/lib/server/finance/helpers";
import {
  listPayments,
  reconcilePayments,
} from "@/lib/server/finance/payments";
import { json, paginate, withAdmin } from "@/lib/server/http";

export const GET = withAdmin(async ({ admin, searchParams }) => {
  await reconcilePayments(admin);

  const filters = parsePaymentFilters(searchParams);
  const rows = await listPayments(filters);

  return json(paginate(rows, filters.page ?? 1, filters.pageSize ?? 10));
});
