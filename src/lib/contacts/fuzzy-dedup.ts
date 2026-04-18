// Fuzzy contact dedup: layered on top of strict email match.
// - rows with a matched email -> "merge" (reason: "email")
// - rows without an email match -> bucketed (outlet, name first-letter)
//   Levenshtein with early exit on (name) within the bucket.
// Pure module; no dependencies.

export type DedupContact = {
  name: string;
  email?: string | null;
  outlet?: string | null;
};

export type Match = {
  incomingIndex: number;
  matchId: string;
  reason: "email" | "fuzzy-name-outlet";
};

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Nickname / prefix heuristic: handles "Jon" vs "Jonathan" where Levenshtein
// alone is too far to clear a 20%-of-length threshold. Returns true when the
// trailing tokens are identical and the leading token of one is a prefix
// (>=3 chars) of the leading token of the other.
function isPrefixNicknameMatch(a: string, b: string): boolean {
  const ta = a.split(" ");
  const tb = b.split(" ");
  if (ta.length !== tb.length || ta.length < 2) return false;
  // All trailing tokens must match exactly.
  for (let i = 1; i < ta.length; i++) {
    if (ta[i] !== tb[i]) return false;
  }
  const fa = ta[0];
  const fb = tb[0];
  if (fa === fb) return false; // not a nickname diff; Levenshtein covers it
  const short = fa.length < fb.length ? fa : fb;
  const long = fa.length < fb.length ? fb : fa;
  return short.length >= 3 && long.startsWith(short);
}

function levenshtein(a: string, b: string, maxDist: number): number {
  if (Math.abs(a.length - b.length) > maxDist) return Infinity;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return Infinity;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function findFuzzyMatches(
  incoming: DedupContact[],
  existing: Array<DedupContact & { id: string }>,
): Match[] {
  const results: Match[] = [];

  // Email index for strict (short-circuit) matching.
  const byEmail = new Map<string, string>();
  for (const e of existing) {
    const em = norm(e.email);
    if (em) byEmail.set(em, e.id);
  }

  // Bucket existing by (normalised outlet, first letter of normalised name).
  // Empty-name existing entries can't be fuzzy-matched and are skipped.
  const buckets = new Map<string, Array<DedupContact & { id: string }>>();
  for (const e of existing) {
    const nName = norm(e.name);
    if (!nName) continue;
    const key = `${norm(e.outlet)}|${nName.charAt(0)}`;
    const arr = buckets.get(key) ?? [];
    arr.push(e);
    buckets.set(key, arr);
  }

  for (let i = 0; i < incoming.length; i++) {
    const c = incoming[i];

    // 1) Email always wins.
    const em = norm(c.email);
    if (em && byEmail.has(em)) {
      results.push({ incomingIndex: i, matchId: byEmail.get(em)!, reason: "email" });
      continue;
    }

    // 2) Fuzzy by (outlet, name first letter) bucket.
    const cName = norm(c.name);
    if (!cName) continue;
    const key = `${norm(c.outlet)}|${cName.charAt(0)}`;
    const candidates = buckets.get(key);
    if (!candidates || candidates.length === 0) continue;

    const threshold = Math.max(2, Math.floor(cName.length * 0.2));
    for (const cand of candidates) {
      const candName = norm(cand.name);
      const dist = levenshtein(cName, candName, threshold);
      if (dist <= threshold || isPrefixNicknameMatch(cName, candName)) {
        results.push({ incomingIndex: i, matchId: cand.id, reason: "fuzzy-name-outlet" });
        break;
      }
    }
  }

  return results;
}
