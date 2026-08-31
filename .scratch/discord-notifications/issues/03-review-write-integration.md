# 03: Review-write integration (vote and decision pings)

**What to build:** Inject the notifier into `ReviewWriteDeps` and emit after each successful commit, mirroring the `deleteStorageObjects` post-commit seam: `saveVote` emits a vote ping on **every** save — including upsert re-saves of an existing vote — carrying `submissionId`, the approver user id, the decision, and the Rejection reason; `finalizeSubmission` emits a decision ping exactly once, carrying `submissionId`, the lead user id, status, and Decision note. Nothing emits when the write throws, 404s, 409s, or rolls back, and a storage-compensation failure after commit must not suppress the ping (the send happens regardless of cleanup outcome).

**Blocked by:** 02

**Status:** needs-triage

- [ ] Notifier dep added to `ReviewWriteDeps` and bound in `server/services/review-write/index.ts`.
- [ ] Vote ping emitted after the commit of every `saveVote` save, including re-saves.
- [ ] Decision ping emitted after the commit of `finalizeSubmission`, exactly once.
- [ ] No emit on 404/409, failed writes, or rollbacks; emit unaffected by storage-compensation failures.
- [ ] Review-write tests extended with a recording fake notifier covering the above (fires on success, never on guarded failures, fires again on a same-approver re-save).