# 04: Submission-content integration (submission ping)

**What to build:** Inject the notifier into `SubmissionContentDeps` and emit after `createSubmission`'s transaction commits — carrying `submissionId`, the creator user id, `mapName`, `workshopUrl`, and `isPort` (the notifier resolves the submitter's display name and course count itself). Only `createSubmission` emits: `updateSubmission` (owner edits) and `deleteSubmission` (lead path) stay silent, and nothing emits when the create fails or rolls back (the orphan-compensation path must not ping).

**Blocked by:** 02

**Status:** needs-triage

- [ ] Notifier dep added to `SubmissionContentDeps` and bound in `server/services/submission-content/index.ts`.
- [ ] Submission ping emitted after the commit of `createSubmission` only.
- [ ] No emit on update, delete, failed creates, or rollbacks (orphan compensation excluded).
- [ ] Submission-content tests extended with a recording fake notifier covering the above.