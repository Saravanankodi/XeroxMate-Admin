import { ApiError, apiGet, apiSend } from "./client";
import type { Order } from "@/types/order";
import type { User, UserStatus } from "@/types/user";

export function getUsers(): Promise<User[]> {
  return apiGet<User[]>("/api/users");
}

export async function getUser(
  userId: string
): Promise<User | null> {
  try {
    return await apiGet<User>(
      `/api/users/${encodeURIComponent(userId)}`
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 404
    ) {
      return null;
    }

    throw error;
  }
}

export function getUserOrders(
  userId: string
): Promise<Order[]> {
  return apiGet<Order[]>(
    `/api/users/${encodeURIComponent(userId)}/orders`
  );
}

export function updateUserStatus(
  userId: string,
  status: UserStatus
): Promise<void> {
  return apiSend<void>(
    "PATCH",
    `/api/users/${encodeURIComponent(userId)}`,
    { status }
  );
}
