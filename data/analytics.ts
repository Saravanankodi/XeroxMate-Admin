import { GrowthDataPoint, OrderVolumeDataPoint, RevenueDataPoint, ActivityItem, TopShopkeeper, OrderStatusDistribution } from '@/types/analytics';

// Generate synthetic growth data for past 365 days
function generateGrowthData(days: number): GrowthDataPoint[] {
  const data: GrowthDataPoint[] = [];
  const now = new Date('2026-09-12');
  let cumulativeUsers = 11800;
  let cumulativeShopkeepers = 220;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const newUsers = Math.floor(Math.random() * (isWeekend ? 8 : 18)) + (isWeekend ? 3 : 8);
    const newShops = Math.random() > 0.85 ? 1 : 0;

    cumulativeUsers += newUsers;
    cumulativeShopkeepers += newShops;

    data.push({
      date: date.toISOString().split('T')[0],
      users: cumulativeUsers,
      shopkeepers: cumulativeShopkeepers,
    });
  }
  return data;
}

function generateOrderVolumeData(days: number): OrderVolumeDataPoint[] {
  const data: OrderVolumeDataPoint[] = [];
  const now = new Date('2026-09-12');

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const base = isWeekend ? 180 : 280;

    const delivered = Math.floor(base * 0.70 + Math.random() * 40);
    const cancelled = Math.floor(base * 0.04 + Math.random() * 5);
    const newO = Math.floor(base * 0.05 + Math.random() * 8);
    const accepted = Math.floor(base * 0.04 + Math.random() * 5);
    const printing = Math.floor(base * 0.06 + Math.random() * 8);
    const finishing = Math.floor(base * 0.04 + Math.random() * 5);
    const readyForPickup = Math.floor(base * 0.04 + Math.random() * 5);
    const outForDelivery = Math.floor(base * 0.03 + Math.random() * 4);

    data.push({
      date: date.toISOString().split('T')[0],
      new: newO, accepted, printing, finishing,
      ready_for_pickup: readyForPickup,
      out_for_delivery: outForDelivery,
      delivered, cancelled,
      total: newO + accepted + printing + finishing + readyForPickup + outForDelivery + delivered + cancelled,
    });
  }
  return data;
}

function generateRevenueData(days: number): RevenueDataPoint[] {
  const data: RevenueDataPoint[] = [];
  const now = new Date('2026-09-12');

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const orders = Math.floor((isWeekend ? 180 : 280) + Math.random() * 50);
    const avgValue = 250 + Math.floor(Math.random() * 60);

    data.push({
      date: date.toISOString().split('T')[0],
      revenue: orders * avgValue,
      orders,
      averageOrderValue: avgValue,
    });
  }
  return data;
}

export const growthData365 = generateGrowthData(365);
export const orderVolumeData365 = generateOrderVolumeData(365);
export const revenueData365 = generateRevenueData(365);

export const mockActivityItems: ActivityItem[] = [
  { id: 'ACT-001', type: 'user_registered', title: 'New user registered', subtitle: 'Dhinesh Prabu', timestamp: '2026-09-12T08:00:00Z', entityId: 'USR-035', entityType: 'user' },
  { id: 'ACT-002', type: 'order_placed', title: 'New order placed', subtitle: 'OMX-1049', timestamp: '2026-09-11T15:06:00Z', entityId: 'OMX-1049', entityType: 'order' },
  { id: 'ACT-003', type: 'order_accepted', title: 'Order accepted', subtitle: 'OMX-1048', timestamp: '2026-09-11T14:35:00Z', entityId: 'OMX-1048', entityType: 'order' },
  { id: 'ACT-004', type: 'user_registered', title: 'New user registered', subtitle: 'Bhavani Raghunathan', timestamp: '2026-09-12T13:00:00Z', entityId: 'USR-032', entityType: 'user' },
  { id: 'ACT-005', type: 'order_delivered', title: 'Order delivered', subtitle: 'OMX-1042', timestamp: '2026-09-10T17:00:00Z', entityId: 'OMX-1042', entityType: 'order' },
  { id: 'ACT-006', type: 'shopkeeper_registered', title: 'New shopkeeper registered', subtitle: 'Nandu Xerox', timestamp: '2026-09-05T13:00:00Z', entityId: 'SHOP-014', entityType: 'shopkeeper' },
  { id: 'ACT-007', type: 'order_cancelled', title: 'Order cancelled', subtitle: 'OMX-1043', timestamp: '2026-09-10T18:25:00Z', entityId: 'OMX-1043', entityType: 'order' },
  { id: 'ACT-008', type: 'payment_received', title: 'Payment received', subtitle: 'OMX-1044 — ₹280', timestamp: '2026-09-11T07:00:00Z', entityId: 'OMX-1044', entityType: 'order' },
  { id: 'ACT-009', type: 'shopkeeper_registered', title: 'New shopkeeper registered', subtitle: 'Express Copy & Print', timestamp: '2026-08-01T12:00:00Z', entityId: 'SHOP-009', entityType: 'shopkeeper' },
  { id: 'ACT-010', type: 'shopkeeper_suspended', title: 'Shopkeeper suspended', subtitle: 'FastPrint Solutions', timestamp: '2026-09-01T10:00:00Z', entityId: 'SHOP-011', entityType: 'shopkeeper' },
  { id: 'ACT-011', type: 'order_placed', title: 'New order placed', subtitle: 'OMX-1033', timestamp: '2026-09-12T17:50:00Z', entityId: 'OMX-1033', entityType: 'order' },
  { id: 'ACT-012', type: 'order_placed', title: 'New order placed', subtitle: 'OMX-1041', timestamp: '2026-09-12T17:45:00Z', entityId: 'OMX-1041', entityType: 'order' },
];

