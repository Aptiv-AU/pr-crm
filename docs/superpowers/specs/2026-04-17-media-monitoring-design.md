# Media Monitoring Module — Design

Date: 2026-04-17
Status: Design for approval (pre-plan)

## 1. Why

Mention and Brand24 — the closest SMB-priced monitoring tools — bottom out at ~$299/mo for modest keyword allowances, which prices out Pressroom's target buyer (solo consultants and 2–50-seat boutique agencies). The major PR CRMs either bundle monitoring at enterprise pricing (Cision, Meltwater) or do not include it at all (Prezly, BuzzStream).

At boutique volumes (~5–20 keywords per workspace, daily-to-weekly cadence), free or near-free data sources can cover ~80% of the PR-relevant surface. No competitor assembles these cleanly for this buyer. Additionally, Pressroom owns a data asset none of them do: the outreach-to-contact graph, which enables auto-attribution of earned coverage back to the pitch that produced it. This is the wedge.

## 2. Goals

1. **Brand/client mention alerts** across news, key social platforms, and LLM answers
2. **Auto-attribution** of new mentions to outreach that plausibly produced them — one-click confirm creates a `Coverage` record linked to the Campaign, Contact, and Outreach
3. **Generative-AI visibility tracking** — weekly snapshot of whether client is mentioned by Claude/GPT/Perplexity in response to industry-relevant questions
4. **Priced under $99/mo as an add-on** — marginal cost per workspace under $60/mo at realistic volumes
5. **No lock-in** — users can export mentions and keyword config at any time

Non-goals (v1):
- Real-time alerts (sub-minute). Daily/weekly is sufficient for boutique PR workflows.
- Broadcast TV/radio monitoring. Too expensive; partner later if demand appears.
- X/Twitter at scale. API pricing ($200/mo Basic) makes it uneconomic; optional paid pass-through only.
- Sentiment scoring beyond a 3-way (positive/neutral/negative) LLM tag.

## 3. Data sources

| Source | Cost | Covers | Notes |
|---|---|---|---|
| GDELT 2.0 | Free | Global news, 15-min delay | Primary. Commercial use OK. Rich metadata. |
| Google News RSS | Free | News, near-realtime | Secondary. Rate-limit risk; treat as best-effort. |
| Reddit API | Free | Threads, comments | Generous tier. Meaningful for PR signals. |
| Hacker News (Algolia) | Free | Tech news discussion | Useful for B2B/tech PR clients. |
| Bluesky API | Free | Posts | Growing; complements X absence. |
| Mastodon | Free | Posts | Low signal but free. |
| YouTube Data API | Free tier | Video mentions | Quota-limited; only for high-value keywords. |
| NewsData.io | ~$199/mo | News, global | **Optional paid fallback**, shared across workspaces (amortised cost per workspace ~$5–15). Not in v1; add if GDELT+RSS coverage proves thin. |
| X/Twitter API | $200/mo Basic | Social posts | **Not in v1.** Optional paid pass-through later. |

## 4. Architecture

### Prisma models

```prisma
model MonitoringKeyword {
  id          String   @id @default(cuid())
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id])
  term        String
  kind        MonitoringKeywordKind  // brand | product | executive | competitor | domain
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  mentions    Mention[]

  @@index([clientId, enabled])
}

model Mention {
  id             String   @id @default(cuid())
  keywordId      String
  keyword        MonitoringKeyword @relation(fields: [keywordId], references: [id])
  sourceType     MentionSource    // gdelt | google_news | reddit | hn | bluesky | mastodon | youtube | newsdata
  url            String   @unique
  canonicalUrl   String?  // after dedup normalization
  outletDomain   String?
  title          String
  snippet        String?
  author         String?
  publishedAt    DateTime?
  ingestedAt     DateTime @default(now())
  relevanceScore Float?   // 0–1 from LLM filter
  sentiment      Sentiment?  // positive | neutral | negative
  status         MentionStatus  // new | dismissed | converted
  rawPayload     Json?

  attributions   MentionAttribution[]

  @@index([keywordId, publishedAt])
  @@index([outletDomain])
}

model MentionAttribution {
  id           String   @id @default(cuid())
  mentionId    String
  mention      Mention  @relation(fields: [mentionId], references: [id])
  outreachId   String?
  outreach     Outreach? @relation(fields: [outreachId], references: [id])
  contactId    String?
  contact      Contact? @relation(fields: [contactId], references: [id])
  campaignId   String?
  campaign     Campaign? @relation(fields: [campaignId], references: [id])
  coverageId   String?  // filled when user confirms
  coverage     Coverage? @relation(fields: [coverageId], references: [id])
  confidence   Float    // 0–1
  reasoning    String?  // human-readable explanation
  status       AttributionStatus  // proposed | confirmed | rejected
  createdAt    DateTime @default(now())
  resolvedAt   DateTime?
}

model GenerativeCheck {
  id              String   @id @default(cuid())
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id])
  model           String   // claude-opus-4-7 | gpt-5 | perplexity-sonar
  question        String
  questionTag     String   // "category awareness" | "best-in-class" | "problem solution"
  response        String
  clientMentioned Boolean
  rankInResponse  Int?     // 1-based; null if not mentioned
  sentiment       Sentiment?
  citationCount   Int?
  citedUrls       String[]
  ranAt           DateTime @default(now())

  @@index([clientId, ranAt])
}
```

