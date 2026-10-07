import { json, withAdmin } from "@/lib/server/http";
import { getPlatformHealth } from "@/lib/server/dashboard";

export const GET = withAdmin(async () =>
  json(await getPlatformHealth())
);
