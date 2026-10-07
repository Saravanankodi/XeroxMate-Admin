import "server-only";

import type {
  PaginatedResult,
  ShopkeeperFilters,
} from "@/lib/api/types";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { paginate } from "@/lib/server/http";
import {
  getOrdersWhere,
  listAllOrders,
} from "@/lib/server/orders";
import { toISO } from "@/lib/server/serialize";
import type { Order } from "@/types/order";
import type {
  Shopkeeper,
  ShopkeeperStatus,
  VerificationStatus,
} from "@/types/shopkeeper";

const SHOPS_COLLECTION = "shops";

interface ShopMetrics {
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  revenue: number;
  averageOrderValue: number;
}

function emptyMetrics(): ShopMetrics {
  return {
    totalOrders: 0,
    completedOrders: 0,
    activeOrders: 0,
    cancelledOrders: 0,
    revenue: 0,
    averageOrderValue: 0,
  };
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function deriveStatus(
  value: unknown
): ShopkeeperStatus {
  const status = str(value);

  switch (status) {
    case "active":
    case "pending":
    case "suspended":
    case "inactive":
      return status;
  }

  return "pending";
}

function deriveVerification(
  data: Record<string, unknown>
): VerificationStatus {
  const explicit = str(data.verificationStatus);

  if (
    explicit === "verified" ||
    explicit === "unverified" ||
    explicit === "pending"
  ) {
    return explicit;
  }

  if (
    str(data.cashfreeOnboardingStatus) ===
      "activated" ||
    data.upiVerified === true
  ) {
    return "verified";
  }

  return "unverified";
}

/**
 * Shop documents carry a single `hours` string such as
 * "Sunday · 09:00-23:00" instead of a working-days array.
 */
function mapWorkingDays(
  hours: string,
  fallbackDay: string
): string[] {
  if (hours) {
    const [days] = hours.split("·");

    return days
      .split(",")
      .map((day) => day.trim())
      .filter(Boolean);
  }

  return fallbackDay ? [fallbackDay] : [];
}

function computeMetrics(
  orders: Order[]
): ShopMetrics {
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

    metrics.revenue += order.totalAmount;
  }

  metrics.averageOrderValue =
    metrics.totalOrders > 0
      ? Math.round(
          metrics.revenue / metrics.totalOrders
        )
      : 0;

  return metrics;
}

function mapShop(
  documentId: string,
  data: Record<string, unknown>,
  metrics: ShopMetrics
): Shopkeeper {
  const line1 = str(data.addressLine1);
  const line2 = str(data.addressLine2);

  const address =
    [line1, line2].filter(Boolean).join(", ") ||
    str(data.address);

  const location = [
    str(data.city),
    str(data.state),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: str(data.id) || documentId,

    shopName: str(data.name),
    ownerName: str(data.ownerName),
    email: str(data.email),
    phone: str(data.phone) || str(data.ownerPhone),

    location,
    address,

    status: deriveStatus(data.accountStatus),
    verificationStatus: deriveVerification(data),

    logoUrl: str(data.frontImage) || undefined,

    openingTime: str(data.openingTime),
    closingTime: str(data.closingTime),
    workingDays: mapWorkingDays(
      str(data.hours),
      str(data.workingDaysTo)
    ),

    createdAt: toISO(data.createdAt),

    ...metrics,

    rating: Number(data.rating ?? 0) || 0,
  };
}

function compare(
  a: Shopkeeper,
  b: Shopkeeper,
  sortBy: string,
  sortDir: "asc" | "desc"
): number {
  const direction = sortDir === "asc" ? 1 : -1;

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
}

export async function listShopkeepers(
  filters: ShopkeeperFilters
): Promise<PaginatedResult<Shopkeeper>> {
  const [snapshot, allOrders] = await Promise.all([
    getAdminFirestore()
      .collection(SHOPS_COLLECTION)
      .get(),
    listAllOrders(),
  ]);

  const ordersByShop = new Map<string, Order[]>();

  for (const order of allOrders) {
    if (!order.shopkeeperId) {
      continue;
    }

    const bucket = ordersByShop.get(
      order.shopkeeperId
    );

    if (bucket) {
      bucket.push(order);
    } else {
      ordersByShop.set(order.shopkeeperId, [
        order,
      ]);
    }
  }

  let items = snapshot.docs.map((document) =>
    mapShop(
      document.id,
      document.data(),
      computeMetrics(
        ordersByShop.get(document.id) ?? []
      )
    )
  );

  if (filters.status) {
    items = items.filter(
      (shop) => shop.status === filters.status
    );
  }

  const search = filters.search
    ?.trim()
    .toLowerCase();

  if (search) {
    items = items.filter((shop) =>
      [
        shop.id,
        shop.shopName,
        shop.ownerName,
        shop.email,
        shop.phone,
        shop.location,
        shop.address,
      ].some((value) =>
        value.toLowerCase().includes(search)
      )
    );
  }

  const sortBy = String(
    filters.sortBy ?? "createdAt"
  );

  const sortDir =
    filters.sortDir === "asc" ? "asc" : "desc";

  items = items.sort((a, b) =>
    compare(a, b, sortBy, sortDir)
  );

  return paginate(
    items,
    filters.page ?? 1,
    filters.pageSize ?? 10
  );
}

export async function getShopkeeperOrders(
  shopId: string
): Promise<Order[]> {
  return getOrdersWhere("shopId", shopId);
}

export async function updateShopkeeper(
  shopId: string,
  patch: {
    status?: ShopkeeperStatus;
    verificationStatus?: VerificationStatus;
  }
): Promise<boolean> {
  const ref = getAdminFirestore()
    .collection(SHOPS_COLLECTION)
    .doc(shopId);

  const document = await ref.get();

  if (!document.exists) {
    return false;
  }

  const update: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (patch.status) {
    update.accountStatus = patch.status;
  }

  if (patch.verificationStatus) {
    update.verificationStatus =
      patch.verificationStatus;
  }

  await ref.update(update);

  return true;
}
