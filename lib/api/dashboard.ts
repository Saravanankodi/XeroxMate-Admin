import { apiGet } from "./client";
import type {
  ActivityItem,
  DashboardStats,
  PlatformHealth,
} from "@/types/analytics";

export function getDashboardStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>("/api/dashboard/stats");
}

export function getPlatformHealth(): Promise<PlatformHealth> {
  return apiGet<PlatformHealth>("/api/dashboard/health");
}

export function getRecentActivity(): Promise<ActivityItem[]> {
  return apiGet<ActivityItem[]>("/api/dashboard/activity");
}
