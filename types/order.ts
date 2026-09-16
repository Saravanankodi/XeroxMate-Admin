export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'printing'
  | 'finishing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'paid' | 'partially_paid' | 'unpaid' | 'refunded';

export type DeliveryType = 'pickup' | 'delivery';

export interface PrintSpecification {
  paper: string;
  printType: string;
  sides: string;
  orientation: string;
  copies: number;
  pages: string;
  pageLayout: string;
  binding: string;
  extras: string[];
}

export interface OrderDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  pages: number;
  printSpecification: PrintSpecification;
  subtotal: number;
}

export interface OrderTimestamps {
  new?: string;
  accepted?: string;
  printing?: string;
  finishing?: string;
  ready_for_pickup?: string;
  out_for_delivery?: string;
  delivered?: string;
  cancelled?: string;
}

export interface DeliveryInfo {
  type: DeliveryType;
  address?: string;
  estimatedTime?: string;
  shopName?: string;
  shopAddress?: string;
  shopTiming?: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  userAddress: string;
  shopkeeperId: string;
  shopkeeperName: string;
  shopkeeperOwner: string;
  shopkeeperPhone: string;
  shopkeeperLocation: string;
  documents: OrderDocument[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryInfo: DeliveryInfo;
  printingSubtotal: number;
  deliveryFee: number;
  additionalCharges: number;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  timestamps: OrderTimestamps;
  createdAt: string;
  updatedAt: string;
}
