# 04: Submission-content integration (submission ping)

**What to build:** Inject the notifier into `SubmissionContentDeps` and emit after `createSubmission`'s transaction commits — carrying `submissionId`, the creator user id, `mapName`, `workshopUrl`, and `isPort` (the notifier resolves the submitter's display name and course count itself). Only `createSubmission` emits: `updateSubmission` (owner edits) and `deleteSubmission` (lead path) stay silent, and nothing emits when the create fails or rolls back (the orphan-compensation path must not ping).

**Blocked by:** 02

**Status:** resolved

- [x] Notifier dep added to `SubmissionContentDeps` and bound in `server/services/submission-content/index.ts`.
- [x] Submission ping emitted after the commit of `createSubmission` only.
- [x] No emit on update, delete, failed creates, or rollbacks (orphan compensation excluded).
- [x] Submission-content tests extended with a recording fake notifier covering the above.

## Comments

Implemented 2026-08-31:

- **Seam**: `SubmissionContentDeps` gains `notifySubmissionCreated`, typed with the notifications module's `SubmissionCreatedFacts` (imported type-only from `server/services/notifications/types`), bound in `submission-content/index.ts` to the module's bound entry point. The write-store contract is untouched (spec §Context resolution: no store-contract changes; verified diff-wise).
- **Emit placement**: `createSubmission` now resolves the transaction into a local, then fires the ping strictly after — below the failure catch, so a rollback rethrows through the orphan-compensation path and never reaches the ping. Update/delete never call the notifier at all, so owner edits and lead deletes are silent by construction. Facts carry `submissionId`, the creator user id, and the persisted row's `mapName`, `workshopUrl`, and `isPort`; the submitter display name and the course count stay the notifier's post-commit read.
- **Tests** (7 new): `createFakeDeps` gains a recording fake notifier (`FakeNotifierLog.submissions`). New specs cover the ping firing exactly once per successful create with the exact facts (plain + port), no ping on a derivation-failure 400, no ping on a mid-transaction rollback or a failed row insert (the orphan-compensation paths, previously asserting only `deleted` now also assert empty `notified`), and no ping on owner edits (success + refused) or on either delete path (owner + lead). Full suite 275/275 green, `pnpm typecheck` exit 0, `pnpm eslint` clean (0 errors).