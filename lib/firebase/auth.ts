import "server-only";

import { cookies } from "next/headers";

import {
  getAdminAuth,
  getAdminFirestore,
} from "@/lib/firebase/admin";

const SESSION_COOKIE_NAME = "admin_session";

export interface AuthenticatedAdmin {
  uid: string;
  email: string | null;
  admin: Record<string, unknown>;
}

/**
 * Verifies the Firebase ID token supplied by the browser.
 */
export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<AuthenticatedAdmin> {
  if (!idToken) {
    throw new Error("Authentication required.");
  }

  const decodedToken =
    await getAdminAuth().verifyIdToken(idToken);

  const uid = decodedToken.uid;

  const adminSnapshot =
    await getAdminFirestore()
      .collection("admins")
      .doc(uid)
      .get();

  if (!adminSnapshot.exists) {
    throw new Error("Admin access required.");
  }

  return {
    uid,
    email: decodedToken.email ?? null,
    admin:
      (adminSnapshot.data() as Record<string, unknown>) ??
      {},
  };
}

/**
 * Verifies the server-side admin session cookie.
 */
export async function requireAdmin(): Promise<AuthenticatedAdmin> {
  const cookieStore = await cookies();

  const sessionCookie =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!sessionCookie) {
    throw new Error("Authentication required.");
  }

  const decoded =
    await getAdminAuth().verifySessionCookie(
      sessionCookie,
      true,
    );

  const adminSnapshot =
    await getAdminFirestore()
      .collection("admins")
      .doc(decoded.uid)
      .get();

  if (!adminSnapshot.exists) {
    throw new Error("Admin access required.");
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    admin:
      (adminSnapshot.data() as Record<string, unknown>) ??
      {},
  };
}

export { SESSION_COOKIE_NAME };
