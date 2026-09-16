import { Shopkeeper } from '@/types/shopkeeper';

export const mockShopkeepers: Shopkeeper[] = [
  {
    id: 'SHOP-001', shopName: 'Sri Digital Xerox', ownerName: 'Raj Kumar', email: 'raj@sridigital.in', phone: '9876543001',
    location: 'Hosur, Tamil Nadu', address: '12, Gandhi Nagar, Hosur - 635109',
    status: 'active', verificationStatus: 'verified',
    openingTime: '08:00', closingTime: '21:00', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    createdAt: '2025-11-15T10:00:00Z', totalOrders: 542, completedOrders: 521, activeOrders: 8, cancelledOrders: 13,
    revenue: 142450, averageOrderValue: 263, rating: 4.8
  },
  {
    id: 'SHOP-002', shopName: 'Sai Print House', ownerName: 'Venkatesh Rao', email: 'venkat@saiprinthouse.in', phone: '9865432002',
    location: 'Hosur, Tamil Nadu', address: '45, Sipcot Phase II, Hosur - 635126',
    status: 'active', verificationStatus: 'verified',
    openingTime: '09:00', closingTime: '20:00', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    createdAt: '2025-12-01T09:00:00Z', totalOrders: 387, completedOrders: 371, activeOrders: 6, cancelledOrders: 10,
    revenue: 98760, averageOrderValue: 255, rating: 4.6
  },
  {
    id: 'SHOP-003', shopName: 'Arjun Copy Centre', ownerName: 'Arjun Menon', email: 'arjun@arjuncopies.com', phone: '9754321003',
    location: 'Krishnagiri, Tamil Nadu', address: '7, Bus Stand Road, Krishnagiri - 635001',
    status: 'active', verificationStatus: 'verified',
    openingTime: '08:30', closingTime: '20:30', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    createdAt: '2026-01-10T11:00:00Z', totalOrders: 298, completedOrders: 285, activeOrders: 5, cancelledOrders: 8,
    revenue: 76840, averageOrderValue: 258, rating: 4.5
  },
  {
    id: 'SHOP-004', shopName: 'Kumar Stationery & Xerox', ownerName: 'Suresh Kumar', email: 'suresh@kumarxerox.com', phone: '9643210004',
    location: 'Vellore, Tamil Nadu', address: '23, CMC Road, Vellore - 632001',
    status: 'active', verificationStatus: 'verified',
    openingTime: '09:00', closingTime: '21:30', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    createdAt: '2026-01-20T14:00:00Z', totalOrders: 412, completedOrders: 398, activeOrders: 9, cancelledOrders: 5,
    revenue: 112300, averageOrderValue: 273, rating: 4.7
  },
  {
    id: 'SHOP-005', shopName: 'Tech Print Solutions', ownerName: 'Pradeep Nair', email: 'pradeep@techprint.in', phone: '9532100005',
    location: 'Bengaluru, Karnataka', address: '56, MG Road, Bengaluru - 560001',
    status: 'active', verificationStatus: 'verified',
    openingTime: '09:00', closingTime: '22:00', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    createdAt: '2026-02-05T10:00:00Z', totalOrders: 621, completedOrders: 603, activeOrders: 12, cancelledOrders: 6,
    revenue: 178650, averageOrderValue: 288, rating: 4.9
  },
  {
    id: 'SHOP-006', shopName: 'RR Xerox & Prints', ownerName: 'Raman Rajendran', email: 'raman@rrxerox.com', phone: '9421000006',
    location: 'Salem, Tamil Nadu', address: '11, Omalur Road, Salem - 636004',
    status: 'active', verificationStatus: 'verified',
    openingTime: '08:00', closingTime: '20:00', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    createdAt: '2026-02-15T09:30:00Z', totalOrders: 234, completedOrders: 222, activeOrders: 4, cancelledOrders: 8,
    revenue: 62100, averageOrderValue: 265, rating: 4.4
  },
  {
    id: 'SHOP-007', shopName: 'College Zone Print Shop', ownerName: 'Murugan Palani', email: 'murugan@czprints.com', phone: '9310000007',
    location: 'Coimbatore, Tamil Nadu', address: '3, GN Mills Road, Coimbatore - 641029',
    status: 'active', verificationStatus: 'verified',
    openingTime: '08:00', closingTime: '21:00', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    createdAt: '2026-03-01T11:00:00Z', totalOrders: 346, completedOrders: 332, activeOrders: 7, cancelledOrders: 7,
    revenue: 88920, averageOrderValue: 257, rating: 4.6
  },
  {
    id: 'SHOP-008', shopName: 'Lakshmi Printing Works', ownerName: 'Ramya Lakshmi', email: 'ramya@lakshmiprints.com', phone: '9209000008',
    location: 'Erode, Tamil Nadu', address: '88, Perundurai Road, Erode - 638011',
    status: 'active', verificationStatus: 'verified',
    openingTime: '09:00', closingTime: '19:30', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    createdAt: '2026-03-10T10:30:00Z', totalOrders: 178, completedOrders: 170, activeOrders: 3, cancelledOrders: 5,
    revenue: 46540, averageOrderValue: 261, rating: 4.3
  },
  {
    id: 'SHOP-009', shopName: 'Express Copy & Print', ownerName: 'Bala Krishnan', email: 'bala@expresscopy.in', phone: '9198000009',
    location: 'Chennai, Tamil Nadu', address: '14, Anna Nagar, Chennai - 600040',
    status: 'pending', verificationStatus: 'pending',
    openingTime: '09:00', closingTime: '21:00', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    createdAt: '2026-08-01T12:00:00Z', totalOrders: 0, completedOrders: 0, activeOrders: 0, cancelledOrders: 0,
    revenue: 0, averageOrderValue: 0
  },
  {
    id: 'SHOP-010', shopName: 'Vijay Xerox & Binding', ownerName: 'Vijay Shankar', email: 'vijay@vijayxerox.com', phone: '9087000010',
    location: 'Tiruppur, Tamil Nadu', address: '22, Kumaran Road, Tiruppur - 641601',
    status: 'active', verificationStatus: 'verified',
    openingTime: '08:30', closingTime: '20:30', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    createdAt: '2026-04-05T10:00:00Z', totalOrders: 289, completedOrders: 275, activeOrders: 6, cancelledOrders: 8,
    revenue: 74230, averageOrderValue: 257, rating: 4.5
  },
  {
    id: 'SHOP-011', shopName: 'FastPrint Solutions', ownerName: 'Anand Rajan', email: 'anand@fastprint.in', phone: '8976000011',
    location: 'Dharmapuri, Tamil Nadu', address: '5, Old Bus Stand, Dharmapuri - 636701',
    status: 'suspended', verificationStatus: 'verified',
    openingTime: '09:00', closingTime: '20:00', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    createdAt: '2026-03-20T11:30:00Z', totalOrders: 87, completedOrders: 72, activeOrders: 0, cancelledOrders: 15,
    revenue: 21480, averageOrderValue: 247, rating: 3.2
  },
  {
    id: 'SHOP-012', shopName: 'Printzone Hosur', ownerName: 'Karthikeyan S', email: 'karthi@printzone.in', phone: '8865000012',
    location: 'Hosur, Tamil Nadu', address: '67, Denkanikottai Road, Hosur - 635109',
    status: 'active', verificationStatus: 'verified',
    openingTime: '09:00', closingTime: '21:00', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    createdAt: '2026-05-01T09:00:00Z', totalOrders: 198, completedOrders: 189, activeOrders: 4, cancelledOrders: 5,
    revenue: 52640, averageOrderValue: 266, rating: 4.6
  },
  {
    id: 'SHOP-013', shopName: 'Quality Print & Stationery', ownerName: 'Sendhil Murugan', email: 'sendhil@qualityprint.com', phone: '8754000013',
    location: 'Krishnagiri, Tamil Nadu', address: '34, Collector Office Road, Krishnagiri - 635001',
    status: 'active', verificationStatus: 'verified',
    openingTime: '08:00', closingTime: '20:00', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    createdAt: '2026-05-15T11:00:00Z', totalOrders: 156, completedOrders: 149, activeOrders: 3, cancelledOrders: 4,
    revenue: 40280, averageOrderValue: 258, rating: 4.4
  },
  {
    id: 'SHOP-014', shopName: 'Nandu Xerox', ownerName: 'Nandakumar P', email: 'nandu@nanduxerox.com', phone: '8643000014',
    location: 'Salem, Tamil Nadu', address: '78, Yercaud Main Road, Salem - 636002',
    status: 'pending', verificationStatus: 'unverified',
    openingTime: '09:30', closingTime: '20:30', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    createdAt: '2026-09-05T13:00:00Z', totalOrders: 0, completedOrders: 0, activeOrders: 0, cancelledOrders: 0,
    revenue: 0, averageOrderValue: 0
  },
  {
    id: 'SHOP-015', shopName: 'DigitalDrive Prints', ownerName: 'Kavitha Nair', email: 'kavitha@digitaldrive.in', phone: '8532000015',
    location: 'Bengaluru, Karnataka', address: '101, Whitefield Main Road, Bengaluru - 560066',
    status: 'active', verificationStatus: 'verified',
    openingTime: '08:00', closingTime: '22:00', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    createdAt: '2026-06-01T10:00:00Z', totalOrders: 432, completedOrders: 418, activeOrders: 8, cancelledOrders: 6,
    revenue: 122880, averageOrderValue: 285, rating: 4.8
  },
];
