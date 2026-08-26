# 01: Extract the shared submission-input schema

**What to build:** The edit feature must accept exactly the same validated submission content as creation, but the create request's body schema currently lives inline with the create endpoint. This prefactor lifts that validated shape into shared code so the create and edit write paths consume one definition and cannot drift apart. No behaviour changes — creating a submission works exactly as before.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The validated submission-input shape used by the create endpoint (map name, workshop URL, port-evidence cross-field rules, mappers, courses) lives in shared code, and the create endpoint consumes it from there.
- [x] Creating a submission behaves identically before and after: the same bodies are accepted and the same validation failures are reported in the same way.
- [x] No unrelated behaviour changes; creation is the only consumer affected and the verification loop stays green.

## Answer

Extracted in commit `a548cde`. The create endpoint's inline zod schema moved verbatim into `shared/schemas/submission.ts` (`SubmissionMapperSchema`, `SubmissionCourseImageSchema`, `SubmissionPortImageSchema`, `SubmissionCourseSchema`, `SubmissionInputSchema`), and `server/api/submissions/index.post.ts` now imports `SubmissionInputSchema` and parses the body with it. `SubmissionInput` is derived from the schema (`z.infer`) and re-exported from `shared/types/submission.ts` so `create-submission.ts` keeps importing from the same place; the loose `CourseImageMeta` remains for client form state. Behavior is pinned in `tests/server/utils/submission-input-schema.spec.ts` (both cross-field messages + paths). Constraints, messages, and issue paths are byte-identical to HEAD (verified by diff); `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.