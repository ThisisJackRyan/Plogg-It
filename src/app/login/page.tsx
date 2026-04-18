"use client";

import PageHeader from "@/components/PageHeader";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <>
      <PageHeader title="Sign in" subtitle="Magic link — no password" />
      <div className="mx-auto max-w-md px-5 py-6">
        {sent ? (
          <div className="rounded-2xl border border-brand/30 bg-brand/5 p-5 text-center">
            <p className="text-sm">
              If <strong>{email}</strong> is valid, a sign-in link is on its way.
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              (Placeholder — Supabase magic link wires up in phase 2.)
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark"
            >
              Send magic link
            </button>
          </form>
        )}
      </div>
    </>
  );
}
