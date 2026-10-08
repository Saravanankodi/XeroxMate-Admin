export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import {
  getAdminAuth,
} from "@/lib/firebase/admin";

import {
  SESSION_COOKIE_NAME,
} from "@/lib/firebase/auth";

const SESSION_EXPIRES_IN =
  1000 * 60 * 60 * 24 * 5; // 5 days

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();

    const idToken = body?.idToken;

    if (
      typeof idToken !== "string" ||
      !idToken
    ) {
      return NextResponse.json(
        {
          error: "Missing Firebase ID token.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Verify the Firebase ID token first.
     */
    const decoded =
      await getAdminAuth().verifyIdToken(
        idToken,
      );

    /*
     * Only users listed under admins/{uid}
     * are allowed to create an admin session.
     */
    const adminSnapshot =
      await import("@/lib/firebase/admin")
        .then(({ getAdminFirestore }) =>
          getAdminFirestore()
            .collection("admins")
            .doc(decoded.uid)
            .get(),
        );

    if (!adminSnapshot.exists) {
      return NextResponse.json(
        {
          error: "Admin access required.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * Create a server-side session cookie.
     */
    const sessionCookie =
      await getAdminAuth().createSessionCookie(
        idToken,
        {
          expiresIn:
            SESSION_EXPIRES_IN,
        },
      );

    const response =
      NextResponse.json({
        success: true,
      });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,

      value: sessionCookie,

      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax",

      path: "/",

      maxAge:
        SESSION_EXPIRES_IN / 1000,
    });

    return response;
  } catch (error) {
    console.error(
      "Admin session creation failed:",
      error,
    );

    return NextResponse.json(
      {
        error: "Invalid authentication.",
      },
      {
        status: 401,
      },
    );
  }
}

export async function DELETE() {
  const response =
    NextResponse.json({
      success: true,
    });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,

    value: "",

    httpOnly: true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite: "lax",

    path: "/",

    maxAge: 0,
  });

  return response;
}
