# 03: Rewrite the submissions endpoint as a thin adapter with 400s for invalid status/scope

**What to build:** `server/api/submissions/index.get.ts` stops importing the four functions from `server/queries/list-submissions.ts` and becomes a thin adapter over `createReviewQueueRead`: `getMinePage` for `scope=mine`, `getQueuePage` for `scope=all` (still gated by `requireApprover`). `status` and `scope` are zod-validated — 400 on invalid, `undefined` when absent — closing the silent degrade-to-no-filter behavior. `unvoted` stays the coarse `=== 'true'` flag. `parsePagination` is untouched. Result shape unchanged: `{ items, total, page, pageSize } satisfies PaginatedResult<ReviewSubmissionRow>` (items no longer `unknown`).

**Blocked by:** 01

**Status:** resolved

- [x] Endpoint delegates to `getMinePage` / `getQueuePage` with the bound store and composed bounds; no SQL or aggregation left in the endpoint.
- [x] `scope=all` passes the authenticated approver as the queue-read identity: compose `{ status, viewerId: user.id, ...(unvoted ? { unvoted: { userId: user.id } } : {}) }` (issue 01 added the queue-read `viewerId` — identity, not a predicate, coalesced with the Unvoted user by `resolveFilters` — so `myVote` works on every queue read as today). The conditional spread is important: never send `unvoted: undefined`, the key's presence is what activates the Unvoted branch.
- [x] Invalid `status` / `scope` values are 400 (zod), absent values are `undefined`; `unvoted` remains `=== 'true'`.
- [x] `scope=all` remains approver-gated (`requireApprover`); `scope=mine` requires auth as today.
- [x] `parsePagination` usage and `PaginatedResult` wire shape unchanged; `items` typed as `ReviewSubmissionRow`.
- [x] Specs for the endpoint's parameter validation (invalid status, invalid scope, absent values, unvoted flag parsing) and that the two scopes route to the right factory method.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.

## Answer

Implemented. `server/api/submissions/index.get.ts` is now a thin adapter over the review-queue read module: `createSubmissionsIndexHandler(deps)` validates `status`/`scope` (zod enum, 400 on invalid, `undefined`/default `'mine'` when absent, checked *before* any auth or read call), keeps `unvoted` as the coarse `=== 'true'` flag, composes `{ status, viewerId: user.id, ...(unvoted ? { unvoted: { userId: user.id } } : {}) }` for the queue read (the conditional spread never sends `unvoted: undefined` — the key is what `resolveFilters` switches on), and routes `scope=all` → `getQueuePage` (approver-gated) / `scope=mine` → `getMinePage` (auth-gated) with the untouched `parsePagination` bounds. The result wire shape is unchanged, with `items` typed `ReviewSubmissionRow` (queue) / `OwnSubmissionRow` (mine) instead of `unknown`. The only imports of `server/queries/list-submissions` are gone from the endpoint; that file and the shared row interface are deleted by issues 05 and 04.

Two support changes were needed to make the endpoint spec-honest, because the ticket's required specs must import the endpoint file itself: the default export wires the Drizzle store lazily via `defineLazyEventHandler` (never at module import — eager wiring would call `db()` and need the runtime config), and `vitest.config.ts` gains a `#imports` alias to `tests/fixtures/nuxt-imports.ts` (a minimal stub of Nuxt's virtual module — absent under plain vitest — which `server/utils/config.ts` is the only repo consumer of). The factory takes the read module plus the two auth gates as injected deps (the review-write/release-contents deps style), so the specs drive fakes with no `vi.mock` at all.

Specs (`tests/server/api/submissions/index.get.spec.ts`, 8 tests): invalid status / invalid scope 400 before any auth or read call; absent status → `undefined` and absent scope → mine default; `unvoted` exactly `=== 'true'` adds the unvoted user, while `false`/absent leaves the key *absent*; `scope=all` routes to `getQueuePage` with the approver as `viewerId` and is approver-gated (not auth-gated); `scope=mine` routes to `getMinePage`, auth-gated, and ignores the unvoted flag entirely; the status filter composes into the delegated read; and the `PaginatedResult` wire shape plus `parsePagination` handling (page 2/pageSize 10 → `{ limit: 10, offset: 10 }`) is unchanged. `pnpm lint` (0 errors), `pnpm typecheck`, `pnpm test` (210 passed), `pnpm build` all pass.

## Comments

- Review (two-axis, both OK with notes, no blockers): the status/scope validation cascades share a shape (standards P2 judgement call) — deliberately left inline, the ADR-0013 endpoint stays explicit and two instances don't earn an indirection. The `#imports` fixture's return type is a hand-mirror of `nuxt.config.ts` (standards P2) — accepted and documented in the stub; nothing calls through it in specs. Spec axis confirmed zero missing/extra/wrong behaviour and that the vitest alias + fixture are required scaffolding for the mandated endpoint specs. Reviewer's residual note — add a spec that `unvoted=true` is ignored on `scope=mine` — closed in the final commit.
- `store` note: the queue filters reached from the endpoint (three queue branches incl. `viewerId`) reflects issue 01's signed-off extension; ADR-0013's prose still names the older two-branch form — documentation drift out of ticket 03's scope.

## Comments