### Worker topology

All workers run on Vercel Cron or a queue (use Vercel Queues where durable retry matters).

- **`ingest-gdelt`** — every 15 min. For each enabled keyword, query GDELT Doc API, upsert new Mentions by URL.
- **`ingest-google-news`** — every 30 min. RSS per keyword, upsert.
- **`ingest-reddit`** — every 30 min. Reddit search API per keyword.
- **`ingest-hn`** — hourly. Algolia search per keyword.
- **`ingest-bluesky`** — every 30 min. Search API per keyword.
- **`ingest-mastodon`** — hourly. Search across a curated instance list.
- **`filter-mentions`** — every 5 min. Picks up new Mentions with `relevanceScore IS NULL`, batches, calls Claude Haiku with a relevance+sentiment prompt, writes scores.
- **`attribute-mentions`** — every 5 min. Picks up new Mentions with score > 0.5 and `outletDomain IS NOT NULL`, runs the attribution engine, creates `MentionAttribution` rows.
- **`generative-check`** — weekly per client. Runs question templates against configured models, writes `GenerativeCheck` rows.
- **`digest-email`** — daily (user-configurable). Summarises new mentions and attributions per client, emails to workspace owner.

### Attribution engine

For each new `Mention` with relevance > threshold:

1. **Outlet match** — normalize `outletDomain` from URL; find all `Contact` rows with matching `outlet` domain for the Client owning the keyword.
2. **Outreach match** — for each matched Contact, find `Outreach` rows sent in the past 60 days for an active Campaign on the same Client.
3. **Confidence scoring** — combine:
   - Recency (outreach sent ≤7d = 0.4, ≤30d = 0.25, ≤60d = 0.1)
   - Outlet-domain exact match (0.3)
   - Campaign brief keywords appearing in Mention title/snippet (0.2 LLM-judged)
   - Contact name appearing as `author` in mention (0.1)
4. **Propose** — for any candidate with confidence ≥ 0.4, create a `MentionAttribution` row with status `proposed`.
5. **UI surfaces** it in a "Proposed coverage" tray. User confirms → create `Coverage` record linked to Campaign + Contact; update `MentionAttribution.status = confirmed`, `coverageId = <new>`. Reject → `rejected`.

### Dedup and canonicalization

- Normalize URLs: strip UTM and common tracking params, resolve redirects, lowercase host.
- `@@unique` on `Mention.url` prevents raw dupes.
- `canonicalUrl` field enables cross-source dedup (e.g., same article appearing in both GDELT and Google News).
- Run canonicalization in `filter-mentions` worker; if a mention with the same `canonicalUrl` already exists for the same keyword, mark the new row `status = dismissed` (duplicate).

### LLM relevance filter

Single Claude Haiku call per mention, using prompt caching on a shared system prompt:

> System: You are a PR mention classifier. Given a brand/keyword and a news/social snippet, return JSON: `{ relevant: boolean, confidence: 0-1, sentiment: "positive"|"neutral"|"negative", reasoning: string }`. Filter out coincidental name matches, namesakes, and unrelated contexts.

Cached system prompt + per-mention user prompt keeps per-call cost below $0.001 at Haiku pricing. At 5K mentions/month per workspace (generous), filter cost is ~$5/mo/workspace.

### Generative-AI visibility

Per client:
- **Question templates** — 8 questions per industry, combining "who are the best X companies?", "how do I solve Y problem?", "what is Z brand known for?". User can add custom questions. Ship with industry-tagged defaults (saas, retail, food-bev, agency, etc.).
- **Models** — Claude Opus latest, GPT-5, Perplexity Sonar Pro. User can enable/disable each.
- **Cron** — weekly per client × per enabled model × per enabled question. Small batch (24 prompts/week at defaults per client).
- **Extraction** — second LLM pass to extract: was client mentioned, rank order among brands listed, sentiment, citation URLs.
- **Cost** — ~$10–40/mo/workspace depending on question volume and models enabled.

## 5. UI surfaces

Add two new routes under `(app)`:

- **`/monitoring`** — workspace-level inbox. Table of new mentions with source badge, relevance score, client, keyword, snippet, quick-actions (dismiss, create coverage, view attribution). Filters: client, source, date range, status.
- **`/monitoring/settings`** — per-client keyword management. CRUD for `MonitoringKeyword`. Source toggles (Reddit on, Bluesky off, etc). Digest frequency.

