import type { GlobalSearchResults } from "@/lib/api/types";
import { json, query, withAdmin } from "@/lib/server/http";
import { listOrders } from "@/lib/server/orders";
import { listShopkeepers } from "@/lib/server/shopkeepers";
import { listUsers } from "@/lib/server/users";

const RESULT_SIZE = 5;

/**
 * Cross-domain typeahead behind the command palette (Ctrl/Cmd+K).
 * Each domain applies its own search filter and is capped so one noisy
 * collection cannot crowd out the others.
 */
export const GET = withAdmin(async ({ searchParams }) => {
  const term = query.str(searchParams, "q").trim();

  if (term.length < 2) {
    const empty: GlobalSearchResults = {
      users: [],
      shopkeepers: [],
      orders: [],
    };

    return json(empty);
  }

  const [allUsers, shopkeepers, orders] = await Promise.all([
    listUsers(),
    listShopkeepers({ search: term, pageSize: RESULT_SIZE }),
    listOrders({ search: term, pageSize: RESULT_SIZE }),
  ]);

  const needle = term.toLowerCase();

  const users = allUsers
    .filter((user) =>
      [user.id, user.name, user.email, user.phone].some((field) =>
        field.toLowerCase().includes(needle)
      )
    )
    .slice(0, RESULT_SIZE);

  const results: GlobalSearchResults = {
    users,
    shopkeepers: shopkeepers.data,
    orders: orders.data,
  };

  return json(results);
});
