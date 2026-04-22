"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { APP_NAME } from "@/lib/constants";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    await signIn("resend", { email, callbackUrl: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ background: "var(--page-bg)" }}>
      <div
        className="w-full max-w-md rounded-2xl p-10"
        style={{ background: "var(--card-bg)", boxShadow: "0 8px 32px rgba(15, 23, 42, 0.06)" }}
      >
        <div className="mb-2">
          <div
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "var(--text-muted-custom)" }}
          >
            Editorial CRM
          </div>
          <h1
            className="mt-1 text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--accent-custom)" }}
          >
            {APP_NAME}
          </h1>
        </div>
        <p className="mb-8 italic font-medium" style={{ color: "var(--text-sub)" }}>
          Sign in to continue curating.
        </p>
        <form onSubmit={handleSubmit}>
          <label
            className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.14em]"
            style={{ color: "var(--text-muted-custom)" }}
          >
            Email
          </label>
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mb-6 w-full rounded-xl px-4 py-3 text-sm font-medium focus:outline-none"
            style={{
              background: "var(--surface-container-low)",
              border: "none",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            disabled={submitted}
            className="w-full rounded-full px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent-custom)" }}
          >
            {submitted ? "Sending..." : "Send magic link"}
          </button>
        </form>
      </div>
    </div>
  );
}
