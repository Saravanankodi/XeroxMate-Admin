export type ShopkeeperStatus = 'active' | 'pending' | 'suspended' | 'inactive';
export type VerificationStatus = 'verified' | 'unverified' | 'pending';

export interface Shopkeeper {
  id: string;
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  location: string;
  address: string;
  status: ShopkeeperStatus;
  verificationStatus: VerificationStatus;
  logoUrl?: string;
  openingTime: string;
  closingTime: string;
  workingDays: string[];
  createdAt: string; // ISO date string
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  revenue: number; // in rupees
  averageOrderValue: number;
  rating?: number;
}
