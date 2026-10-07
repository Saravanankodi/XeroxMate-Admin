// export type UserStatus = 'active' | 'inactive' | 'blocked';

// export type RegistrationStatus = 'complete' | 'incomplete';

// export type PayoutMethod = 'upi' | 'bank' | '';

// export interface UserAddress {
//   id: string;
//   label: string;
//   name: string;
//   phone: string;
//   house: string;
//   street: string;
//   area: string;
//   city: string;
//   pincode: string;
// }

// export interface User {
//   id: string;

//   name: string;
//   email: string;
//   phone: string;

//   role: 'customer';

//   accountStatus: UserStatus;
//   registrationStatus: RegistrationStatus;

//   payoutMethod: PayoutMethod;
//   upiId?: string;

//   createdAt: string;
//   updatedAt: string;

//   addresses: UserAddress[];

//   // Calculated from orders
//   totalOrders: number;
//   completedOrders: number;
//   activeOrders: number;
//   cancelledOrders: number;
//   totalSpent: number;
// }
export type UserStatus =
  | 'active'
  | 'inactive'
  | 'blocked';

export interface UserAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  house: string;
  street: string;
  area: string;
  city: string;
  pincode: string;
}

export interface User {
  id: string;

  name: string;
  email: string;
  phone: string;

  role: 'customer';

  accountStatus: UserStatus;

  registrationStatus:
    | 'complete'
    | 'incomplete'
    | string;

  payoutMethod?: string;
  upiId?: string;

  addresses: UserAddress[];

  location: string;

  createdAt: string;
  updatedAt: string;

  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  totalSpent: number;
}
