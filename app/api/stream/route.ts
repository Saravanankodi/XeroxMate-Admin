import { NextResponse } from "next/server";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { withAdmin } from "@/lib/server/http";

/**
 * Server-sent events feed for finance-driven screens.
 *
 * Firestore `onSnapshot` listeners run in the route handler; every change to
 * a finance collection pushes a `change` event, which the client turns into a
 * `subscribeFinance` emission so open screens refetch. The browser never
 * touches Firestore — this is the only realtime channel.
 */
const TRACKED_COLLECTIONS = [
  "payments",
  "payouts",
  "auditLogs",
  "notifications",
] as const;

const HEARTBEAT_MS = 25000;

export const GET = withAdmin(async ({ request }) => {
  const encoder = new TextEncoder();

  let cleanup = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: change\ndata: ${JSON.stringify(payload)}\n\n`
            )
          );
        } catch {
          // Stream already closed; the abort handler cleans up.
        }
      };

      const unsubscribe = TRACKED_COLLECTIONS.map((collection) =>
        getAdminFirestore()
          .collection(collection)
          .onSnapshot(
            () => send({ collection }),
            (error) => console.error("[stream] snapshot error:", error)
          )
      );

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // Stream already closed; the abort handler cleans up.
        }
      }, HEARTBEAT_MS);

      cleanup = () => {
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = undefined;
        }

        for (const stop of unsubscribe) {
          stop();
        }

        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };

      request.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      cleanup();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
