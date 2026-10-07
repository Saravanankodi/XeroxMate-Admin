# XeroxMate Admin — Architecture

Production Firebase-backed replacement for the original mock-data admin console.
Admin pages are unchanged; every read/write goes through typed API routes to
Firestore via `firebase-admin`. No mock data remains (`data/*`, `lib/finance`
mock store, legacy `lib/api.ts` are gone).

Stack: Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4
· Firebase client SDK (auth only) · firebase-admin (all data access).

## Layers

```
app/admin/** (pages, unchanged imports)
  └─ lib/api/*        typed client: apiGet/apiSend → /api/*
       └─ app/api/**  route handlers (Next route.ts)
            ├─ lib/server/http.ts    withAdmin auth, json/readJson, query, paginate
            └─ lib/server/**         domain modules → firebase-admin Firestore
```

- Browser code never touches Firestore — only the admin SDK on the server.
- `lib/finance/*` is the finance UI's local layer: `api.ts` (fetch wrappers +
  error re-hydration), `store.ts` (pub/sub), `useFinanceSync.ts` (subscribe),
  `realtime.ts` (SSE client), `export.ts` (CSV), `errors.ts` (FinanceError →
  user-facing message).

## Auth

- `proxy.ts` (renamed from `middleware.ts`, Next 16) guards `/admin/*`.
- Session: Firebase session cookie `admin_session`, minted by
  `/api/auth/session` from a verified ID token; cleared by `/api/auth/logout`.
- Every data route wraps its handler in `withAdmin` (`lib/server/http.ts`):
  verifies the session cookie, loads the admin record, maps thrown
  `FinanceError`s to `400 {error, code}`; unauthenticated → `401`.

## Data model (Firestore, project `xeroxmate`)

Shared with the customer & shop apps — this repo ships **no security rules**
(anon reads are blocked by existing rules; wallet/platform docs require admin).

| Collection | Notes |
|---|---|
| `users` | doc id = auth uid; `accountStatus` `active\|inactive\|blocked` |
| `shops` | doc id `shop-*`; `status`, `verificationStatus`, `ownerName` |
| `orders` | doc id = order id (`OMX-10017`); status **UPPERCASE** (`COMPLETED`); `paymentStatus` lowercase; `customerId`, `shopId`; `timeline[]` of `{status, at}` |
| `payments` | materialized from orders (reconcile-on-read); verification/payout state |
| `payouts` | `PR-*` ids; status `requested→under_review→approved→processing→completed` (+`rejected\|failed\|cancelled`); `timeline[]` with `by`/`note` |
| `wallets` | doc id = shopId: `totalEarned`, `pendingRequested`, `withdrawn`, `ordersCounted` |
| `auditLogs` | append-only admin action trail (`AUD-*`), filterable by entity |
| `notifications` | audiences `admin` / `shopkeeper`, `read` flag, `markAllRead` |
| `platform/settings` | `minWithdrawalAmount` (100), `commissionPercent` (5), `updatedAt` |
| `platform/counters` | id sequences |

IDs: `PAY-/PR-/AUD-/FN-` + `Date.now().toString(36)` + random suffix.
Order status mapping (UI lowercase → document): `delivered→COMPLETED`,
`ready_for_pickup→READY_PICKUP`, others uppercase; status writes append
`timeline` + `updatedAt`.

## API surface

