import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase/client';
import { mapFirebaseOrder } from './orderMapper';
import type { Order } from '@/types/order';

const ORDERS_COLLECTION = 'orders';

/**
 * Fetch all orders
 */
export async function getOrders(): Promise<Order[]> {
  const ordersRef = collection(
    db,
    ORDERS_COLLECTION
  );

  const q = query(
    ordersRef,
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) =>
    mapFirebaseOrder(
      document.data(),
      document.id
    )
  );
}

/**
 * Fetch a single order
 */
export async function getOrderById(
  orderId: string
): Promise<Order | null> {
  const orderRef = doc(
    db,
    ORDERS_COLLECTION,
    orderId
  );

  const snapshot = await getDoc(orderRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapFirebaseOrder(
    snapshot.data(),
    snapshot.id
  );
}

/**
 * Fetch orders belonging to a specific customer
 *
 * Firestore field:
 *
 * orders/{orderId}/customerId
 */
export async function getUserOrders(
  customerId: string
): Promise<Order[]> {
  const ordersRef = collection(
    db,
    ORDERS_COLLECTION
  );

  const q = query(
    ordersRef,
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) =>
    mapFirebaseOrder(
      document.data(),
      document.id
    )
  );
}

/**
 * Subscribe to all orders
 */
export function subscribeToOrders(
  callback: (orders: Order[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ordersRef = collection(
    db,
    ORDERS_COLLECTION
  );

  const q = query(
    ordersRef,
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map(
        (document) =>
          mapFirebaseOrder(
            document.data(),
            document.id
          )
      );

      callback(orders);
    },
    (error) => {
      console.error(
        'Failed to subscribe to orders:',
        error
      );

      onError?.(error);
    }
  );
}
