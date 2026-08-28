# Submission content: one module for insert, replace, delete

**Status:** ready-for-agent

## Problem Statement

The three submission write paths duplicate the same responsibilities and split the image lifecycle:

- `update-submission.ts` copies the creator-gate sequence from `delete-submission.ts` — read row inside the transaction → opaque 404 for a non-creator → count votes → `canMutateSubmission` → 409 — so the ADR-0002 mutability contract is written twice and can drift.
- `update-submission.ts` also copies ~70 lines of content persistence from `create-submission.ts`: the 5-column port-authorization projection (`input.isPort ? x : null` over Url/Mime/Width/Height/SizeBytes) and the mapper, course, and per-course-mapper insert loops.
- The image lifecycle is split: stale-image cleanup runs post-commit in update and delete only, and a write that fails after uploads orphans images. Uploads persist immediately at `/api/uploads/*` under fresh UUID keys, and there is no course or port-image delete endpoint — nothing client-reachable can clean an orphan up.
- The workshop-URL rule lives three ways: the shared `SubmissionInputSchema` accepts any string, `assertWorkshopId` throws a raw `Error` (→ 500) on an unparseable URL, and the client form enforces the real rule in its own copy.
- The delete endpoint branches on an inline `user.roles.includes('lead_approver')` for the lead's unrestricted cleanup capability — a deliberate capability switch that deserves a name.

Recorded as ADR-0011. The ADR-0002 contract is unchanged.

## Solution

One submission-content module owns the three operations — **insert**, **replace**, **delete** — behind one guarded-write spine on one persistence seam, mirroring the review-write module's shape (factory + injected deps, a Drizzle store adapter, an in-memory fake for tests):

- **Guard placement (ADR-0002, unchanged):** the spine re-reads the row inside the transaction; missing *and* non-creator map to the same opaque 404; `canMutateSubmission` runs inside the transaction (owner path). The lead approver's unrestricted delete passes no owner and skips the gate.
- **Belt-and-braces (new for replace):** the content update targets the just-verified row; a zero-row match rolls the whole transaction back with the 409 — the same pattern the review-write module added to finalize.
- **One content write:** the ~70 duplicated lines become one internal helper shared by insert and replace.
- **Image lifecycle in full:** post-commit stale-image cleanup on replace; post-commit full sweep on delete (course images, port-authorization image, vote/decision attachment objects — unchanged); **and orphan compensation on failed writes** — when insert or replace fails mid-transaction after uploads, best-effort delete of the body's upload URLs that no persisted row references. Fresh UUID keys make the diff safe; carried-over edit URLs are still referenced and excluded. Best-effort, like post-commit cleanup.
- **Workshop-URL rule on the wire shape:** the client's stricter rule (a `steamcommunity.com` workshop/sharedfiles filedetails URL with a numeric `id`) becomes a refine on `SubmissionInputSchema` → invalid URLs die at 400 at endpoint parse; `assertWorkshopId` becomes an internal happy-path derivation mapped to 400 (not a raw-Error 500); `extractWorkshopId` stays tolerant for legacy rows.
- **Endpoints stay thin:** parse-and-delegate adapters; the inline `lead_approver` check becomes a named predicate (`hasLeadApproverRole`) mirroring `hasApproverRole`.

## User Stories

1. As a maintainer, I want the mutability contract (ADR-0002) written once, inside the write transaction, for all three submission write paths, so that the gate semantics cannot drift.
2. As a maintainer, I want insert and replace to share one content-write implementation, so that the port-authorization projection and the mapper/course insert loops are written once.
3. As a submitter whose save races an approver's vote, I want my replace to fail with a 409 and write nothing when the row moved between the read and the write, so that the ADR-0002 window is as narrow as the review spine's.
4. As a maintainer, I want a write that fails after uploads to remove the images only that failed write introduced, so that failed submissions do not accumulate orphaned objects in the public bucket.
5. As a maintainer, I want delete to keep sweeping every image of the submission (including vote/decision attachment objects) post-commit, unchanged from today.
6. As a submitter, I want an invalid workshop URL rejected with a 400 at the endpoint — never a 500 — and the rule defined once on the shared wire shape.
7. As a lead approver, I want my unrestricted delete capability preserved, expressed as a named predicate.
8. As a developer, I want all three operations driven through the module interface with an in-memory fake store, so that gate placement, rollback, and both compensation directions are tested without a live database.

## Out of Scope

- Any change to the ADR-0002 contract (owner, `pending`, zero votes, gate inside the write transaction, lead path unrestricted).
- Back-filling pre-change orphaned uploads (ADR-0002).
- Unifying the client form's workshop-URL and map-name validation onto the shared schema — a separate follow-on ticket.
- The review side (votes, decisions, finalize) — already consolidated in the review-write module.