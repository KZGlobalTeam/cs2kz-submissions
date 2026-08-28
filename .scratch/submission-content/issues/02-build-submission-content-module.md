# 02: Build the submission-content module (insert, replace, delete on one spine)

**Type:** task

**What to build:** One module at `server/services/submission-content/` mirroring the review-write module's shape (`server/services/review-write/`): a `types.ts` declaring the narrow store/deps interfaces and record shapes, a `save-submission-content.ts`-style factory `createSubmissionContentService(deps)` with injected `{ runTransaction, deleteStorageObjects }`, a `drizzle-store.ts` adapter binding the real transaction client, an `index.ts` exposing bound entry points (`createSubmission`, `updateSubmission`, `deleteSubmission` — keep the existing names), and the in-memory fake + specs driving all three operations through the interface.

The guarded-write spine owns: re-read the row inside the transaction; missing *and* non-creator → the same opaque 404; `canMutateSubmission({ status, voteCount })` inside the transaction (owner path); lead path (no owner passed) skips the vote check; kind-specific write step; storage compensation after commit; orphan compensation on failed insert/replace.

Exactly three operations:

- **insert** — the current create content write (one internal `writeContent` helper), starting the row at `pending`; on failure, best-effort delete of the body's upload URLs (none are referenced yet).
- **replace** — the ADR-0002 gate sequence plus the belt-and-braces: the content update targets the just-verified row and a zero-row match throws the 409, rolling back; post-commit stale-image cleanup (`oldUrls − newUrls`); on failure, best-effort delete of the body's upload URLs minus any URLs still referenced by the (rolled-back) DB state — carried-over pre-filled edit URLs stay referenced and are excluded.
- **delete** — `ownerUserId?`-style: owner path runs the gate, lead path skips it; post-commit full sweep (course images, port-authorization image, vote/decision attachment objects — unchanged semantics).

**Blocked by:** 01 (the wire schema should be sealed before the module's internal `assertWorkshopId` derivation builds on it)

**Status:** ready-for-agent

- [ ] `server/services/submission-content/` exists with `types.ts`, factory + spine, `drizzle-store.ts` adapter, and bound `index.ts` entry points; the three old files under `server/services/submissions/` are untouched for now.
- [ ] The spine re-reads in-transaction and maps missing/non-creator → opaque 404, review-started → 409, exactly as the current services do.
- [ ] Replace's zero-row guarded update throws 409 and rolls back (belt-and-braces).
- [ ] Orphan compensation runs on failed insert and replace (best-effort, only URLs no persisted row references), and never touches a carried-over still-referenced URL; post-commit cleanup still runs on success.
- [ ] Delete keeps the owner-or-unrestricted split and the unchanged post-commit full sweep.
- [ ] Specs at `tests/server/services/submission-content/` with an in-memory fake store cover: gate sequences (404/409), rollback on mid-write failure, belt-and-braces, compensation on failure, stale-cleanup and full-sweep success paths, delete-without-owner.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.

## Answer

*(pending implementation)*