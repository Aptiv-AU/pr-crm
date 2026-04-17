import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EmailStyleManager } from "@/components/settings/email-style-manager";

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const emailAccount = await db.emailAccount.findFirst({
    select: {
      id: true,
      email: true,
      provider: true,
      createdAt: true,
      signatureHtml: true,
      signatureSource: true,
      fontFamily: true,
      fontSize: true,
      styleResolvedAt: true,
    },
  });

  const providerLabel =
    emailAccount?.provider === "google" ? "Google Gmail" : "Microsoft Outlook";

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/settings"
          className="text-[12px]"
          style={{ color: "var(--text-sub)", textDecoration: "none" }}
        >
          ← Settings
        </Link>
      </div>

      <h1
        className="text-[22px] font-bold"
        style={{ color: "var(--text-primary)", marginBottom: 4 }}
      >
        Email Account
      </h1>
      <p
        className="text-[13px]"
        style={{ color: "var(--text-sub)", marginBottom: 24 }}
      >
        Connect a mailbox to send pitches directly. Messages send from your
        address and appear in your Sent folder.
      </p>

      {emailAccount ? (
        <div
          style={{
            padding: 20,
            border: "1px solid var(--border-custom, #e5e7eb)",
            borderRadius: 10,
          }}
        >
          <div
            className="text-[14px] font-medium"
            style={{ color: "var(--text-primary)", marginBottom: 4 }}
          >
            {emailAccount.email}
          </div>
          <div
            className="text-[12px]"
            style={{ color: "var(--text-sub)", marginBottom: 2 }}
          >
            {providerLabel}
          </div>
          <div
            className="text-[12px]"
            style={{ color: "var(--text-muted-custom)" }}
          >
            Connected{" "}
            {new Date(emailAccount.createdAt).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>

          <EmailStyleManager
            accountId={emailAccount.id}
            signatureHtml={emailAccount.signatureHtml}
            signatureSource={emailAccount.signatureSource}
            fontFamily={emailAccount.fontFamily}
            fontSize={emailAccount.fontSize}
            styleResolvedAt={
              emailAccount.styleResolvedAt
                ? emailAccount.styleResolvedAt.toISOString()
                : null
            }
          />
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href="/api/email/connect"
            className="inline-flex items-center justify-center rounded-[7px] font-medium whitespace-nowrap cursor-pointer transition-opacity hover:opacity-80 h-[34px] px-[14px] text-[13px] gap-[6px]"
            style={{
              backgroundColor: "var(--accent-custom)",
              color: "#fff",
              border: "1px solid var(--accent-custom)",
              textDecoration: "none",
            }}
          >
            Connect Outlook
          </a>
          <a
            href="/api/email/google/connect"
            className="inline-flex items-center justify-center rounded-[7px] font-medium whitespace-nowrap cursor-pointer transition-opacity hover:opacity-80 h-[34px] px-[14px] text-[13px] gap-[6px]"
            style={{
              backgroundColor: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border-custom, #d1d5db)",
              textDecoration: "none",
            }}
          >
            Connect Gmail
          </a>
        </div>
      )}
    </div>
  );
}
