import { json, withAdmin } from "@/lib/server/http";
import { updateShopkeeper } from "@/lib/server/shopkeepers";
import type {
  ShopkeeperStatus,
  VerificationStatus,
} from "@/types/shopkeeper";

const VALID_STATUSES: ShopkeeperStatus[] = [
  "active",
  "pending",
  "suspended",
  "inactive",
];

const VALID_VERIFICATIONS: VerificationStatus[] = [
  "verified",
  "unverified",
  "pending",
];

export const PATCH = withAdmin(
  async ({ params, request }) => {
    const body = await request.json().catch(
      () => ({})
    );

    const patch: {
      status?: ShopkeeperStatus;
      verificationStatus?: VerificationStatus;
    } = {};

    if (body?.status !== undefined) {
      if (
        !VALID_STATUSES.includes(body.status)
      ) {
        return json(
          { error: "Invalid shop status." },
          400
        );
      }

      patch.status = body.status;
    }

    if (
      body?.verificationStatus !== undefined
    ) {
      if (
        !VALID_VERIFICATIONS.includes(
          body.verificationStatus
        )
      ) {
        return json(
          { error: "Invalid verification status." },
          400
        );
      }

      patch.verificationStatus =
        body.verificationStatus;
    }

    if (
      !patch.status &&
      !patch.verificationStatus
    ) {
      return json(
        { error: "Nothing to update." },
        400
      );
    }

    const updated = await updateShopkeeper(
      params.id,
      patch
    );

    if (!updated) {
      return json(
        { error: "Shop not found." },
        404
      );
    }

    return json({ success: true });
  }
);
