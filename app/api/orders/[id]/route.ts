import { json, withAdmin } from "@/lib/server/http";
import {
  getOrder,
  updateOrderStatus,
} from "@/lib/server/orders";
import type { OrderStatus } from "@/types/order";

const VALID_STATUSES: OrderStatus[] = [
  "new",
  "accepted",
  "printing",
  "finishing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export const GET = withAdmin(async ({ params }) => {
  const order = await getOrder(params.id);

  if (!order) {
    return json({ error: "Order not found." }, 404);
  }

  return json(order);
});

export const PATCH = withAdmin(
  async ({ params, request }) => {
    const body = await request.json().catch(
      () => ({})
    );

    const status =
      typeof body?.status === "string"
        ? body.status
        : "";

    if (
      !VALID_STATUSES.includes(
        status as OrderStatus
      )
    ) {
      return json(
        { error: "Invalid order status." },
        400
      );
    }

    const updated = await updateOrderStatus(
      params.id,
      status as OrderStatus
    );

    if (!updated) {
      return json(
        { error: "Order not found." },
        404
      );
    }

    return json({ success: true });
  }
);
