import { json, withAdmin } from "@/lib/server/http";
import { getDashboardStats } from "@/lib/server/dashboard";

export const GET = withAdmin(async () =>
  json(await getDashboardStats())
);
