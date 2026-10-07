import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  getOrdersWhere,
  listAllOrders,
} from "@/lib/server/orders";
import { toISO } from "@/lib/server/serialize";
import type { Order } from "@/types/order";
import type {
  User,
  UserAddress,
  UserStatus,
} from "@/types/user";

const USERS_COLLECTION = "users";

interface UserMetrics {
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  totalSpent: number;
}

function emptyMetrics(): UserMetrics {
  return {
    totalOrders: 0,
    completedOrders: 0,
    activeOrders: 0,
    cancelledOrders: 0,
    totalSpent: 0,
  };
}

function mapAddress(
  id: string,
  data: Record<string, unknown>
): UserAddress {
  return {
    id: String(data.id ?? id),
    label: String(data.label ?? ""),
    name: String(data.name ?? ""),
    phone: String(data.phone ?? ""),
    house: String(data.house ?? ""),
    street: String(data.street ?? ""),
    area: String(data.area ?? ""),
    city: String(data.city ?? ""),
    pincode: String(data.pincode ?? ""),
  };
}

function toUser(
  documentId: string,
  data: Record<string, unknown>,
  addresses: UserAddress[],
  metrics: UserMetrics
): User {
  const first = addresses[0];

  return {
    id: String(data.id ?? documentId),

    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),

    role: "customer",

    accountStatus: String(
      data.accountStatus ?? "active"
    ) as UserStatus,

    registrationStatus: String(
      data.registrationStatus ?? "incomplete"
    ),

    payoutMethod: String(data.payoutMethod ?? ""),
    upiId: String(data.upiId ?? ""),

    addresses,

    location: first
      ? [first.area, first.city]
          .filter(Boolean)
          .join(", ")
      : "",

    createdAt: toISO(data.createdAt),
    updatedAt: toISO(data.updatedAt),

    ...metrics,
  };
}

/**
 * Customer documents do not store order aggregates, so they are computed on
 * every read from the orders collection.
 */
function computeMetrics(
  orders: Order[]
): UserMetrics {
  const metrics = emptyMetrics();

  for (const order of orders) {
    metrics.totalOrders += 1;

    if (order.status === "cancelled") {
      metrics.cancelledOrders += 1;
      continue;
    }

    if (order.status === "delivered") {
      metrics.completedOrders += 1;
    } else {
      metrics.activeOrders += 1;
    }

    metrics.totalSpent += order.totalAmount;
  }

  return metrics;
}

async function loadAddresses(
  userId: string
): Promise<UserAddress[]> {
  const snapshot = await getAdminFirestore()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection("addresses")
    .get();

  return snapshot.docs.map((document) =>
    mapAddress(document.id, document.data())
  );
}

/**
 * Single-field filter only (role), ordering applied in memory — keeps the
 * query index-free for the small admin dataset.
 */
export async function listUsers(): Promise<User[]> {
  const snapshot = await getAdminFirestore()
    .collection(USERS_COLLECTION)
    .where("role", "==", "customer")
    .get();

  const allOrders = await listAllOrders();

  const ordersByCustomer = new Map<
    string,
    Order[]
  >();

  for (const order of allOrders) {
    if (!order.userId) {
      continue;
    }

    const bucket = ordersByCustomer.get(
      order.userId
    );

    if (bucket) {
      bucket.push(order);
    } else {
      ordersByCustomer.set(order.userId, [order]);
    }
  }

  const users = await Promise.all(
    snapshot.docs.map(async (document) => {
      const addresses = await loadAddresses(
        document.id
      );

      return toUser(
        document.id,
        document.data(),
        addresses,
        computeMetrics(
          ordersByCustomer.get(document.id) ?? []
        )
      );
    })
  );

  return users.sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export async function getUser(
  userId: string
): Promise<User | null> {
  const document = await getAdminFirestore()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .get();

  if (!document.exists) {
    return null;
  }

  const data = document.data() as Record<
    string,
    unknown
  >;

  if (data.role !== "customer") {
    return null;
  }

  const [addresses, orders] = await Promise.all([
    loadAddresses(userId),
    getOrdersWhere("customerId", userId),
  ]);

  return toUser(
    userId,
    data,
    addresses,
    computeMetrics(orders)
  );
}

export async function getUserOrders(
  customerId: string
): Promise<Order[]> {
  return getOrdersWhere("customerId", customerId);
}

export async function updateUserStatus(
  userId: string,
  status: UserStatus
): Promise<boolean> {
  const ref = getAdminFirestore()
    .collection(USERS_COLLECTION)
    .doc(userId);

  const document = await ref.get();

  if (!document.exists) {
    return false;
  }

  await ref.update({
    accountStatus: status,
    updatedAt: new Date(),
  });

  return true;
}
