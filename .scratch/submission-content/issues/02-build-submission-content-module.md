# 02: Build the submission-content module (insert, replace, delete on one spine)

**Type:** task

**What to build:** One module at `server/services/submission-content/` mirroring the review-write module's shape (`server/services/review-write/`): a `types.ts` declaring the narrow store/deps interfaces and record shapes, a `save-submission-content.ts`-style factory `createSubmissionContentService(deps)` with injected `{ runTransaction, deleteStorageObjects }`, a `drizzle-store.ts` adapter binding the real transaction client, an `index.ts` exposing bound entry points (`createSubmission`, `updateSubmission`, `deleteSubmission` — keep the existing names), and the in-memory fake + specs driving all three operations through the interface.

The guarded-write spine owns: re-read the row inside the transaction; missing *and* non-creator → the same opaque 404; `canMutateSubmission({ status, voteCount })` inside the transaction (owner path); lead path (no owner passed) skips the vote check; kind-specific write step; storage compensation after commit; orphan compensation on failed insert/replace.

Exactly three operations:

- **insert** — the current create content write (one internal `writeContent` helper), starting the row at `pending`; on failure, best-effort delete of the body's upload URLs (none are referenced yet).
- **replace** — the ADR-0002 gate sequence plus the belt-and-braces: the content update targets the just-verified row and a zero-row match throws the 409, rolling back; post-commit stale-image cleanup (`oldUrls − newUrls`); on failure, best-effort delete of the body's upload URLs minus any URLs still referenced by the (rolled-back) DB state — carried-over pre-filled edit URLs stay referenced and are excluded.
- **delete** — `ownerUserId?`-style: owner path runs the gate, lead path skips it; post-commit full sweep (course images, port-authorization image, vote/decision attachment objects — unchanged semantics).

**Blocked by:** 01 (the wire schema should be sealed before the module's internal `assertWorkshopId` derivation builds on it)

**Status:** resolved

- [ ] `server/services/submission-content/` exists with `types.ts`, factory + spine, `drizzle-store.ts` adapter, and bound `index.ts` entry points; the three old files under `server/services/submissions/` are untouched for now.
- [ ] The spine re-reads in-transaction and maps missing/non-creator → opaque 404, review-started → 409, exactly as the current services do.
- [ ] Replace's zero-row guarded update throws 409 and rolls back (belt-and-braces).
- [ ] Orphan compensation runs on failed insert and replace (best-effort, only URLs no persisted row references), and never touches a carried-over still-referenced URL; post-commit cleanup still runs on success.
- [ ] Delete keeps the owner-or-unrestricted split and the unchanged post-commit full sweep.
- [ ] Specs at `tests/server/services/submission-content/` with an in-memory fake store cover: gate sequences (404/409), rollback on mid-write failure, belt-and-braces, compensation on failure, stale-cleanup and full-sweep success paths, delete-without-owner.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.

## Answer

Implemented in commit `fa0105e`.

`server/services/submission-content/` mirrors the review-write module: `types.ts` (narrow `SubmissionContentStore`/`SubmissionContentDeps` + record shapes), `save-submission-content.ts` (`createSubmissionContentService(deps)` with injected `{ runTransaction, deleteStorageObjects }`), `drizzle-store.ts` (binds the real transaction client), and an `index.ts` exposing the bound `createSubmission`/`updateSubmission`/`deleteSubmission` entry points. The three old files under `server/services/submissions/` are untouched (issue 03 rewires the endpoints and removes them).

- **Spine** — `runGuardedWrite` re-reads the row inside the transaction, maps missing *and* non-creator to the same opaque 404, runs `canMutateSubmission({ status, voteCount })` inside the transaction on the owner path, skips the gate when no owner is passed (lead path), then compensates storage after commit. The 5-column port-image projection and the mapper/course/per-course mapper writes are each derived exactly once (`toContentWrite`, `writeContent`) and shared by insert and replace.
- **insert** — create row at `pending`, then `writeContent`; on failure, best-effort delete of the body's upload URLs (the fresh row rolled back, so none are referenced).
- **replace** — full gate sequence plus belt-and-braces: `updateSubmissionContent` is guarded on `status = 'pending'` and a zero-row match throws the 409 inside the transaction, rolling the write back; post-commit stale-image cleanup is `oldUrls − newUrls`; on failure, compensation re-reads the (rolled-back) references in a fresh transaction and deletes only body uploads no persisted row references — carried-over pre-filled-edit URLs stay referenced and are excluded.
- **delete** — `ownerUserId?` split: owner path runs the gate, lead path skips it; post-commit full sweep (course images, port-authorization image, vote/decision attachment objects) unchanged.

Specs at `tests/server/services/submission-content/` (19 tests: 5 + 9 + 5) drive all three operations through an in-memory fake with commit/discard transaction semantics, covering the 404/409 gate sequences, rollback on mid-write failure (both insert and replace), the belt-and-braces zero-row 409, compensation on failure (never touching a still-referenced carried-over URL), stale-cleanup and full-sweep success paths, and delete-without-owner.

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass. Reviewed on both axes (Standards: no hard violations; Spec: all seven checklist items met) — merged with P2 notes; the three duplication smells flagged were fixed in the same commit.