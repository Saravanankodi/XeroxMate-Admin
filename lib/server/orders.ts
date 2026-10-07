import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type {
  OrderFilters,
  PaginatedResult,
} from "@/lib/api/types";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { paginate } from "@/lib/server/http";
import { toISO } from "@/lib/server/serialize";
import { mapFirebaseOrder } from "@/lib/firebase/orderMapper";
import type { Order, OrderStatus } from "@/types/order";

const ORDERS_COLLECTION = "orders";

/**
 * Firestore stores statuses in upper snake case (READY_PICKUP) or
 * COMPLETED for the terminal state; the UI works with lowercase keys.
 */
const STATUS_TO_DOCUMENT: Record<
  OrderStatus,
  string
> = {
  new: "NEW",
  accepted: "ACCEPTED",
  printing: "PRINTING",
  finishing: "FINISHING",
  ready_for_pickup: "READY_PICKUP",
  out_for_delivery: "OUT_FOR_DELIVERY",
  delivered: "COMPLETED",
  cancelled: "CANCELLED",
};

export function mapOrder(
  data: Record<string, unknown>,
  documentId: string
): Order {
  const order = mapFirebaseOrder(data, documentId);

  return {
    ...order,
    createdAt: toISO(order.createdAt),
    updatedAt: toISO(order.updatedAt),
  };
}

export async function listAllOrders(): Promise<
  Order[]
> {
  const snapshot = await getAdminFirestore()
    .collection(ORDERS_COLLECTION)
    .get();

  return snapshot.docs.map((document) =>
    mapOrder(document.data(), document.id)
  );
}

export async function getOrdersWhere(
  field: string,
  value: string
): Promise<Order[]> {
  const snapshot = await getAdminFirestore()
    .collection(ORDERS_COLLECTION)
    .where(field, "==", value)
    .get();

  return snapshot.docs
    .map((document) =>
      mapOrder(document.data(), document.id)
    )
    .sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
}

function matchesSearch(
  order: Order,
  search: string
): boolean {
  return [
    order.id,
    order.shopkeeperId,
    order.shopkeeperName,
    order.userName,
    order.userPhone,
  ].some((value) =>
    value.toLowerCase().includes(search)
  );
}

export async function listOrders(
  filters: OrderFilters
): Promise<PaginatedResult<Order>> {
  let items = await listAllOrders();

  if (filters.status) {
    items = items.filter(
      (order) => order.status === filters.status
    );
  }

  if (filters.paymentStatus) {
    items = items.filter(
      (order) =>
        order.paymentStatus ===
        filters.paymentStatus
    );
  }

  if (filters.deliveryType) {
    items = items.filter(
      (order) =>
        order.deliveryInfo.type ===
        filters.deliveryType
    );
  }

  if (filters.shopkeeperId) {
    items = items.filter(
      (order) =>
        order.shopkeeperId ===
        filters.shopkeeperId
    );
  }

  if (filters.userId) {
    items = items.filter(
      (order) => order.userId === filters.userId
    );
  }

  const search = filters.search
    ?.trim()
    .toLowerCase();

  if (search) {
    items = items.filter((order) =>
      matchesSearch(order, search)
    );
  }

  const sortBy = String(
    filters.sortBy ?? "createdAt"
  );

  const sortDir =
    filters.sortDir === "asc" ? "asc" : "desc";

  const direction = sortDir === "asc" ? 1 : -1;

  items = items.sort((a, b) => {
    const left = (
      a as unknown as Record<string, unknown>
    )[sortBy];
    const right = (
      b as unknown as Record<string, unknown>
    )[sortBy];

    if (
      typeof left === "number" &&
      typeof right === "number"
    ) {
      return (left - right) * direction;
    }

    return (
      String(left ?? "").localeCompare(
        String(right ?? "")
      ) * direction
    );
  });

  return paginate(
    items,
    filters.page ?? 1,
    filters.pageSize ?? 10
  );
}

export async function getOrder(
  orderId: string
): Promise<Order | null> {
  const document = await getAdminFirestore()
    .collection(ORDERS_COLLECTION)
    .doc(orderId)
    .get();

  if (!document.exists) {
    return null;
  }

  return mapOrder(
    document.data() as Record<string, unknown>,
    document.id
  );
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<boolean> {
  const ref = getAdminFirestore()
    .collection(ORDERS_COLLECTION)
    .doc(orderId);

  const document = await ref.get();

  if (!document.exists) {
    return false;
  }

  const documentStatus =
    STATUS_TO_DOCUMENT[status];

  await ref.update({
    status: documentStatus,
    timeline: FieldValue.arrayUnion({
      status: documentStatus,
      at: new Date().toISOString(),
    }),
    updatedAt: new Date(),
  });

  return true;
}
