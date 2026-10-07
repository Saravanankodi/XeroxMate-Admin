import "server-only";

import type {
  ActivityItem,
  DashboardStats,
  PlatformHealth,
} from "@/types/analytics";
import type { Order } from "@/types/order";
import { listAllOrders } from "@/lib/server/orders";
import {
  daysAgoKey,
  dateKey,
  todayKey,
} from "@/lib/server/time";
import {
  loadShopRows,
  loadUserRows,
} from "@/lib/server/snapshots";

const ACTIVE_STATUSES = new Set([
  "new",
  "accepted",
  "printing",
  "finishing",
  "ready_for_pickup",
  "out_for_delivery",
]);

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function growthPercent(
  thisWeek: number,
  lastWeek: number
): number {
  if (lastWeek === 0) {
    return thisWeek > 0 ? 100 : 0;
  }

  return round1(
    ((thisWeek - lastWeek) / lastWeek) * 100
  );
}

function countSince(
  rows: { createdAt: string }[],
  fromKey: string,
  toKey = "9999-12-31"
): number {
  return rows.filter((row) => {
    const key = dateKey(row.createdAt);
    return key >= fromKey && key <= toKey;
  }).length;
}

async function loadDashboardSources() {
  const [users, shops, orders] = await Promise.all([
    loadUserRows(),
    loadShopRows(),
    listAllOrders(),
  ]);

  return { users, shops, orders };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { users, shops, orders } = await loadDashboardSources();

  const today = todayKey();
  const thisWeekFrom = daysAgoKey(6);
  const lastWeekFrom = daysAgoKey(13);
  const lastWeekTo = daysAgoKey(7);

  const todaysOrders = orders.filter(
    (order) => dateKey(order.createdAt) === today
  );
  const activeOrders = orders.filter((order) =>
    ACTIVE_STATUSES.has(order.status)
  );
  const completedOrders = orders.filter(
    (order) => order.status === "delivered"
  );
  const cancelledOrders = orders.filter(
    (order) => order.status === "cancelled"
  );
  const totalRevenue = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + order.totalAmount, 0);

  return {
    totalUsers: users.length,
    totalShopkeepers: shops.length,
    newUsersToday: users.filter(
      (user) => dateKey(user.createdAt) === today
    ).length,
    newShopkeepersThisWeek: countSince(
      shops,
      thisWeekFrom
    ),
    totalOrders: orders.length,
    todaysOrders: todaysOrders.length,
    activeOrders: activeOrders.length,
    completedOrders: completedOrders.length,
    cancelledOrders: cancelledOrders.length,
    totalRevenue,
    userGrowthPercent: growthPercent(
      countSince(users, thisWeekFrom),
      countSince(users, lastWeekFrom, lastWeekTo)
    ),
    shopkeeperGrowthPercent: growthPercent(
      countSince(shops, thisWeekFrom),
      countSince(shops, lastWeekFrom, lastWeekTo)
    ),
    orderGrowthPercent: growthPercent(
      countSince(orders, thisWeekFrom),
      countSince(orders, lastWeekFrom, lastWeekTo)
    ),
  };
}

export async function getPlatformHealth(): Promise<PlatformHealth> {
  const { users, shops, orders } = await loadDashboardSources();

  const today = todayKey();

  return {
    activeUsers: users.filter(
      (user) => user.accountStatus === "active"
    ).length,
    activeShopkeepers: shops.filter(
      (shop) => shop.accountStatus !== "suspended"
    ).length,
    ordersProcessing: orders.filter((order) =>
      ACTIVE_STATUSES.has(order.status)
    ).length,
    ordersCompletedToday: orders.filter(
      (order) =>
        order.status === "delivered" &&
        dateKey(order.timestamps.delivered ?? order.createdAt) === today
    ).length,
    pendingOrders: orders.filter(
      (order) => order.status === "new"
    ).length,
    cancelledToday: orders.filter(
      (order) =>
        order.status === "cancelled" &&
        dateKey(order.timestamps.cancelled ?? order.createdAt) === today
    ).length,
  };
}

function orderEvents(orders: Order[]): ActivityItem[] {
  const events: ActivityItem[] = [];

  const push = (
    type: ActivityItem["type"],
    title: string,
    order: Order,
    timestamp: string
  ) => {
    events.push({
      id: `ord-${type}-${order.id}`,
      type,
      title,
      subtitle: order.id,
      timestamp,
      entityId: order.id,
      entityType: "order",
    });
  };

  for (const order of orders) {
    push(
      "order_placed",
      "New order placed",
      order,
      order.timestamps.new || order.createdAt
    );

    if (order.timestamps.accepted) {
      push(
        "order_accepted",
        "Order accepted",
        order,
        order.timestamps.accepted
      );
    }

    if (order.status === "delivered") {
      push(
        "order_delivered",
        "Order delivered",
        order,
        order.timestamps.delivered || order.createdAt
      );
    }

    if (order.status === "cancelled") {
      push(
        "order_cancelled",
        "Order cancelled",
        order,
        order.timestamps.cancelled || order.createdAt
      );
    }
  }

  return events;
}

export async function getRecentActivity(
  limit = 15
): Promise<ActivityItem[]> {
  const [users, shops, orders] = await Promise.all([
    loadUserRows(),
    loadShopRows(),
    listAllOrders(),
  ]);

  const events: ActivityItem[] = [];

  for (const user of users) {
    events.push({
      id: `usr-${user.id}`,
      type: "user_registered",
      title: "New user registered",
      subtitle: user.name || user.phone || user.id,
      timestamp: user.createdAt,
      entityId: user.id,
      entityType: "user",
    });
  }

  for (const shop of shops) {
    events.push({
      id: `shp-${shop.id}`,
      type: "shopkeeper_registered",
      title: "New shopkeeper registered",
      subtitle: shop.name || shop.id,
      timestamp: shop.createdAt,
      entityId: shop.id,
      entityType: "shopkeeper",
    });

    if (shop.accountStatus === "suspended") {
      events.push({
        id: `shp-susp-${shop.id}`,
        type: "shopkeeper_suspended",
        title: "Shopkeeper suspended",
        subtitle: shop.name || shop.id,
        timestamp: shop.updatedAt || shop.createdAt,
        entityId: shop.id,
        entityType: "shopkeeper",
      });
    }
  }

  events.push(...orderEvents(orders));

  return events
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
    )
    .slice(0, limit);
}
