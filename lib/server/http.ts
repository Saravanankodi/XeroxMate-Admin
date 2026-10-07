import "server-only";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  requireAdmin,
  type AuthenticatedAdmin,
} from "@/lib/firebase/auth";
import { FinanceError } from "@/lib/finance/errors";

export interface AdminHandlerContext {
  admin: AuthenticatedAdmin;
  request: NextRequest;
  url: URL;
  searchParams: URLSearchParams;
  params: Record<string, string>;
}

export type AdminHandler = (
  context: AdminHandlerContext,
) => Promise<Response> | Response;

/**
 * Wraps a route handler with session verification.
 *
 * Every `/api/*` data endpoint must use this: the browser holds no Firestore
 * credentials, so this check (session cookie + `admins/{uid}` lookup) is the
 * only thing standing between the public internet and the database.
 */
export function withAdmin(
  handler: AdminHandler,
) {
  return async (
    request: NextRequest,
    context?: {
      params?: Promise<Record<string, string>>;
    },
  ): Promise<Response> => {
    try {
      const admin = await requireAdmin();
      const params = context?.params
        ? await context.params
        : {};

      return await handler({
        admin,
        request,
        url: request.nextUrl,
        searchParams: request.nextUrl.searchParams,
        params,
      });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * Maps thrown errors onto HTTP responses.
 *
 * Messages are user-facing and never expose storage internals, matching the
 * `FinanceError` contract the UI already renders.
 */
export function errorResponse(
  error: unknown,
): NextResponse {
  if (error instanceof FinanceError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: 400 },
    );
  }

  const message =
    error instanceof Error ? error.message : String(error);

  if (message === "Authentication required.") {
    return NextResponse.json(
      { error: message },
      { status: 401 },
    );
  }

  if (message === "Admin access required.") {
    return NextResponse.json(
      { error: message },
      { status: 403 },
    );
  }

  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;

  const isAuthError =
    typeof code === "string" && code.startsWith("auth/");

  if (isAuthError) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  console.error("[api] unhandled error:", error);

  return NextResponse.json(
    {
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error."
          : message,
    },
    { status: 500 },
  );
}

export function json<T>(
  data: T,
  status = 200,
): NextResponse {
  return NextResponse.json(data, { status });
}

export async function readJson<T>(
  request: Request,
): Promise<T> {
  if (!request.body) {
    return {} as T;
  }

  try {
    return (await request.json()) as T;
  } catch {
    throw new FinanceError(
      "INVALID_AMOUNT",
      "Request body must be valid JSON.",
    );
  }
}

/**
 * Typed query-string helpers — every list endpoint reads its filters
 * through these so parsing stays consistent across domains.
 */
export const query = {
  str(
    params: URLSearchParams,
    name: string,
    fallback = "",
  ): string {
    return params.get(name) ?? fallback;
  },

  int(
    params: URLSearchParams,
    name: string,
    fallback: number,
  ): number {
    const raw = params.get(name);

    if (raw === null || raw === "") {
      return fallback;
    }

    const parsed = Number.parseInt(raw, 10);

    return Number.isNaN(parsed) ? fallback : parsed;
  },

  num(
    params: URLSearchParams,
    name: string,
    fallback: number | null,
  ): number | null {
    const raw = params.get(name);

    if (raw === null || raw === "") {
      return fallback;
    }

    const parsed = Number(raw);

    return Number.isNaN(parsed) ? fallback : parsed;
  },
};

/**
 * Firestore (offset) pagination from `page`/`pageSize` — the UI navigates by
 * page number, so cursors would not map cleanly onto it.
 */
export function paginate<T>(
  rows: T[],
  page: number,
  pageSize: number,
): {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const total = rows.length;
  const safePageSize = Math.max(1, pageSize);
  const totalPages =
    Math.ceil(total / safePageSize) || 1;
  const safePage = Math.min(
    Math.max(page, 1),
    totalPages,
  );
  const start = (safePage - 1) * safePageSize;

  return {
    data: rows.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}
