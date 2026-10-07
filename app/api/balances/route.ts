import { allBalances } from "@/lib/server/finance/balances";
import { json, withAdmin } from "@/lib/server/http";

export const GET = withAdmin(async () => json(await allBalances()));
