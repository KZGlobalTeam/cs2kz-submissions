# Review-queue read: one module for the submissions list and count reads

**Status:** ready-for-agent

## Problem Statement

The submissions list/count reads in `server/queries/list-submissions.ts` (253 lines) are a hand-rolled aggregation that is untested and drift-prone:

- The same `conditions: SQL[]` is rebuilt four times: `listOwnSubmissions` and `countOwnSubmissions` repeat the identical status-owner where-ternary, and `countAllSubmissions` and `listAllSubmissionsForReview` each build the same array. The count guard (`unvotedOnly && userId`) is asymmetric with the list guard (`if (unvotedOnly)`), so count and list can disagree by construction.
- `listAllSubmissionsForReview` — the recent hot spot (course count `9589222`, unvoted filter `a25f5e6`) — runs 4 parallel aggregate queries plus 3 memo Maps (mappers, yes/no vote counts keyed by `approvalDecision`, my-vote, course count) and hand-serializes timestamps to ISO inside the query layer.
- The return shape `ReviewSubmissionRow` is hand-defined in `shared/types/submission.ts` and kept in sync manually; nothing pins it to the assembly that produces it.
- The consumer endpoint `server/api/submissions/index.get.ts` silently degrades invalid `?status=`/`?scope=` values to "no filter" instead of 400 — a typoed filter shows *all* rows.
- Related dead code: `server/services/votes/list-votes.ts` is never imported. `server/queries/submission-details.ts` re-implements the same votes query (without attachments), but that read is live and detail-shaped.
- No spec exists for any query; `server/utils/pagination.ts` (`parsePagination`) is pure and also untested, consumed by every paginated endpoint.

## Solution

One review-queue read module at `server/services/review-queue/` owns all four submissions reads (mine list/count and review-queue list/count), mirroring the ADR-0010 layout: `types.ts` (store seam + filter value), a `createReviewQueueRead(store)` factory, and a `drizzle-store.ts` adapter. The surface is two methods — `getMinePage(filters, bounds)` and `getQueuePage(filters, bounds)` — each running list and count inside against the same filters value. Predicates are one discriminated value (`{ status? } & ({ ownerId } | { unvoted: { userId } })`) resolved by a pure `resolveFilters` consumed by both the Drizzle adapter and the fake store. Row types are derived from the assemblies; the endpoint becomes a thin adapter that 400s invalid `status`/`scope`; `list-submissions.ts` and the unreferenced `list-votes.ts` are deleted. Per-read ordering and the Unreviewed/In review derivation from votes are unchanged (ADR-0007).

## User Stories

1. As a maintainer, I want the list and count reads for any submissions scope to build their SQL from one shared predicate value, so that the count can never disagree with the list about which rows match.
2. As a maintainer, I want the "Unvoted" filter to be impossible to state without the viewer's user id, so that the count/list guard asymmetry cannot regress.
3. As a maintainer, I want the row shapes the queue and mine lists return to be derived from their assemblies, so that the hand-synced interface in shared code is deleted and can never drift.
4. As a maintainer, I want the aggregation (mappers, yes/no tallies, my vote, course count, timestamp serialization) exercised through an in-memory store fake in tests, so that regressions fail in CI without a live database.
5. As an approver, I want the review queue with its status and Unvoted filters to behave exactly as today, so that the rework changes nothing I experience.
6. As a submitting mapper, I want my submissions list to behave exactly as today, so that the rework changes nothing I experience.
7. As an API consumer, I want an invalid `?status=` or `?scope=` to be a 400 rather than silently returning every row, so that a typoed filter can never over-expose rows.
8. As a maintainer, I want the submissions endpoint to become a thin adapter over the module, so that validation and the `PaginatedResult` wire shape live in one place.
9. As a maintainer, I want `server/queries/list-submissions.ts` and the unreferenced `server/services/votes/list-votes.ts` deleted, so that the drifted copies are gone.
10. As a maintainer, I want the review queue page and the release-creation page to keep compiling against the same row shape via type-only imports from the module, so that the rebuild is invisible to the client.

## Implementation Decisions

