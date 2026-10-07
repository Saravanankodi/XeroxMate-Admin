import type {
  DeliveryType,
  Order,
  OrderStatus,
  PaymentStatus,
} from '@/types/order';
import type { Shopkeeper } from '@/types/shopkeeper';
import type { User } from '@/types/user';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserFilters {
  search?: string;
  status?: string;
  sortBy?: keyof User | string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ShopkeeperFilters {
  search?: string;
  status?: string;
  sortBy?: keyof Shopkeeper | string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

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

export interface GlobalSearchResults {
  users: User[];
  shopkeepers: Shopkeeper[];
  orders: Order[];
}
