import { apiGet, buildQuery } from "./client";
import type {
  GrowthDataPoint,
  OrderStatusDistribution,
  RevenueDataPoint,
  TimeRange,
  TopShopkeeper,
} from "@/types/analytics";

export function getRevenueData(
  range: TimeRange
): Promise<RevenueDataPoint[]> {
  return apiGet<RevenueDataPoint[]>(
    `/api/analytics/revenue${buildQuery({ range })}`
  );
}

export function getGrowthData(
  range: TimeRange
): Promise<GrowthDataPoint[]> {
  return apiGet<GrowthDataPoint[]>(
    `/api/analytics/growth${buildQuery({ range })}`
  );
}

export function getOrderStatusDistribution(): Promise<
  OrderStatusDistribution[]
> {
  return apiGet<OrderStatusDistribution[]>(
    "/api/analytics/status"
  );
}

export function getTopShopkeepers(): Promise<TopShopkeeper[]> {
  return apiGet<TopShopkeeper[]>("/api/analytics/top-shops");
}
