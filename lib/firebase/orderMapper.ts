import type {
  DeliveryInfo,
  Order,
  OrderDocument,
  OrderStatus,
  OrderTimestamps,
  PaymentStatus,
  PrintSpecification,
} from '@/types/order';

interface FirebaseDocument {
  id?: string;
  name?: string;
  originalName?: string;
  format?: string;
  size?: number;
  pages?: number;
  pageCountDetected?: boolean;
  cloudinary?: {
    format?: string;
    originalName?: string;
    publicId?: string;
    size?: number;
    url?: string;
  };
  printSpecification?: Record<string, unknown>;
}

interface FirebaseTimelineItem {
  status?: string;
  at?: string;
}

interface FirebaseOrder {
  id?: string;

  customerId?: string;
  customerName?: string;
  customerPhone?: string;

  shopId?: string;
  shopName?: string;

  documents?: FirebaseDocument[];

  printConfig?: Record<string, unknown>;
  config?: Record<string, unknown>;
  configLabels?: Record<string, unknown>;

  price?: {
    printing?: number;
    delivery?: number;
    services?: number;
    binding?: number;
    discount?: number;
    total?: number;
    billablePages?: number;
  };

  amountPaid?: number;
  balance?: number;

  paymentStatus?: string;
  fulfillment?: string;

  status?: string;

  timeline?: FirebaseTimelineItem[];

  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function mapStatus(status?: string): OrderStatus {
  switch (status?.toUpperCase()) {
    case 'NEW':
      return 'new';

    case 'ACCEPTED':
      return 'accepted';

    case 'PRINTING':
      return 'printing';

    case 'FINISHING':
      return 'finishing';

    case 'READY_PICKUP':
      return 'ready_for_pickup';

    case 'OUT_FOR_DELIVERY':
      return 'out_for_delivery';

    case 'DELIVERED':
      return 'delivered';

    case 'CANCELLED':
      return 'cancelled';

    case 'COMPLETED':
      return 'delivered';

    default:
      return 'new';
  }
}

function mapPaymentStatus(
  paymentStatus?: string,
  amountPaid = 0,
  total = 0
): PaymentStatus {
  switch (paymentStatus?.toLowerCase()) {
    case 'paid':
      return 'paid';

    case 'refunded':
      return 'refunded';

    case 'partially_paid':
      return 'partially_paid';

    case 'unpaid':
      return 'unpaid';
  }

  if (amountPaid >= total && total > 0) {
    return 'paid';
  }

  if (amountPaid > 0) {
    return 'partially_paid';
  }

  return 'unpaid';
}

function mapPrintSpecification(
  config: Record<string, unknown> = {},
  labels: Record<string, unknown> = {}
): PrintSpecification {
  return {
    paper: String(labels.paper ?? config.paperTypeId ?? 'Unknown'),

    printType: String(
      labels.printType ??
        config.printType ??
        'Unknown'
    ),

    sides: String(
      labels.side ??
        config.side ??
        'Unknown'
    ),

    orientation: String(
      labels.orientation ??
        config.orientation ??
        'Unknown'
    ),

    copies: Number(config.copies ?? 1),

    pages: String(
      config.pageRangeMode === 'all'
        ? 'All Pages'
        : config.pageRange ?? 'All Pages'
    ),

    pageLayout: String(
      config.pageLayout === 1
        ? '1 Page / Sheet'
        : `${config.pageLayout ?? 1} Pages / Sheet`
    ),

    binding: String(
      labels.binding ??
        config.bindingId ??
        'None'
    ),

    extras: Array.isArray(labels.additional)
      ? labels.additional.map(String)
      : [],
  };
}

function mapDocument(
  document: FirebaseDocument,
  config: Record<string, unknown>,
  labels: Record<string, unknown>,
  index: number
): OrderDocument {
  const cloudinary = document.cloudinary ?? {};

  return {
    id: document.id ?? `doc-${index}`,

    fileName:
      document.name ??
      document.originalName ??
      cloudinary.originalName ??
      `Document ${index + 1}`,

    fileType:
      document.format ??
      cloudinary.format ??
      'unknown',

    fileSizeBytes: Number(
      document.size ??
        cloudinary.size ??
        0
    ),

    pages: Number(
      document.pages ??
        0
    ),

    printSpecification: mapPrintSpecification(
      document.printSpecification ?? config,
      labels
    ),

    subtotal: 0,
  };
}

function mapTimeline(
  timeline: FirebaseTimelineItem[] = []
): OrderTimestamps {
  const timestamps: OrderTimestamps = {};

  for (const item of timeline) {
    if (!item.status || !item.at) {
      continue;
    }

    switch (item.status.toUpperCase()) {
      case 'NEW':
        timestamps.new = item.at;
        break;

      case 'ACCEPTED':
        timestamps.accepted = item.at;
        break;

      case 'PRINTING':
        timestamps.printing = item.at;
        break;

      case 'FINISHING':
        timestamps.finishing = item.at;
        break;

      case 'READY_PICKUP':
        timestamps.ready_for_pickup = item.at;
        break;

      case 'OUT_FOR_DELIVERY':
        timestamps.out_for_delivery = item.at;
        break;

      case 'DELIVERED':
      case 'COMPLETED':
        timestamps.delivered = item.at;
        break;

      case 'CANCELLED':
        timestamps.cancelled = item.at;
        break;
    }
  }

  return timestamps;
}

export function mapFirebaseOrder(
  data: FirebaseOrder,
  id: string
): Order {
  const config = data.printConfig ?? data.config ?? {};
  const labels = data.configLabels ?? {};

  const price = data.price ?? {};

  const totalAmount = Number(
    price.total ?? 0
  );

  const amountPaid = Number(
    data.amountPaid ?? 0
  );

  const balanceDue = Number(
    data.balance ?? Math.max(totalAmount - amountPaid, 0)
  );

  const documents = (data.documents ?? []).map(
    (document, index) =>
      mapDocument(
        document,
        config,
        labels,
        index
      )
  );

  const fulfillment =
    data.fulfillment === 'delivery'
      ? 'delivery'
      : 'pickup';

  const deliveryInfo: DeliveryInfo =
    fulfillment === 'delivery'
      ? {
          type: 'delivery',
          address: data.address ?? undefined,
        }
      : {
          type: 'pickup',
          shopName: data.shopName ?? undefined,
        };

  return {
    id: id || data.id || '',

    userId: data.customerId ?? '',
    userName: data.customerName ?? '',
    userPhone: data.customerPhone ?? '',
    userEmail: '',
    userAddress: data.address ?? '',

    shopkeeperId: data.shopId ?? '',
    shopkeeperName: data.shopName ?? '',
    shopkeeperOwner: '',
    shopkeeperPhone: '',
    shopkeeperLocation: '',

    documents,

    status: mapStatus(data.status),

    paymentStatus: mapPaymentStatus(
      data.paymentStatus,
      amountPaid,
      totalAmount
    ),

    deliveryInfo,

    printingSubtotal: Number(
      price.printing ?? 0
    ),

    deliveryFee: Number(
      price.delivery ?? 0
    ),

    additionalCharges:
      Number(price.binding ?? 0) +
      Number(price.services ?? 0),

    discount: Number(
      price.discount ?? 0
    ),

    totalAmount,

    amountPaid,

    balanceDue,

    timestamps: mapTimeline(
      data.timeline
    ),

    createdAt: data.createdAt ?? '',
    updatedAt: data.updatedAt ?? '',
  };
}
