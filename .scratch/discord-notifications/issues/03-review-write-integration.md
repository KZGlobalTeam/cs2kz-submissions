# 03: Review-write integration (vote and decision pings)

**What to build:** Inject the notifier into `ReviewWriteDeps` and emit after each successful commit, mirroring the `deleteStorageObjects` post-commit seam: `saveVote` emits a vote ping on **every** save — including upsert re-saves of an existing vote — carrying `submissionId`, the approver user id, the decision, and the Rejection reason; `finalizeSubmission` emits a decision ping exactly once, carrying `submissionId`, the lead user id, status, and Decision note. Nothing emits when the write throws, 404s, 409s, or rolls back, and a storage-compensation failure after commit must not suppress the ping (the send happens regardless of cleanup outcome).

**Blocked by:** 02

**Status:** resolved

- [x] Notifier dep added to `ReviewWriteDeps` and bound in `server/services/review-write/index.ts`.
- [x] Vote ping emitted after the commit of every `saveVote` save, including re-saves.
- [x] Decision ping emitted after the commit of `finalizeSubmission`, exactly once.
- [x] No emit on 404/409, failed writes, or rollbacks; emit unaffected by storage-compensation failures.
- [x] Review-write tests extended with a recording fake notifier covering the above (fires on success, never on guarded failures, fires again on a same-approver re-save).

## Comments

Implemented 2026-08-31:

- **Seam**: `ReviewWriteDeps` gains `notifyVoteRecorded` and `notifyDecisionCast`, typed with the notifications module's `VoteRecordedFacts` / `DecisionCastFacts` (imported type-only from `server/services/notifications/types`), bound in `review-write/index.ts` to the module's bound entry points. The write-store contract is untouched (spec §Context resolution: no store-contract changes; verified diff-wise).
- **Emit placement**: the shared `runGuardedWrite` spine takes a per-call `notify` callback and fires it in a `Promise.allSettled` alongside `deleteStorageObjects`, strictly after the transaction resolves. That delivers both properties by construction: a 404/409/rule-400 throw or a write-step rollback never reaches the post-commit block (nothing pings), and a storage-compensation failure cannot suppress the ping (nor a ping failure the committed save — the notifier swallows its own errors anyway).
- **Facts**: the vote ping carries `submissionId`, the approver user id, `approvalDecision`, and `rejectionReason`; the decision ping carries `submissionId`, the lead user id, `status`, and `decisionNotes`. Display names are the notifier's job — resolved on its own post-commit read.
- **Bound entry-point comments** in `notifications/index.ts` corrected: the swapped ticket references (03 = review-write, 04 = submission-content) now match.
- **Tests** (14 new): `createFakeDeps` gains a recording fake notifier (`FakeNotifierLog` — `votes`/`decisions` arrays) plus an optional dep-overrides seam for the storage function. New specs cover: the vote ping firing once per successful save with the exact facts, re-pinging on a same-approver re-save, no ping on 404/409/rule-reject/write-rollback, and the ping surviving a throwing `deleteStorageObjects`; the decision ping firing exactly once per successful finalize (approved + rejected, null and real notes), no ping on 404/409/zero-row-guard rollback/rule-reject, and the ping surviving a throwing cleanup. Full suite 270/270 green, `pnpm typecheck` exit 0, `pnpm eslint` clean (0 errors).