| Area | Routes |
|---|---|
| users | `GET /api/users`, `GET/PATCH /api/users/[id]`, `GET /api/users/[id]/orders` |
| shopkeepers | `GET /api/shopkeepers`, `GET/PATCH /api/shopkeepers/[id]`, `GET .../[id]/orders` |
| orders | `GET /api/orders` (filters: status, paymentStatus, deliveryType, shopkeeperId, userId, search, sort, page), `GET/PATCH /api/orders/[id]` |
| payments | `GET /api/payments` (reconciles on read), `GET /api/payments/[id]`, `POST /api/payments/sync` |
| payouts | `GET/POST /api/payouts` (`all=1` for full list), `GET/PATCH /api/payouts/[id]` (actions: hold/approve/process/complete/reject/fail/cancel/addNote), `GET /api/payouts/contributing` |
| balances | `GET /api/balances` (per-shop ledger breakdown) |
| commission | `GET/PUT /api/commission` |
| finance stats | `GET /api/finance/{stats,volume,commission-trend,distribution,notifications}` |
| audit | `GET /api/audit`, `GET /api/audit/entity` |
| dashboard | `GET /api/dashboard/{stats,health,activity}` |
| analytics | `GET /api/analytics/{revenue,growth,status,top-shops}` (`?range=7d\|30d\|90d`) |
| search | `GET /api/search?q=` (≥2 chars → top 5 per domain: users/shops/orders) |
| realtime | `GET /api/stream` (SSE) |
| auth | `POST /api/auth/{session,logout}` |

Lists return `PaginatedResult {data, total, page, pageSize, totalPages}`
(exceptions: `GET /api/users` and `GET /api/balances` return plain arrays).

## Finance domain (`lib/server/finance/*`)

- **Balances** are wallet-primary: `available = verifiedEarnings −
  lockedAmount − paidOutAmount`, all maintained on `wallets/{shopId}`.
- **Payout lifecycle** moves wallet counters:
  create += `pendingRequested`; hold/approve/process lock;
  reject/fail/cancel release the lock; complete -= `pendingRequested`,
  += `withdrawn`. State machine enforced per-action (`assertStatus`).
- **Payments** reconcile-on-read: each completed order materializes a payment
  doc (idempotent, per-id via `/api/payments/[id]`); commission =
  `platform/settings.commissionPercent` (fallback 10, bounds 0–50).
- **Validation**: min payout vs `platform/settings.minWithdrawalAmount`
  (fallback 100) → `BELOW_MINIMUM`; balance → `INSUFFICIENT_BALANCE`;
  open request → `DUPLICATE_REQUEST`. Known codes surface verbatim via
  `lib/finance/errors.ts`.
- **Attribution**: every mutation stamps the authenticated admin
  (`adminStamp` → `adminId`/`adminName` in audit, `by` in timelines), writes
  an `auditLogs` entry and fans out `notifications` per audience.
- FinanceError codes cover all listed codes; unknown errors map to
  `NETWORK_FAILURE` on the client.

## Realtime

- `GET /api/stream`: server-side `onSnapshot` on `payments`, `payouts`,
  `auditLogs`, `notifications` → SSE `event: change` per collection; 25s
  heartbeat; cleans up listeners on abort.
- Client: `ensureFinanceStream()` (`lib/finance/realtime.ts`) opens one
  EventSource; any finance mutation calls `emitFinance()`; components
  `subscribeFinance(cb)` refetch on either trigger
  (`useFinanceSync`, notification bell).

## Dashboard & analytics

- Aggregates are computed on read from live collections — no stored stats.
- Day bucketing is IST (`Asia/Kolkata`, `en-CA` date keys) in
  `lib/server/time.ts`; `lib/server/snapshots.ts` bulk-loads user/shop rows.
- Growth % vs previous period; recent activity is derived from
  users/shops/orders events (no synthetic payment events).

## Operational notes

- `firestore.indexes.json` holds composite indexes; creation requires
  `roles/datastore.indexAdmin` on the SA (pending IAM grant). Queries are
  written to be index-free where possible.
- Local scripts must load the service account from `.env.local`
  (`FIREBASE_SERVICE_ACCOUNT` env var) — never hardcode or echo the key.
- Pre-existing lint baseline: 1 error (`app/admin/users/page.tsx`), 1 warning
  (`lib/firebase/logout.ts`).
- Status writes (R4): orders PATCH is optimistic in the UI and rolls back on
  failure; shopkeeper verification PATCH likewise (R4b).
