import { FinanceError } from "@/lib/finance/errors";
import {
  declinePayment,
  getPayment,
  reconcileOrderForPayment,
  refundPayment,
  verifyPayment,
} from "@/lib/server/finance/payments";
import { json, readJson, withAdmin } from "@/lib/server/http";

const VALID_ACTIONS = ["verify", "decline", "refund"] as const;

type PaymentAction = (typeof VALID_ACTIONS)[number];

export const GET = withAdmin(async ({ admin, params }) => {
  const existing = await getPayment(params.id);

  if (!existing) {
    return json({ error: "Payment not found." }, 404);
  }

  await reconcileOrderForPayment(existing, admin);

  const payment = await getPayment(params.id);

  if (!payment) {
    return json({ error: "Payment not found." }, 404);
  }

  return json(payment);
});

export const PATCH = withAdmin(
  async ({ admin, params, request }) => {
    const body = await readJson<{
      action?: string;
      note?: string;
      reason?: string;
      otherReason?: string;
    }>(request);

    const action = body.action as PaymentAction | undefined;

    if (!action || !VALID_ACTIONS.includes(action)) {
      throw new FinanceError("INVALID_AMOUNT", "Invalid payment action.");
    }

    if (action === "verify") {
      return json(
        await verifyPayment(params.id, { note: body.note }, admin)
      );
    }

    if (action === "decline") {
      if (!body.reason) {
        throw new FinanceError(
          "INVALID_AMOUNT",
          "A decline reason is required."
        );
      }

      return json(
        await declinePayment(
          params.id,
          {
            reason: body.reason,
            otherReason: body.otherReason,
            note: body.note,
          },
          admin
        )
      );
    }

    return json(
      await refundPayment(params.id, { reason: body.reason }, admin)
    );
  }
);
