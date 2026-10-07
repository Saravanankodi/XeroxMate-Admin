import "server-only";

import type {
  GrowthDataPoint,
  OrderStatusDistribution,
  RevenueDataPoint,
  TimeRange,
  TopShopkeeper,
} from "@/types/analytics";
import { getOrderStatusConfig } from "@/lib/utils";
import { listAllOrders } from "@/lib/server/orders";
import { listShopkeepers } from "@/lib/server/shopkeepers";
import {
  loadShopRows,
  loadUserRows,
} from "@/lib/server/snapshots";
import { dateKey, rangeDayKeys } from "@/lib/server/time";

const STATUS_ORDER = [
  "new",
  "accepted",
  "printing",
  "finishing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function getRevenueData(
  range: TimeRange
): Promise<RevenueDataPoint[]> {
  const orders = await listAllOrders();
  const keys = rangeDayKeys(range);

  const byDay = new Map<
    string,
    { revenue: number; orders: number }
  >(
    keys.map((key) => [key, { revenue: 0, orders: 0 }])
  );

  for (const order of orders) {
    if (order.status === "cancelled") {
      continue;
    }

    const bucket = byDay.get(dateKey(order.createdAt));

    if (!bucket) {
      continue;
    }

    bucket.revenue += order.totalAmount;
    bucket.orders += 1;
  }

  return keys.map((key) => {
    const bucket = byDay.get(key) ?? {
      revenue: 0,
      orders: 0,
    };

    return {
      date: key,
      revenue: Math.round(bucket.revenue),
      orders: bucket.orders,
      averageOrderValue:
        bucket.orders > 0
          ? Math.round(bucket.revenue / bucket.orders)
          : 0,
    };
  });
}

export async function getGrowthData(
  range: TimeRange
): Promise<GrowthDataPoint[]> {
  const [users, shops] = await Promise.all([
    loadUserRows(),
    loadShopRows(),
  ]);

  const keys = rangeDayKeys(range);

  return keys.map((key) => ({
    date: key,
    users: users.filter(
      (user) => dateKey(user.createdAt) <= key
    ).length,
    shopkeepers: shops.filter(
      (shop) => dateKey(shop.createdAt) <= key
    ).length,
  }));
}

export async function getOrderStatusDistribution(): Promise<
  OrderStatusDistribution[]
> {
  const orders = await listAllOrders();
  const total = orders.length;

  return STATUS_ORDER.map((status) => {
    const count = orders.filter(
      (order) => order.status === status
    ).length;

    return {
      status: getOrderStatusConfig(status).label,
      count,
      percentage:
        total > 0 ? round1((count / total) * 100) : 0,
    };
  });
}

export async function getTopShopkeepers(): Promise<
  TopShopkeeper[]
> {
  const { data } = await listShopkeepers({
    sortBy: "revenue",
    sortDir: "desc",
    pageSize: 1000,
  });

  return data
    .sort((a, b) => b.revenue - a.revenue)
    .map((shop, index) => ({
      rank: index + 1,
      shopkeeperId: shop.id,
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      location: shop.location,
      totalOrders: shop.totalOrders,
      completedOrders: shop.completedOrders,
      cancelledOrders: shop.cancelledOrders,
      revenue: shop.revenue,
      completionRate:
        shop.totalOrders > 0
          ? round1(
              (shop.completedOrders / shop.totalOrders) * 100
            )
          : 0,
    }));
}
