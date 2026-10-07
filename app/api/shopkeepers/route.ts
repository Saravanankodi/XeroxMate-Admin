import {
  json,
  query,
  withAdmin,
} from "@/lib/server/http";
import { listShopkeepers } from "@/lib/server/shopkeepers";

export const GET = withAdmin(async ({ searchParams }) =>
  json(
    await listShopkeepers({
      search: query.str(searchParams, "search"),
      status: query.str(searchParams, "status"),
      sortBy: query.str(
        searchParams,
        "sortBy",
        "createdAt"
      ),
      sortDir:
        query.str(searchParams, "sortDir") ===
        "asc"
          ? "asc"
          : "desc",
      page: query.int(searchParams, "page", 1),
      pageSize: query.int(
        searchParams,
        "pageSize",
        10
      ),
    })
  )
);
