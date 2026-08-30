# 04: Derive row types in the module and move the client pages off the hand-synced shared interface

**What to build:** Delete the hand-synced `ReviewSubmissionRow` interface from `shared/types/submission.ts` (the module's derived type is canonical, issue 01) and update the two consumers, `pages/review/index.vue` and `pages/releases/new.vue`, to `import type { ReviewSubmissionRow } from '~/server/services/review-queue/review-queue'` (type-only, erased at build — safe across the Nuxt client/server boundary). `SubmissionStatus`/`ApprovalDecision` and the other shared types stay. Behavior is invisible to the client: field names and shape are identical.

**Blocked by:** 01

**Status:** resolved

- [x] `ReviewSubmissionRow` interface removed from `shared/types/submission.ts`; no other server or client file references it from shared.
- [x] `pages/review/index.vue` and `pages/releases/new.vue` import the type from the module path via `import type` only (no runtime import crosses the boundary).
- [x] `OwnSubmissionRow` (already an `Omit<$inferSelect>` inference) moves wholesale; nothing external imported it.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass; both pages compile unchanged otherwise.

## Answer

Implemented. The hand-synced `ReviewSubmissionRow` interface is deleted from `shared/types/submission.ts`; both pages move to type-only imports from the module path — `pages/review/index.vue` splits its import (`ReviewSubmissionRow` from `~/server/services/review-queue/review-queue`, `SubmissionStatus` stays in shared), `pages/releases/new.vue` swaps wholesale. The row shape is the module's `ReturnType`-derived type (issue 01), so the wire shape and the code that produces it cannot drift; since every import is `import type`, nothing crosses the Nuxt client/server boundary at runtime. `SubmissionStatus`/`ApprovalDecision` and all other shared types stay.

Verified `OwnSubmissionRow`'s external surface is empty: the endpoint (issue 03) already imports the module's version, and no file imports the old `Omit<$inferSelect>` inference in `server/queries/list-submissions.ts` (grep: the four list/count functions there have zero importers), so that definition dies unobserved with issue 05's deletion. One supporting edit: `server/queries/list-submissions.ts` (dead code awaiting issue 05) has its `ReviewSubmissionRow` import pointed at the module so it keeps compiling until it is deleted by that ticket.

`pnpm lint` (0 errors), `pnpm typecheck`, `pnpm test` (210 passed), `pnpm build` all pass.

## Comments

- Review (two-axis, both OK with notes, no blockers): standards axis confirms ADR-0013 compliance (interface gone, no file imports it from shared, pages type-only) and flags the `list-submissions.ts` import swap as a P2 judgement call — the last edit a to-be-deleted file should receive; explicitly deferred to issue 05 per ticket boundaries (the spec axis agrees the swap is the minimal consistent fix and that deletion belongs to ticket 05's scope). The transient Duplicated Code smell in that file (its hand-built clone of the module's queue assembly) resolves on 05's deletion.

## Comments