- **Module shape.** `server/services/review-queue/` with `types.ts` (the `ReviewReadStore` seam, the discriminated filters value, `ResolvedFilters`), `review-queue.ts` (`createReviewQueueRead(store)` factory), and `drizzle-store.ts` (real adapter). Tests live in `tests/server/services/review-queue/` with `fake-review-read-store.ts`, following ADR-0010's store-seam pattern.
- **Surface.** Two methods, `getMinePage(filters, bounds)` and `getQueuePage(filters, bounds)`, each returning `{ items, total }` and running its list and count in parallel internally against the *same* filters value — a caller cannot call list with different predicates than count. The endpoint composes `page`/`pageSize` (wire concern) on top. Today's four exported functions disappear; nothing else imports them.
- **Predicates.** One discriminated value: `{ status?: SubmissionStatus } & ({ ownerId: string } | { unvoted: { userId: string } })`. `unvoted` without its user is a type error. A pure `resolveFilters(value)` yields `{ status?, ownerId?, unvotedUserId? }`; the Drizzle adapter maps it to `and(...)` conditions (the unvoted case keeps the correlated `NOT EXISTS`), and the fake store filters its rows from the same resolved object — one semantic source, enforced identically by real read and test read.
- **Store seam (statement-granular).** `listSubmissionsPage(filters, bounds)`, `countSubmissions(filters)`, `listMappers(submissionIds)`, `countVotesByDecision(submissionIds)`, `listMyVotes(submissionIds, userId)`, `countCourses(submissionIds)`. Aggregation lives in the module: the module stays deep, the adapter stays thin SQL, the fake stays a dumb in-memory table.
- **Assemblies.** Mine: full row with timestamps serialized to ISO plus `voteCount` (total yes+no from `countVotesByDecision`). Queue: the projected row with mappers array, yes/no tallies, myVote precedence, course count, ISO serialization. Ordering fixed per read: queue orders by `approvedAt` desc when the status filter is `approved`, else `createdAt` desc; mine by `createdAt` desc.
- **Row types.** `ReviewSubmissionRow` and `OwnSubmissionRow` are derived from their assemblies in the module (`ReturnType`-style). The hand-synced `ReviewSubmissionRow` interface is deleted from `shared/types/submission.ts`; `pages/review/index.vue` and `pages/releases/new.vue` move to type-only imports from the module path (safe: erased at build). `SubmissionStatus`/`ApprovalDecision` stay in shared.
- **Endpoint adapter.** `index.get.ts` zod-validates `status`/`scope` (400 on invalid, `undefined` when absent); `unvoted` stays the coarse `=== 'true'` flag; `parsePagination` untouched; result shape unchanged (`{ items, total, page, pageSize }`), items typed as `ReviewSubmissionRow` rather than `unknown`.
- **Deletions.** `server/queries/list-submissions.ts` deleted after the endpoint rewire; `server/services/votes/list-votes.ts` deleted (never imported). `server/queries/submission-details.ts` untouched: its votes query is detail-shaped (per-vote rows, approver names, attachments, filters), live via `server/api/submissions/[id].get.ts`, and sharing a votes helper with the queue read would be a shallow pass-through.

## Testing Decisions

- **What makes a good test here:** the filters rule (that `unvoted` requires a user, resolved the same for DB and fake), each assembly against planted store rows (tallying, defaults, myVote precedence, serialization, ordering, bounds, count === filtered items), and the endpoint's parameter validation. Not Drizzle's SQL printing.
- **Seam (one):** the module depends on the narrow `ReviewReadStore` interface; a real adapter maps it onto Drizzle and an in-memory fake implements it, filtering from the same `ResolvedFilters` the adapter consumes. Predicates are pinned at their source via `resolveFilters` (a pure function) rather than by asserting on the SQL AST.
- **Surface tested:** `resolveFilters` variants including the type-level unvoted-requires-user rule; `getMinePage` (owner filter, voteCount) and `getQueuePage` (status filter, unvoted exclusion for a planted user, yes/no tallies, myVote, course count, ISO dates, per-read ordering, limit/offset bounds, total matching the filtered set) against the fake; endpoint adapter 400s for invalid `status`/`scope` and pass-through of absent values.
- **Prior art:** the ADR-0010 fake-store specs (`tests/server/services/review-write/fake-review-write-store.ts`) — same style, no database.

## Out of Scope

- `parsePagination` behavior: its silent fallback stays (shared contract across three endpoints) and it remains untested — a candidate for its own future spec.
- The `getSubmissionDetails` votes query and `server/queries/submission-details.ts` — untouched.
- ADR-0007's derived Unreviewed vs In review: the read derives it from votes exactly as today.
- Migrating `submission-details.ts` or `list-releases.ts` into `server/services/` — future work only if they grow specs.
- Real-database (pg-mem or similar) integration tests; the aggregation and filters are what the fake models, and Postgres-level query plans remain framework facts.

## Further Notes

- Recorded alongside this spec: ADR-0013 records the module decision.
- Implementation is a follow-up session; the work is ordered in `.scratch/review-queue-read/issues/` (02 store/seam → 01 module → 03 endpoint → 04 row types/pages → 05 deletions).
- The unvoted `NOT EXISTS` predicate and the invalid-query-param degradation are folded into this work (issues 02 and 03); validation is endpoint-local by design, so it cannot spread to the shared pagination util.