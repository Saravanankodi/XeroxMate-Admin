/**
 * Service layer — initially uses mock data.
 * Replace each function body with real API/database calls when backend is available.
 */

import { mockUsers } from '@/data/users';
import { mockShopkeepers } from '@/data/shopkeepers';
import { mockOrders } from '@/data/orders';
import {
  growthData365,
  orderVolumeData365,
  revenueData365,
  mockActivityItems,
  mockTopShopkeepers,
  mockOrderStatusDistribution,
} from '@/data/analytics';
import { User } from '@/types/user';
import { Shopkeeper } from '@/types/shopkeeper';
import { Order, OrderStatus, PaymentStatus, DeliveryType } from '@/types/order';
import {
  DashboardStats,
  GrowthDataPoint,
  OrderVolumeDataPoint,
  RevenueDataPoint,
  ActivityItem,
  TopShopkeeper,
  OrderStatusDistribution,
  PlatformHealth,
  TimeRange,
} from '@/types/analytics';

// Simulate async API call delay
function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sliceByTimeRange<T>(data: T[], range: TimeRange): T[] {
  const counts: Record<TimeRange, number> = { '7d': 7, '30d': 30, '3m': 90, '6m': 180, '1y': 365 };
  return data.slice(-counts[range]);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  await delay();
  const today = new Date('2026-09-12').toDateString();
  const weekAgo = new Date('2026-09-05');

  const todayOrders = mockOrders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const activeOrders = mockOrders.filter((o) =>
    ['new', 'accepted', 'printing', 'finishing', 'ready_for_pickup', 'out_for_delivery'].includes(o.status)
  );
  const completedOrders = mockOrders.filter((o) => o.status === 'delivered');
  const newShopkeepersThisWeek = mockShopkeepers.filter((s) => new Date(s.createdAt) >= weekAgo);
  const newUsersToday = mockUsers.filter((u) => new Date(u.createdAt).toDateString() === today);

  return {
    totalUsers: 12540,
    totalShopkeepers: 248,
    newUsersToday: newUsersToday.length || 4,
    newShopkeepersThisWeek: newShopkeepersThisWeek.length || 3,
    totalOrders: 18920,
    todaysOrders: todayOrders.length || 286,
    activeOrders: activeOrders.length,
    completedOrders: 18420,
    cancelledOrders: 348,
    totalRevenue: 4892600,
    userGrowthPercent: 12.5,
    shopkeeperGrowthPercent: 8.4,
    orderGrowthPercent: 15.2,
  };
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  await delay(200);
  return [...mockActivityItems].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function getPlatformHealth(): Promise<PlatformHealth> {
  await delay(200);
  return {
    activeUsers: 1240,
    activeShopkeepers: 198,
    ordersProcessing: 124,
    ordersCompletedToday: 212,
    pendingOrders: 42,
    cancelledToday: 8,
  };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getGrowthData(range: TimeRange): Promise<GrowthDataPoint[]> {
  await delay(400);
  return sliceByTimeRange(growthData365, range);
}

export async function getOrderVolumeData(range: TimeRange): Promise<OrderVolumeDataPoint[]> {
  await delay(400);
  return sliceByTimeRange(orderVolumeData365, range);
}

export async function getRevenueData(range: TimeRange): Promise<RevenueDataPoint[]> {
  await delay(400);
  return sliceByTimeRange(revenueData365, range);
}

export async function getOrderStatusDistribution(): Promise<OrderStatusDistribution[]> {
  await delay(200);
  return mockOrderStatusDistribution;
}

export async function getTopShopkeepers(): Promise<TopShopkeeper[]> {
  await delay(300);
  return mockTopShopkeepers;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserFilters {
  search?: string;
  status?: string;
  sortBy?: keyof User;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getUsers(filters: UserFilters = {}): Promise<PaginatedResult<User>> {
  await delay(300);
  const { search = '', status = '', sortBy = 'createdAt', sortDir = 'desc', page = 1, pageSize = 10 } = filters;

  let result = [...mockUsers];

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  }
  if (status) result = result.filter((u) => u.status === status);

  result.sort((a, b) => {
    const av = a[sortBy as keyof User] ?? '';
    const bv = b[sortBy as keyof User] ?? '';
    const cmp = String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const total = result.length;
  const totalPages = Math.ceil(total / pageSize);
  const data = result.slice((page - 1) * pageSize, page * pageSize);

  return { data, total, page, pageSize, totalPages };
}

export async function getUserById(id: string): Promise<User | null> {
  await delay(200);
  return mockUsers.find((u) => u.id === id) ?? null;
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  await delay(200);
  return mockOrders.filter((o) => o.userId === userId);
}

// ─── Shopkeepers ──────────────────────────────────────────────────────────────

export interface ShopkeeperFilters {
  search?: string;
  status?: string;
  sortBy?: keyof Shopkeeper;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function getShopkeepers(filters: ShopkeeperFilters = {}): Promise<PaginatedResult<Shopkeeper>> {
  await delay(300);
  const { search = '', status = '', sortBy = 'createdAt', sortDir = 'desc', page = 1, pageSize = 10 } = filters;

  let result = [...mockShopkeepers];

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (s) =>
        s.shopName.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q)
    );
  }
  if (status) result = result.filter((s) => s.status === status);

  result.sort((a, b) => {
    const av = a[sortBy as keyof Shopkeeper] ?? '';
    const bv = b[sortBy as keyof Shopkeeper] ?? '';
    const cmp = String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const total = result.length;
  const totalPages = Math.ceil(total / pageSize);
  const data = result.slice((page - 1) * pageSize, page * pageSize);

  return { data, total, page, pageSize, totalPages };
}

export async function getShopkeeperById(id: string): Promise<Shopkeeper | null> {
  await delay(200);
  return mockShopkeepers.find((s) => s.id === id) ?? null;
}

export async function getShopkeeperOrders(shopkeeperId: string): Promise<Order[]> {
  await delay(200);
  return mockOrders.filter((o) => o.shopkeeperId === shopkeeperId);
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface OrderFilters {
  search?: string;
  status?: OrderStatus | '';
  paymentStatus?: PaymentStatus | '';
  deliveryType?: DeliveryType | '';
  shopkeeperId?: string;
  userId?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function getOrders(filters: OrderFilters = {}): Promise<PaginatedResult<Order>> {
  await delay(300);
  const {
    search = '', status = '', paymentStatus = '', deliveryType = '',
    shopkeeperId = '', userId = '',
    sortBy = 'createdAt', sortDir = 'desc',
    page = 1, pageSize = 10,
  } = filters;

  let result = [...mockOrders];

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.userName.toLowerCase().includes(q) ||
        o.shopkeeperName.toLowerCase().includes(q) ||
        o.userPhone.includes(q) ||
        o.userEmail.toLowerCase().includes(q)
    );
  }
  if (status) result = result.filter((o) => o.status === status);
  if (paymentStatus) result = result.filter((o) => o.paymentStatus === paymentStatus);
  if (deliveryType) result = result.filter((o) => o.deliveryInfo.type === deliveryType);
  if (shopkeeperId) result = result.filter((o) => o.shopkeeperId === shopkeeperId);
  if (userId) result = result.filter((o) => o.userId === userId);

  result.sort((a, b) => {
    let av: string | number = '';
    let bv: string | number = '';
    if (sortBy === 'totalAmount') { av = a.totalAmount; bv = b.totalAmount; }
    else if (sortBy === 'createdAt') { av = a.createdAt; bv = b.createdAt; }
    else { av = String((a as Record<string, unknown>)[sortBy] ?? ''); bv = String((b as Record<string, unknown>)[sortBy] ?? ''); }
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const total = result.length;
  const totalPages = Math.ceil(total / pageSize);
  const data = result.slice((page - 1) * pageSize, page * pageSize);

  return { data, total, page, pageSize, totalPages };
}

export async function getOrderById(id: string): Promise<Order | null> {
  await delay(200);
  return mockOrders.find((o) => o.id === id) ?? null;
}

// ─── Global Search ────────────────────────────────────────────────────────────

export interface GlobalSearchResults {
  users: User[];
  shopkeepers: Shopkeeper[];
  orders: Order[];
}

export async function globalSearch(query: string): Promise<GlobalSearchResults> {
  await delay(200);
  if (!query || query.length < 2) return { users: [], shopkeepers: [], orders: [] };

  const q = query.toLowerCase();

  const users = mockUsers
    .filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q) || u.id.toLowerCase().includes(q))
    .slice(0, 5);

  const shopkeepers = mockShopkeepers
    .filter((s) => s.shopName.toLowerCase().includes(q) || s.ownerName.toLowerCase().includes(q) || s.phone.includes(q) || s.email.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.location.toLowerCase().includes(q))
    .slice(0, 5);

  const orders = mockOrders
    .filter((o) => o.id.toLowerCase().includes(q) || o.userName.toLowerCase().includes(q) || o.shopkeeperName.toLowerCase().includes(q) || o.userPhone.includes(q))
    .slice(0, 5);

  return { users, shopkeepers, orders };
}
