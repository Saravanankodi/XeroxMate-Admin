import {
  getCommissionRate,
  setCommissionRate,
} from "@/lib/server/finance/helpers";
import { json, readJson, withAdmin } from "@/lib/server/http";

export const GET = withAdmin(async () =>
  json({ rate: await getCommissionRate() })
);

export const PATCH = withAdmin(async ({ admin, request }) => {
  const body = await readJson<{ rate?: unknown }>(request);

  const rate = await setCommissionRate(Number(body.rate), admin);

  return json({ rate });
});
