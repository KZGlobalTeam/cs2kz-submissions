# Review writes: one module for Vote and Decision

**Status:** ready-for-agent

## Problem Statement

The Vote and Decision write paths duplicate the same Course-filter shape and split the rejection rules across layers, and both guard submission state outside the transaction where a race can corrupt a terminal approval:

- The ten-tier difficulty list is spelled four times — the shared schema, the DB enum, and inline in both write endpoints — and the zod schemas shared code already exports are never used for validation, only for their inferred types. Adding a tier today means touching four files; the copies can drift.
- The rejection empty-reason rules are split across endpoint zod checks (falsy check) and the attachment-list module (trimmed non-empty, only when attachments exist) with different semantics: a whitespace-only reason passes the endpoints and is stored.
- Both write services check `status !== 'pending'` **outside** the transaction. A losing concurrent finalize has already passed that check, then inside its transaction deletes and re-inserts the final filters and writes decision attachments, hits a zero-row status update, commits anyway — wiping the winner's Finalized filters and returning an empty 200.
- The lead's decision request still carries `isRanked` alongside `state` — an invariant (`isRanked ⇔ state = 'ranked'`) that nothing enforces; the client already derives it.

The lead-discretion model itself (ADR-0007) is not in question; this closes the write window the ADR records as an accepted race.

## Solution

One Review-write module owns the shared Course-filter wire shape, the rejection rules, and the guarded transaction. Both write endpoints become thin adapters: parse the body against the shared schema, call the module, return the result. The status guard moves inside the transaction (re-read → guard → write → storage compensation after commit), matching the pattern the owner edit/delete path already established.

## User Stories

1. As a lead approver, I want two concurrent finalize attempts on the same submission to result in exactly one successful finalization with the winner's Finalized filters intact, so that my approval is never silently degraded by a race.
2. As a lead approver who finalizes a submission that a colleague just decided, I want a clear error instead of a 200 with an empty body, so that I know my finalization did not land.
3. As an approver, I want a `no` vote with a whitespace-only Rejection reason to be rejected, so that I cannot record a rejection with no actual reason.
4. As an approver, I want Rejection attachments accepted only on a `no` vote and only alongside a written Rejection reason, so that the current attachment rules keep working unchanged.
5. As a lead approver, I want Rejection attachments accepted only on a `rejected` decision and only alongside a written Decision note, so that the same guard applies to final rejections.
6. As a maintainer, I want the ten-tier difficulty list defined once, so that adding a tier touches a single file and Vote and Decision writes cannot drift.
7. As a maintainer, I want the exported tier/mode/state schemas to be the actual runtime validation for both write endpoints, so that shared code stops being dead weight.
8. As a maintainer, I want the rejection empty-reason rule to live in one place matching the documented domain (a rejection carries a required reason), so that the endpoint and service stop disagreeing.
9. As a maintainer, I want the `pending` status guard inside the transaction for both Vote and Decision writes, so that a vote or finalize can never land after the submission has left `pending`.
10. As a maintainer, I want a same-approver double-submit of a Vote to be idempotent rather than a 500 on the unique constraint, so that a retried request never errors.
11. As a maintainer, I want storage objects for removed Rejection attachments deleted only after the write commits, best-effort, so that a storage hiccup never fails an already-committed save.
12. As a maintainer, I want the decision wire to stop carrying the redundant `isRanked`, derived instead at write time, so that the client and server cannot disagree about the ranked invariant.
13. As an approver, I want to re-save my existing Vote as today — the module upserts it, replaces its proposed Course filters wholesale, and never loses my staged attachments — so that the rework changes nothing I experience.
14. As a submitting mapper, I want a decided submission to stay terminal, so that the module's changes never reopen a closed review.
15. As a maintainer, I want the transactional surface testable with an in-memory fake, so that guard placement and rollback regressions fail in CI without a live database.

## Implementation Decisions

