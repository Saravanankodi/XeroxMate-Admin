/**
 * Admin service layer — the single `@/lib/api` entry point.
 *
 * Every admin page imports from this module; the implementations are thin
 * HTTP calls to `/api/*` (see `lib/server/*` for the domain logic behind
 * them). Page code never changes when a domain moves — only this file and
 * its siblings do.
 */

export * from './types';

export {
  ApiError,
  apiFetch,
  apiGet,
  apiSend,
  buildQuery,
} from './client';

export {
  getUser,
  getUserOrders,
  getUsers,
  updateUserStatus,
} from "./users";

export {
  getShopkeeperOrders,
  getShopkeepers,
  updateShopkeeper,
} from "./shopkeepers";

export {
  getOrderById,
  getOrders,
  updateOrderStatus,
} from "./orders";

export {
  getDashboardStats,
  getPlatformHealth,
  getRecentActivity,
} from "./dashboard";

export {
  getGrowthData,
  getOrderStatusDistribution,
  getRevenueData,
  getTopShopkeepers,
} from "./analytics";

export { globalSearch } from "./search";
