export interface DashboardStats {
  totalUsers: number;
  totalShopkeepers: number;
  newUsersToday: number;
  newShopkeepersThisWeek: number;
  totalOrders: number;
  todaysOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  userGrowthPercent: number;
  shopkeeperGrowthPercent: number;
  orderGrowthPercent: number;
}

export interface GrowthDataPoint {
  date: string;
  users: number;
  shopkeepers: number;
}

export interface OrderVolumeDataPoint {
  date: string;
  new: number;
  accepted: number;
  printing: number;
  finishing: number;
  ready_for_pickup: number;
  out_for_delivery: number;
  delivered: number;
  cancelled: number;
  total: number;
}

export interface OrderStatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface TopShopkeeper {
  rank: number;
  shopkeeperId: string;
  shopName: string;
  ownerName: string;
  location: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  revenue: number;
  completionRate: number;
}

export interface ActivityItem {
  id: string;
  type: 'user_registered' | 'shopkeeper_registered' | 'order_placed' | 'order_accepted' | 'order_delivered' | 'order_cancelled' | 'payment_received' | 'shopkeeper_suspended';
  title: string;
  subtitle: string;
  timestamp: string;
  entityId: string;
  entityType: 'user' | 'shopkeeper' | 'order';
}

export interface PlatformHealth {
  activeUsers: number;
  activeShopkeepers: number;
  ordersProcessing: number;
  ordersCompletedToday: number;
  pendingOrders: number;
  cancelledToday: number;
}

export type TimeRange = '7d' | '30d' | '3m' | '6m' | '1y';