export const mockTopShopkeepers: TopShopkeeper[] = [
  { rank: 1, shopkeeperId: 'SHOP-005', shopName: 'Tech Print Solutions', ownerName: 'Pradeep Nair', location: 'Bengaluru, Karnataka', totalOrders: 621, completedOrders: 603, cancelledOrders: 6, revenue: 178650, completionRate: 97.1 },
  { rank: 2, shopkeeperId: 'SHOP-001', shopName: 'Sri Digital Xerox', ownerName: 'Raj Kumar', location: 'Hosur, Tamil Nadu', totalOrders: 542, completedOrders: 521, cancelledOrders: 13, revenue: 142450, completionRate: 96.1 },
  { rank: 3, shopkeeperId: 'SHOP-015', shopName: 'DigitalDrive Prints', ownerName: 'Kavitha Nair', location: 'Bengaluru, Karnataka', totalOrders: 432, completedOrders: 418, cancelledOrders: 6, revenue: 122880, completionRate: 96.8 },
  { rank: 4, shopkeeperId: 'SHOP-004', shopName: 'Kumar Stationery & Xerox', ownerName: 'Suresh Kumar', location: 'Vellore, Tamil Nadu', totalOrders: 412, completedOrders: 398, cancelledOrders: 5, revenue: 112300, completionRate: 96.6 },
  { rank: 5, shopkeeperId: 'SHOP-002', shopName: 'Sai Print House', ownerName: 'Venkatesh Rao', location: 'Hosur, Tamil Nadu', totalOrders: 387, completedOrders: 371, cancelledOrders: 10, revenue: 98760, completionRate: 95.9 },
  { rank: 6, shopkeeperId: 'SHOP-007', shopName: 'College Zone Print Shop', ownerName: 'Murugan Palani', location: 'Coimbatore, Tamil Nadu', totalOrders: 346, completedOrders: 332, cancelledOrders: 7, revenue: 88920, completionRate: 95.9 },
  { rank: 7, shopkeeperId: 'SHOP-003', shopName: 'Arjun Copy Centre', ownerName: 'Arjun Menon', location: 'Krishnagiri, Tamil Nadu', totalOrders: 298, completedOrders: 285, cancelledOrders: 8, revenue: 76840, completionRate: 95.6 },
  { rank: 8, shopkeeperId: 'SHOP-010', shopName: 'Vijay Xerox & Binding', ownerName: 'Vijay Shankar', location: 'Tiruppur, Tamil Nadu', totalOrders: 289, completedOrders: 275, cancelledOrders: 8, revenue: 74230, completionRate: 95.2 },
];

export const mockOrderStatusDistribution: OrderStatusDistribution[] = [
  { status: 'New', count: 42, percentage: 15.2 },
  { status: 'Accepted', count: 28, percentage: 10.1 },
  { status: 'Printing', count: 35, percentage: 12.6 },
  { status: 'Finishing', count: 19, percentage: 6.9 },
  { status: 'Ready for Pickup', count: 22, percentage: 7.9 },
  { status: 'Out for Delivery', count: 18, percentage: 6.5 },
  { status: 'Delivered', count: 96, percentage: 34.7 },
  { status: 'Cancelled', count: 17, percentage: 6.1 },
];
