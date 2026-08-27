# 01: Single-source the Course-filter wire shape and the tier/state/mode enums

**What to build:** The Vote and Decision write paths stop re-typing the Course-filter shape. Both request bodies are validated against the same shared schemas composed from the existing tier, mode, and state schemas, and the DB enums derive from the same shared value arrays. No behaviour changes: the same request bodies are accepted and rejected as before. Adding a tier to the difficulty scale becomes a one-array edit.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Vote and Decision request bodies are validated by shared zod compositions built from the existing tier, mode, and state schemas; the inline endpoint copies are gone.
- [x] The three DB enums derive from the same shared value arrays the shared schemas use — one definition for the ten-tier difficulty list and the mode/state lists.
- [x] Validation rules and messages are byte-identical to today: the same bodies are accepted and the same bodies rejected as before this ticket (the whitespace-only-reason hole is deliberately still open).
- [x] The hand-written Vote and Decision input types are derived from the shared schemas rather than re-declared.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.

## Answer

Implemented in commit `2051473`. The Vote and Decision bodies now validate against `SubmissionVoteSchema` / `LeadDecisionSchema` in the new `shared/schemas/review.ts`, composed from the existing `ModeSchema`, `CourseFilterTierSchema`, and `CourseFilterStateSchema` (`VoteFilterSchema`, with `FinalFilterSchema` extending it by the state field); both endpoint files dropped their inline copies and are thin parse-and-delegate adapters. The DB enums in `db/schema/votes.ts` (`course_mode`, `course_filter_tier`, `course_filter_state`) now derive from the same shared value arrays, and the hand-written `SubmissionVoteInput` / `LeadDecisionInput` / `FilterVoteInput` / `FinalFilterInput` interfaces were replaced by `z.infer` types re-exported from `shared/types/submission.ts` (the filter type now lives as `VoteFilterInput`). Behavior is pinned in `tests/server/utils/review-write-schemas.spec.ts` (exact messages, issue paths, defaults, enum ordering, and the deliberately-still-open whitespace-only-reason hole). Constraints and messages are byte-identical to HEAD (verified by diff); `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass, and `pnpm db:generate` reports "No schema changes" (enum values unchanged). The tightened rejection rules, the in-transaction status guard, and the `isRanked` derivation belong to issues 02 and 03.