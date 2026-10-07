import { FinanceError } from "@/lib/finance/errors";
import { syncOrderPayment } from "@/lib/server/finance/payments";
import { json, readJson, withAdmin } from "@/lib/server/http";
import type { Order } from "@/types/order";

export const POST = withAdmin(async ({ admin, request }) => {
  const body = await readJson<{ order?: Order }>(request);
  const order = body.order;

  if (!order || typeof order.id !== "string" || !order.id) {
    throw new FinanceError("INVALID_AMOUNT", "A valid order is required.");
  }

  const payment = await syncOrderPayment(order, admin);

  return json({ payment });
});
