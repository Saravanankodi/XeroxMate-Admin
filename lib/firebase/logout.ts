"use client";

import { signOut } from "firebase/auth";

import { auth } from "@/lib/firebase/client";

export async function logoutAdmin() {
  try {
    /*
     * Remove the server session first.
     */
    await fetch(
      "/api/auth/logout",
      {
        method: "POST",
      },
    );
  } finally {
    /*
     * Also remove the Firebase client session.
     */
    await signOut(auth);
  }

  window.location.href = "/";
}
