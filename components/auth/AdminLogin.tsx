"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase/client";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      /*
       * Authenticate with Firebase.
       */
      const credential =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );

      /*
       * Get a fresh Firebase ID token.
       */
      const idToken =
        await credential.user.getIdToken(
          true,
        );

      /*
       * Exchange the Firebase ID token
       * for our secure HTTP-only admin session.
       */
      const response =
        await fetch(
          "/api/auth/session",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              idToken,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        await signOut(auth);

        throw new Error(
          data?.error ??
            "You are not authorized to access the admin panel.",
        );
      }

      /*
       * The server has now created the
       * admin_session cookie.
       */
      router.replace(
        "/admin/dashboard",
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Admin login failed:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              XeroxMate
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Admin Portal
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Sign in to manage XeroxMate.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                placeholder="admin@example.com"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Signing in..."
                : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
