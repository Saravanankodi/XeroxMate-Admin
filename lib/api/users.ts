import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
  type QueryConstraint,
} from 'firebase/firestore';

import { db } from '@/lib/firebase/client';
import {
  User,
  UserAddress,
  UserStatus,
  PayoutMethod,
  RegistrationStatus,
} from '@/types/user';

const USERS_COLLECTION = 'users';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

function timestampToISO(value: unknown): string {
  if (!value) {
    return '';
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (
      value as { toDate: () => Date }
    ).toDate().toISOString();
  }

  return '';
}

function mapAddress(
  documentId: string,
  data: Record<string, unknown>
): UserAddress {
  return {
    id: String(data.id ?? documentId),
    label: String(data.label ?? ''),
    name: String(data.name ?? ''),
    phone: String(data.phone ?? ''),
    house: String(data.house ?? ''),
    street: String(data.street ?? ''),
    area: String(data.area ?? ''),
    city: String(data.city ?? ''),
    pincode: String(data.pincode ?? ''),
  };
}

async function getUserAddresses(
  userId: string
): Promise<UserAddress[]> {
  const addressesRef = collection(
    db,
    USERS_COLLECTION,
    userId,
    'addresses'
  );

  const snapshot = await getDocs(addressesRef);

  return snapshot.docs.map((item) =>
    mapAddress(item.id, item.data())
  );
}

function mapUser(
  documentId: string,
  data: Record<string, unknown>,
  addresses: UserAddress[] = []
): User {
  const accountStatus = String(
    data.accountStatus ?? 'active'
  ) as UserStatus;

  const registrationStatus = String(
    data.registrationStatus ?? 'incomplete'
  ) as RegistrationStatus;

  const payoutMethod = String(
    data.payoutMethod ?? ''
  ) as PayoutMethod;

  return {
    id: String(data.id ?? documentId),

    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),

    role: 'customer',

    accountStatus,
    registrationStatus,

    payoutMethod,
    upiId: data.upiId
      ? String(data.upiId)
      : undefined,

    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),

    addresses,

    // These will be populated from orders later.
    totalOrders: 0,
    completedOrders: 0,
    activeOrders: 0,
    cancelledOrders: 0,
    totalSpent: 0,
  };
}

/**
 * Get a single customer.
 */
export async function getUser(
  userId: string
): Promise<User | null> {
  const userRef = doc(
    db,
    USERS_COLLECTION,
    userId
  );

  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  if (data.role !== 'customer') {
    return null;
  }

  const addresses = await getUserAddresses(userId);

  return mapUser(
    snapshot.id,
    data,
    addresses
  );
}

/**
 * Get all customers.
 */
export async function getUsers(options?: {
  search?: string;
  status?: string;
  sortBy?: keyof User;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<User>> {
  const {
    search = '',
    status = '',
    sortBy = 'createdAt',
    sortDir = 'desc',
    page = 1,
    pageSize = 10,
  } = options ?? {};

  const constraints: QueryConstraint[] = [
    where('role', '==', 'customer'),
  ];

  /**
   * Firestore can filter accountStatus directly.
   */
  if (
    status === 'active' ||
    status === 'inactive' ||
    status === 'blocked'
  ) {
    constraints.push(
      where('accountStatus', '==', status)
    );
  }

  /**
   * createdAt is the safest Firestore ordering field.
   *
   * Sorting by calculated values such as totalSpent
   * cannot happen here because those values are derived
   * from orders.
   */
  if (sortBy === 'createdAt') {
    constraints.push(
      orderBy(
        'createdAt',
        sortDir
      )
    );
  } else {
    constraints.push(
      orderBy('createdAt', 'desc')
    );
  }

  const usersQuery = query(
    collection(db, USERS_COLLECTION),
    ...constraints
  );

  const snapshot = await getDocs(usersQuery);

  const mappedUsers = await Promise.all(
    snapshot.docs.map(async (item) => {
      const addresses = await getUserAddresses(
        item.id
      );

      return mapUser(
        item.id,
        item.data(),
        addresses
      );
    })
  );

  /**
   * Client-side search because Firestore does not
   * support arbitrary contains searches.
   */
  const normalizedSearch =
    search.trim().toLowerCase();

  let filteredUsers = mappedUsers;

  if (normalizedSearch) {
    filteredUsers = mappedUsers.filter(
      (user) =>
        user.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        user.email
          .toLowerCase()
          .includes(normalizedSearch) ||
        user.phone
          .toLowerCase()
          .includes(normalizedSearch) ||
        user.id
          .toLowerCase()
          .includes(normalizedSearch)
    );
  }

  /**
   * Client-side sorting for fields that aren't
   * stored directly in the users document.
   */
  if (sortBy !== 'createdAt') {
    filteredUsers.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      if (sortBy === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      }

      if (sortBy === 'totalSpent') {
        aValue = a.totalSpent;
        bValue = b.totalSpent;
      }

      if (sortBy === 'totalOrders') {
        aValue = a.totalOrders;
        bValue = b.totalOrders;
      }

      if (typeof aValue === 'number') {
        return sortDir === 'asc'
          ? aValue - Number(bValue)
          : Number(bValue) - aValue;
      }

      return sortDir === 'asc'
        ? String(aValue).localeCompare(
            String(bValue)
          )
        : String(bValue).localeCompare(
            String(aValue)
          );
    });
  }

  const total = filteredUsers.length;

  const totalPages = Math.max(
    1,
    Math.ceil(total / pageSize)
  );

  const safePage = Math.min(
    Math.max(page, 1),
    totalPages
  );

  const startIndex =
    (safePage - 1) * pageSize;

  const data = filteredUsers.slice(
    startIndex,
    startIndex + pageSize
  );

  return {
    data,
    total,
    totalPages,
    page: safePage,
    pageSize,
  };
}

/**
 * Update customer account status in Firestore.
 */
export async function updateUserStatus(
  userId: string,
  status: UserStatus
): Promise<void> {
  const userRef = doc(
    db,
    USERS_COLLECTION,
    userId
  );

  await updateDoc(userRef, {
    accountStatus: status,
    updatedAt: new Date(),
  });
}
