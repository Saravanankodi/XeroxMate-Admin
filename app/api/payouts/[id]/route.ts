import { FinanceError } from "@/lib/finance/errors";
import {
  addPayoutNote,
  approvePayout,
  cancelPayout,
  completePayout,
  failPayout,
  getPayout,
  holdPayout,
  processPayout,
  rejectPayout,
} from "@/lib/server/finance/payouts";
import { json, readJson, withAdmin } from "@/lib/server/http";

const VALID_ACTIONS = [
  "hold",
  "approve",
  "process",
  "complete",
  "reject",
  "fail",
  "cancel",
  "addNote",
] as const;

type PayoutAction = (typeof VALID_ACTIONS)[number];

export const GET = withAdmin(async ({ params }) => {
  const payout = await getPayout(params.id);

  if (!payout) {
    return json({ error: "Payout request not found." }, 404);
  }

  return json(payout);
});

export const PATCH = withAdmin(
  async ({ admin, params, request }) => {
    const body = await readJson<{
      action?: string;
      note?: string;
      reason?: string;
      reference?: string;
    }>(request);

    const action = body.action as PayoutAction | undefined;

    if (!action || !VALID_ACTIONS.includes(action)) {
      throw new FinanceError("INVALID_AMOUNT", "Invalid payout action.");
    }

    switch (action) {
      case "hold":
        return json(
          await holdPayout(params.id, { note: body.note }, admin)
        );

      case "approve":
        return json(
          await approvePayout(params.id, { note: body.note }, admin)
        );

      case "process":
        return json(
          await processPayout(params.id, { note: body.note }, admin)
        );

      case "complete":
        return json(
          await completePayout(
            params.id,
            { reference: body.reference, note: body.note },
            admin
          )
        );

      case "reject":
        if (!body.reason) {
          throw new FinanceError(
            "INVALID_AMOUNT",
            "A rejection reason is required."
          );
        }
        return json(
          await rejectPayout(
            params.id,
            { reason: body.reason, note: body.note },
            admin
          )
        );

      case "fail":
        if (!body.reason) {
          throw new FinanceError(
            "INVALID_AMOUNT",
            "A failure reason is required."
          );
        }
        return json(
          await failPayout(
            params.id,
            { reason: body.reason, note: body.note },
            admin
          )
        );

      case "cancel":
        return json(await cancelPayout(params.id, { reason: body.reason }, admin));

      case "addNote":
        if (!body.note) {
          throw new FinanceError("INVALID_AMOUNT", "Note cannot be empty.");
        }
        return json(await addPayoutNote(params.id, body.note, admin));
    }
  }
);
