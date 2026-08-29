# 03: Rewrite the submissions endpoint as a thin adapter with 400s for invalid status/scope

**What to build:** `server/api/submissions/index.get.ts` stops importing the four functions from `server/queries/list-submissions.ts` and becomes a thin adapter over `createReviewQueueRead`: `getMinePage` for `scope=mine`, `getQueuePage` for `scope=all` (still gated by `requireApprover`). `status` and `scope` are zod-validated — 400 on invalid, `undefined` when absent — closing the silent degrade-to-no-filter behavior. `unvoted` stays the coarse `=== 'true'` flag. `parsePagination` is untouched. Result shape unchanged: `{ items, total, page, pageSize } satisfies PaginatedResult<ReviewSubmissionRow>` (items no longer `unknown`).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Endpoint delegates to `getMinePage` / `getQueuePage` with the bound store and composed bounds; no SQL or aggregation left in the endpoint.
- [ ] `scope=all` passes the authenticated approver as the queue-read identity: compose `{ status, viewerId: user.id, ...(unvoted ? { unvoted: { userId: user.id } } : {}) }` (issue 01 added the queue-read `viewerId` — identity, not a predicate, coalesced with the Unvoted user by `resolveFilters` — so `myVote` works on every queue read as today). The conditional spread is important: never send `unvoted: undefined`, the key's presence is what activates the Unvoted branch.
- [ ] Invalid `status` / `scope` values are 400 (zod), absent values are `undefined`; `unvoted` remains `=== 'true'`.
- [ ] `scope=all` remains approver-gated (`requireApprover`); `scope=mine` requires auth as today.
- [ ] `parsePagination` usage and `PaginatedResult` wire shape unchanged; `items` typed as `ReviewSubmissionRow`.
- [ ] Specs for the endpoint's parameter validation (invalid status, invalid scope, absent values, unvoted flag parsing) and that the two scopes route to the right factory method.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.

## Comments