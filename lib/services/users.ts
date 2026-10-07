import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  type QueryConstraint,
  Timestamp,
} from 'firebase/firestore';

import { db } from '@/lib/firebase/client';
import { User, UserAddress, UserStatus } from '@/types/user';

const USERS_COLLECTION = 'users';

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

function mapUser(
  documentId: string,
  data: Record<string, unknown>
): User {
  const accountStatus = String(
    data.accountStatus ?? 'active'
  ) as UserStatus;

  return {
    id: String(data.id ?? documentId),

    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),

    role: 'customer',

    accountStatus,

    registrationStatus: String(
      data.registrationStatus ?? 'incomplete'
    ) as User['registrationStatus'],

    createdAt: timestampToISO(data.createdAt),
    updatedAt: timestampToISO(data.updatedAt),

    totalOrders: 0,
    completedOrders: 0,
    activeOrders: 0,
    cancelledOrders: 0,
    totalSpent: 0,
  };
}

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

  return mapUser(snapshot.id, data);
}

export async function getUsers(): Promise<User[]> {
  const usersQuery = query(
    collection(db, USERS_COLLECTION),
    where('role', '==', 'customer'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(usersQuery);

  return snapshot.docs.map((item) =>
    mapUser(item.id, item.data())
  );
}

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
export async function getUserAddresses(
  userId: string
): Promise<UserAddress[]> {
  const addressesRef = collection(
    db,
    USERS_COLLECTION,
    userId,
    'addresses'
  );

  const snapshot = await getDocs(addressesRef);

  return snapshot.docs.map((item) => {
    const data = item.data();

    return {
      id: String(data.id ?? item.id),
      name: String(data.name ?? ''),
      phone: String(data.phone ?? ''),
      label: String(data.label ?? ''),

      house: String(data.house ?? ''),
      street: String(data.street ?? ''),
      area: String(data.area ?? ''),
      city: String(data.city ?? ''),
      pincode: String(data.pincode ?? ''),
    };
  });
}
