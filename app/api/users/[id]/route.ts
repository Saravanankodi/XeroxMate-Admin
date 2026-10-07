import {
  json,
  readJson,
  withAdmin,
} from "@/lib/server/http";
import {
  getUser,
  updateUserStatus,
} from "@/lib/server/users";
import type { UserStatus } from "@/types/user";

const VALID_STATUSES: UserStatus[] = [
  "active",
  "inactive",
  "blocked",
];

export const GET = withAdmin(async ({ params }) => {
  const user = await getUser(params.id);

  if (!user) {
    return json({ error: "User not found." }, 404);
  }

  return json(user);
});

export const PATCH = withAdmin(
  async ({ params, request }) => {
    const body = await readJson<{
      status?: unknown;
    }>(request);

    const status =
      typeof body.status === "string"
        ? body.status
        : "";

    if (
      !VALID_STATUSES.includes(
        status as UserStatus
      )
    ) {
      return json(
        { error: "Invalid account status." },
        400
      );
    }

    const updated = await updateUserStatus(
      params.id,
      status as UserStatus
    );

    if (!updated) {
      return json({ error: "User not found." }, 404);
    }

    return json({ success: true });
  }
);
