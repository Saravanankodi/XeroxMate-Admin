import {
  apiGet,
  apiSend,
  buildQuery,
} from "./client";
import type {
  OrderFilters,
  PaginatedResult,
} from "./types";
import type { Order, OrderStatus } from "@/types/order";

export function getOrders(
  filters: OrderFilters = {}
): Promise<PaginatedResult<Order>> {
  return apiGet<PaginatedResult<Order>>(
    `/api/orders${buildQuery(filters)}`
  );
}

export async function getOrderById(
  orderId: string
): Promise<Order | null> {
  try {
    return await apiGet<Order>(
      `/api/orders/${encodeURIComponent(orderId)}`
    );
  } catch (error) {
    const status = (error as { status?: number })
      .status;

    if (status === 404) {
      return null;
    }

    throw error;
  }
}

export function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  return apiSend<void>(
    "PATCH",
    `/api/orders/${encodeURIComponent(orderId)}`,
    { status }
  );
}
