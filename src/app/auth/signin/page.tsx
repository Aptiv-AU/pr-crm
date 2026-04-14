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
    await signIn("resend", { email, callbackUrl: "/workspaces" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--page-bg)" }}>
      <div className="w-full max-w-sm rounded-xl p-8" style={{ background: "var(--card-bg)", border: "1px solid var(--border-custom)" }}>
        <h1 className="mb-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {APP_NAME}
        </h1>
        <p className="mb-6 text-sm" style={{ color: "var(--text-sub)" }}>
          Sign in with your email to continue
        </p>
        <form onSubmit={handleSubmit}>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted-custom)" }}>
            Email
          </label>
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mb-4 w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-custom)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            disabled={submitted}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent-custom)" }}
          >
            {submitted ? "Sending..." : "Send magic link"}
          </button>
        </form>
      </div>
    </div>
  );
}
