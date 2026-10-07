import {
  apiGet,
  apiSend,
  buildQuery,
} from "./client";
import type {
  PaginatedResult,
  ShopkeeperFilters,
} from "./types";
import type { Order } from "@/types/order";
import type {
  Shopkeeper,
  ShopkeeperStatus,
  VerificationStatus,
} from "@/types/shopkeeper";

export function getShopkeepers(
  filters: ShopkeeperFilters = {}
): Promise<PaginatedResult<Shopkeeper>> {
  return apiGet<PaginatedResult<Shopkeeper>>(
    `/api/shopkeepers${buildQuery(filters)}`
  );
}

export function getShopkeeperOrders(
  shopkeeperId: string
): Promise<Order[]> {
  return apiGet<Order[]>(
    `/api/shopkeepers/${encodeURIComponent(shopkeeperId)}/orders`
  );
}

export function updateShopkeeper(
  shopkeeperId: string,
  patch: {
    status?: ShopkeeperStatus;
    verificationStatus?: VerificationStatus;
  }
): Promise<void> {
  return apiSend<void>(
    "PATCH",
    `/api/shopkeepers/${encodeURIComponent(shopkeeperId)}`,
    patch
  );
}
