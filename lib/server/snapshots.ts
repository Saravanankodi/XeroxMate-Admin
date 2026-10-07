import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { toISO } from "@/lib/server/serialize";

export interface UserRow {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  accountStatus: string;
}

export interface ShopRow {
  id: string;
  name: string;
  createdAt: string;
  accountStatus: string;
  updatedAt: string;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function loadUserRows(): Promise<UserRow[]> {
  const snapshot = await getAdminFirestore()
    .collection("users")
    .get();

  return snapshot.docs.map((document) => {
    const data = document.data();

    return {
      id: document.id,
      name: str(data.name),
      phone: str(data.phone),
      createdAt: toISO(data.createdAt),
      accountStatus:
        str(data.accountStatus) || "active",
    };
  });
}

export async function loadShopRows(): Promise<ShopRow[]> {
  const snapshot = await getAdminFirestore()
    .collection("shops")
    .get();

  return snapshot.docs.map((document) => {
    const data = document.data();

    return {
      id: document.id,
      name: str(data.name),
      createdAt: toISO(data.createdAt),
      accountStatus: str(data.accountStatus),
      updatedAt: toISO(data.updatedAt),
    };
  });
}
