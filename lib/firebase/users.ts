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
} from 'firebase/firestore';

import { db } from '@/lib/firebase/client';
import { User, UserStatus } from '@/types/user';

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

async function getUserAddresses(userId: string) {
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
      label: String(data.label ?? ''),
      name: String(data.name ?? ''),
      phone: String(data.phone ?? ''),
      house: String(data.house ?? ''),
      street: String(data.street ?? ''),
      area: String(data.area ?? ''),
      city: String(data.city ?? ''),
      pincode: String(data.pincode ?? ''),
    };
  });
}

async function mapUser(
  documentId: string,
  data: Record<string, unknown>
): Promise<User> {
  const addresses = await getUserAddresses(documentId);

  return {
    id: String(data.id ?? documentId),

    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),

    role: 'customer',

    accountStatus: String(
      data.accountStatus ?? 'active'
    ) as UserStatus,

    registrationStatus: String(
      data.registrationStatus ?? 'incomplete'
    ) as User['registrationStatus'],

    payoutMethod: String(
      data.payoutMethod ?? ''
    ),

    upiId: String(
      data.upiId ?? ''
    ),

    addresses,

    location: addresses[0]
      ? `${addresses[0].area}, ${addresses[0].city}`
      : '',

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

  return mapUser(
    snapshot.id,
    data
  );
}

export async function getUsers(): Promise<User[]> {
  const usersQuery = query(
    collection(db, USERS_COLLECTION),
    where('role', '==', 'customer'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(usersQuery);

  return Promise.all(
    snapshot.docs.map((item) =>
      mapUser(
        item.id,
        item.data()
      )
    )
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
    updatedAt: Timestamp.now(),
  });
}
