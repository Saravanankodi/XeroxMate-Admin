/**
 * HTTP client shared by every client-side service module.
 *
 * All admin data flows through `/api/*` route handlers, so the browser never
 * talks to Firestore directly. Requests always carry the httpOnly
 * `admin_session` cookie; a 401 means the session expired and we bounce the
 * user back to the login screen exactly like the proxy does.
 */

const LOGIN_PATH = '/?error=authentication_required';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface ApiErrorBody {
  error?: string;
  message?: string;
  code?: string;
}

let redirectingToLogin = false;

function handleUnauthorized(): never {
  if (
    !redirectingToLogin &&
    typeof window !== 'undefined'
  ) {
    redirectingToLogin = true;
    window.location.assign(
      window.location.origin + LOGIN_PATH
    );
  }

  throw new ApiError('Authentication required.', 401);
}

async function readError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;

  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = null;
  }

  const message =
    body?.error ??
    body?.message ??
    `Request failed with status ${response.status}.`;

  return new ApiError(message, response.status, body?.code);
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
  }

  if (!response.ok) {
    throw await readError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export function apiSend<T>(
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  return apiFetch<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export type QueryValue = string | number | boolean | null | undefined;

/**
 * Serialises a filter object into a query string, dropping empty values so
 * URLs stay readable and the server can apply its own defaults.
 */
export function buildQuery(
  params: object
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    search.set(key, String(value));
  }

  const query = search.toString();

  return query ? `?${query}` : '';
}
