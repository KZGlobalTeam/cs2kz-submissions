# 02: ReviewReadStore seam, discriminated filters value, resolveFilters, Drizzle adapter, and fake store

**What to build:** The seam the module (issue 01) and the endpoint (issue 03) stand on. `server/services/review-queue/types.ts` defines: the statement-granular `ReviewReadStore` interface (`listSubmissionsPage(filters, bounds)`, `countSubmissions(filters)`, `listMappers(submissionIds)`, `countVotesByDecision(submissionIds)`, `listMyVotes(submissionIds, userId)`, `countCourses(submissionIds)`); the discriminated filters value `{ status?: SubmissionStatus } & ({ ownerId: string } | { unvoted: { userId: string } })`; and the pure `ResolvedFilters` shape `{ status?, ownerId?, unvotedUserId? }`. A pure `resolveFilters(filters)` produces the `ResolvedFilters`. `server/services/review-queue/drizzle-store.ts` maps `ResolvedFilters` to `and(...)` conditions — including the correlated `NOT EXISTS` for unvoted — for list and count. `tests/server/services/review-queue/fake-review-read-store.ts` implements the store in memory, filtering its rows from the *same* `ResolvedFilters`. Specs pin `resolveFilters` variants and the type-level rule that `unvoted` cannot exist without its user.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `ReviewReadStore` interface with the six statement-granular methods; filters and bounds flow through as data, not SQL fragments.
- [x] Discriminated filters value: `{ status? } & ({ ownerId } | { unvoted: { userId } })` — `unvoted` without its user is a type error.
- [x] Pure `resolveFilters(filters)` → `{ status?, ownerId?, unvotedUserId? }`; consumed by both the Drizzle adapter and the fake so the rule is enforced identically.
- [x] `drizzle-store.ts` adapter: list page (+limit/offset), count, mappers, votes grouped by `approvalDecision`, my votes for a user, course counts; unvoted as the correlated `NOT EXISTS`; per-read ordering applied by the module (issue 01), not the adapter.
- [x] `fake-review-read-store.ts` filtering rows from `ResolvedFilters` (owner match, unvoted = no vote row from that user), planted aggregates keyed by submission id.
- [x] Specs: `resolveFilters` for status-only, owner, unvoted (and absence of each), plus a type-level assertion that `{ unvoted: true }` without `userId` does not typecheck.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.

## Answer

Implemented in commit `7b1ae83`. `server/services/review-queue/types.ts` defines the statement-granular `ReviewReadStore` seam (list page, count, mappers, votes grouped by decision, my votes, course counts) and the discriminated filters value `{ status? } & ({ ownerId: string } | { unvoted?: { userId: string } })`, with the pure `resolveFilters` producing the flat `ResolvedFilters` both the adapter and the fake consume — one semantic source, enforced identically against the real database and in tests. `drizzle-store.ts` is the thin SQL adapter: `and(...)` conditions from the resolved filters, the correlated `NOT EXISTS` for unvoted, grouped vote/course aggregates, and the page window as one ORDER BY + LIMIT/OFFSET statement. `tests/server/services/review-queue/fake-review-read-store.ts` filters its in-memory rows from the same resolved filters.

Two documented deviations from the ticket text: (1) `unvoted` is optional (`{ unvoted?: { userId } }`) rather than required, so the bare `{ status? }` queue read without the Unvoted filter stays expressible — the pinned rule holds, `{ unvoted: true }` without a user is still a type error, pinned by `@ts-expect-error` in the specs; (2) per-read ordering flows to the store as data (`PageBoundsWithOrder.orderBy`, descending, nulls last) — the module (issue 01) picks the clock column, the adapter never does, and pagination cannot drift between the real store and the fake.

Tests: `resolve-filters.spec.ts` (7 cases incl. the type-level rule) and `fake-review-read-store.spec.ts` (14 cases: owner/status/unvoted filtering, sort-before-clip bounds, per-orderBy sorting, planted mappers/votes/courses aggregates, count === filtered list). `pnpm lint` (0 errors), `pnpm typecheck`, `pnpm test` (186 passed), and `pnpm build` all pass. The module factory (issue 01) and endpoint adapter (issue 03) stand on this seam.