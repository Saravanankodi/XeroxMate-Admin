import type { FinanceNotificationAudience } from "@/types/payment";
import { FinanceError } from "@/lib/finance/errors";
import {
  listNotifications,
  markAllRead,
} from "@/lib/server/finance/notifications";
import { json, query, withAdmin } from "@/lib/server/http";

const AUDIENCES: FinanceNotificationAudience[] = [
  "admin",
  "shopkeeper",
  "customer",
];

function parseAudience(searchParams: URLSearchParams): FinanceNotificationAudience {
  const raw = query.str(searchParams, "audience", "admin");

  if (!AUDIENCES.includes(raw as FinanceNotificationAudience)) {
    throw new FinanceError(
      "INVALID_AMOUNT",
      "Invalid notification audience."
    );
  }

  return raw as FinanceNotificationAudience;
}

export const GET = withAdmin(async ({ searchParams }) =>
  json(await listNotifications(parseAudience(searchParams)))
);

export const PATCH = withAdmin(async ({ searchParams }) => {
  await markAllRead(parseAudience(searchParams));

  return json({ success: true });
});
