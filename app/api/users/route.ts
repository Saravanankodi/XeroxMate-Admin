import { json, withAdmin } from "@/lib/server/http";
import { listUsers } from "@/lib/server/users";

export const GET = withAdmin(async () =>
  json(await listUsers())
);
