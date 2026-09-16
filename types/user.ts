export type UserStatus = 'active' | 'inactive' | 'blocked';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  avatarUrl?: string;
  status: UserStatus;
  createdAt: string; // ISO date string
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  totalSpent: number; // in rupees
}
