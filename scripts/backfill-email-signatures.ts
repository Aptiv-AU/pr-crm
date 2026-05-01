/**
 * One-off backfill for M-2 (signature sanitiser dropped `style` from the
 * allow-list). Forces resolveStyle on every EmailAccount so each row's
 * stored `signatureHtml` reflects the current sanitiser. Without this,
 * the first send after the M-2 deploy strips inline styles from the saved
 * scrape on the way out — recipients see an uglier signature once,
 * the next refresh cleans it up.
 *
 * Run:  npx tsx scripts/backfill-email-signatures.ts
 *
 * Optional flags:
 *   --dry        list the accounts that would be touched, don't write.
 *   --account=ID only refresh that one account id.
 *
 * Failures are reported per-account and don't abort the run — a Gmail
 * account whose refresh token expired will simply log + continue.
 */
import { db } from "@/lib/db";
import { resolveStyle } from "@/lib/compose/resolve-style";

type Args = { dry: boolean; accountId: string | null };

function parseArgs(argv: string[]): Args {
  const dry = argv.includes("--dry");
  const accountArg = argv.find((a) => a.startsWith("--account="));
  const accountId = accountArg ? accountArg.slice("--account=".length) : null;
  return { dry, accountId };
}

async function main() {
  const { dry, accountId } = parseArgs(process.argv.slice(2));

  const accounts = await db.emailAccount.findMany({
    where: accountId ? { id: accountId } : undefined,
    select: {
      id: true,
      email: true,
      provider: true,
      signatureSource: true,
      styleResolvedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(
    `[backfill] ${accounts.length} EmailAccount row${accounts.length === 1 ? "" : "s"}${
      dry ? " (dry run)" : ""
    }`
  );

  let ok = 0;
  let failed = 0;

  for (const acct of accounts) {
    const prefix = `[${acct.email} / ${acct.provider}]`;
    if (dry) {
      console.log(
        `${prefix} would resolveStyle (last resolved: ${
          acct.styleResolvedAt?.toISOString() ?? "never"
        }, source: ${acct.signatureSource ?? "—"})`
      );
      continue;
    }
    try {
      await resolveStyle(acct.id, { force: true });
      ok += 1;
      console.log(`${prefix} ok`);
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${prefix} failed — ${msg}`);
    }
  }

  if (!dry) {
    console.log(`[backfill] done: ok=${ok} failed=${failed}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill] fatal:", err);
    process.exit(1);
  });