- **Module shape.** One review-write service module exports `saveVote` and `finalizeSubmission` (unchanged names); both funnel through a private transaction spine: in-tx submission re-read → `pending` guard → kind-specific write step → post-commit storage compensation. The two existing service modules are removed; the endpoints keep their current entry calls, parse against the shared schema, and delegate.
- **Shared wire shape.** The Course-filter wire shape is defined once in shared code by composing the existing tier, mode, and state schemas (the same zod schemas the UI already uses for its tier scale). Both endpoint bodies (Vote and Decision) parse against it, and the input types the services consume are inferred from these schemas rather than hand-written. The DB enums derive from the same shared value arrays — same values, same ordering today, so no data migration.
- **Guard semantics.** The status re-read happens inside the transaction; any non-`pending` status fails the write with a conflict and the transaction rolls back. The guarded status-predicate update on finalize stays as belt-and-braces, but a zero-row result after the in-tx pass is raised as an error instead of silently returning nothing.
- **`isRanked` derivation.** Dropped from the Decision wire; the write derives `isRanked = state = 'ranked'` before persisting. The `is_ranked` column remains (reads surface it to the approver-vote badges). Vote proposals keep their own `isRanked` — a proposal carries no `state`, so it is not derived from anything.
- **Rejection rules.** The shared body schema requires a trimmed non-empty reason on any rejection (`no` Vote, `rejected` Decision) — the rule CONTEXT.md documents. The attachment-list rules (attachments only on a rejection, reason required alongside attachments, duplicate/prefix checks) stay in the attachment-rules module; the mapping from rule failure to an error response exists exactly once, in the spine.
- **Vote write.** A single upsert on the unique (submission, approver) constraint replaces the select-then-insert-or-update branch, making a concurrent same-approver double-submit idempotent.
- **Compensation.** Spine-owned, post-commit, best-effort; each kind's write step returns the removals (a Vote: replaced attachment objects; a Decision: none — its attachments are written once and never edited).
- **Client.** The lead decision panel stops sending `isRanked` in its request body (it already computes the request from `state`); the vote form is unchanged.

## Testing Decisions

- **What makes a good test here:** external behavior of the spine — guard placement (a status that changed between the outer read and the in-tx re-read fails the write), rollback-on-throw (a failed write leaves no rows), compensation skipping (no storage deletions when the write failed), wholesale filter replacement, attachment replacement diff and its removals. Not the module's internal wiring.
- **Seam (one):** the spine depends on a narrow store interface (submission lookup, vote upsert, filter/attachment replacement, final-filter writes, guarded decision update); a real adapter maps it onto the transaction client, and an in-memory fake implements it with commit/discard semantics mirroring the transaction contract (writes apply to a scratch copy; success keeps them, throw discards them).
- **Surface tested:** Vote save (create and update via upsert — filter rows replaced, attachment rows replaced with only removed URLs listed for storage deletion); Decision finalize (approval writes Finalized filters and terminal status; rejection writes Decision attachments and terminal status); the concurrent-finalize loser case (status flips between the outer read and the in-tx re-read → error, no rows, no storage removals); a second finalize after a Decision errors with a proper status; whitespace-only rejection reason rejected; attachments-on-approval rejected.
- **Prior art:** the existing pure-function service tests in the repository (attachment-rules, submission-mutability) — same style, no database.

## Out of Scope

- The read path: query surfaces keep reading `is_ranked` from the column and are untouched.
- The stricter client-side vote-form rule (Reasoning required for every enabled filter) — server-side behavior unchanged.
- ADR-0007's lead-discretion model: lead-only finalizing, advisory votes, terminality of decided submissions — none of it re-litigated.
- Real-database (pg-mem or similar) integration tests; the logical race is what the fake models, and Postgres-level uniqueness/isolation remain framework facts.
- The storage module and any data backfills (none needed — same enum values).

## Further Notes

- Recorded alongside this spec: ADR-0007 is amended to mark its accepted race-window consequence closed, and ADR-0010 records the module decision.
- Adding a tier to the difficulty scale after this lands means editing one shared array; the DB enum and both endpoints follow automatically.
- The scope strengthens ADR-0007's one-shot claim only: finalization stays one-shot, and the losing concurrent finalize now rolls back instead of committing its writes.