Add tabs:
- **Client workspace → "Monitoring"** — mentions scoped to one client; stats (count, sentiment mix, top outlets).
- **Client workspace → "AI Visibility"** — GenerativeCheck results with trend chart over time (mention rate %, rank, sentiment). Per-model breakdown.
- **Campaign → "Coverage" tab** — surface `MentionAttribution` proposals inline above manually-added coverage. "Accept proposed coverage" creates Coverage record in-place.

## 6. Pricing model

- Monitoring is a paid add-on to the base plan. Target price $49–99/mo per workspace.
- Included: 20 keywords, 5K mentions/month, all free sources, AI visibility weekly on 3 models × default question set.
- Overages: +$10 per 5 additional keywords; +$0.005 per mention over the cap (rare at boutique volumes).
- Paid passthroughs (X/Twitter, NewsData.io) billed at cost + 20% if user opts in.

Marginal cost per workspace (LLM + infra): estimated $15–55/mo. Target contribution margin ≥ 40%.

## 7. Phasing

**Phase 1 — "wedge MVP" (2 weeks):**
- Schema + migrations
- GDELT + Google News ingestion
- LLM relevance filter
- Attribution engine
- `/monitoring` inbox UI
- Campaign coverage tab integration

**Phase 2 — "breadth" (1–2 weeks):**
- Reddit + HN + Bluesky ingestion
- Mastodon + YouTube
- Digest email
- Per-client monitoring tab with stats

**Phase 3 — "AI visibility" (1–2 weeks):**
- GenerativeCheck schema + cron
- Question template library (industry-tagged defaults)
- AI Visibility tab + trend chart

**Phase 4 — "optional paid sources" (defer until needed):**
- NewsData.io fallback
- X/Twitter passthrough

Total v1 (Phases 1–3): ~4–6 weeks focused work.

## 8. Risks and open questions

### Risks
- **GDELT lag / coverage gaps** — may need paid fallback sooner than Phase 4 for some industries.
- **Google News RSS reliability** — they rate-limit aggressively. Mitigate by rotating user-agents and falling back to GDELT for the same query when blocked.
- **Attribution false positives** — wrong confirmations pollute Coverage data. Mitigate with high confidence threshold (≥0.5), always require user confirm, and track rejection rate per workspace to tune.
- **LLM cost blowout** — if mention volume spikes, filter cost scales. Mitigate with daily workspace cost caps + prompt caching on system prompt.
- **GDELT licensing** — free for commercial use per their policy, but attribution required; surface "Powered by GDELT" in UI where mentions are shown.

### Open questions (to resolve in the plan)
1. **Cron host** — Vercel Cron is fine for Phase 1 but won't handle per-5-min workers at scale. When do we move to Vercel Queues?
2. **Keyword scope** — workspace-level competitor sets shared across clients, or strictly per-client? (Recommendation: per-client only in v1; revisit if agencies ask.)
3. **Digest cadence default** — daily per client, or weekly per workspace? (Recommendation: weekly per client, user-overridable.)
4. **Attribution auto-confirm** — always require manual confirm, or auto-confirm above ≥0.85 confidence? (Recommendation: always manual in v1 — earn trust first. Revisit post-launch.)
5. **AI visibility question library** — ship default industries, let users write custom, or both? (Recommendation: both; seed 6 industries; allow custom per client.)
6. **Sentiment granularity** — 3-way is proposed. Do we want numeric scores for trend charts? (Recommendation: 3-way for UI; store raw LLM confidence for future use.)
7. **Data retention** — how long to keep Mention rows for non-converted mentions? (Recommendation: 12 months; then archive/drop, keep aggregates.)

## 9. Success criteria (v1)

- A user can add 5 keywords for a client, receive relevant mentions within 1 hour of ingestion, and convert one into a Coverage record in under 30 seconds of clicks.
- Attribution engine proposes a correct Coverage link for ≥40% of genuine earned-media events where outreach was sent (measured on Scott's own workflow over 30 days).
- Marginal LLM + infra cost per workspace stays under $55/mo at default plan usage.
- Generative-AI visibility trend chart shows month-over-month change for at least one client across at least two models.

## 10. What this unlocks commercially

- A concrete pitch: "We're $49/mo cheaper than Brand24, include auto-attribution nobody else has, and give you LLM visibility tracking Muck Rack charges enterprise for."
- Monitoring becomes the feature that justifies moving a current-Cision or current-Mention customer — not just a table-stakes add-on, but a demonstrably better product for the boutique PR workflow.
- Pressroom stops being "cheaper Prowly" and becomes "the only PR CRM that closes the outreach-to-coverage loop."
