import {
  NextRequest,
  NextResponse,
} from "next/server";

const SESSION_COOKIE_NAME =
  "admin_session";

export function proxy(
  request: NextRequest,
) {
  const pathname =
    request.nextUrl.pathname;

  /*
   * Only protect /admin routes.
   */
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const session =
    request.cookies.get(
      SESSION_COOKIE_NAME,
    )?.value;

  /*
   * No session:
   * send user to login.
   */
  if (!session) {
    const loginUrl =
      new URL(
        "/",
        request.url,
      );

    loginUrl.searchParams.set(
      "error",
      "authentication_required",
    );

    return NextResponse.redirect(
      loginUrl,
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
  ],
};
