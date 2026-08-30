# 05: Delete the superseded query file and the unreferenced votes service

**What to build:** Remove `server/queries/list-submissions.ts` (fully replaced by the review-queue module once issue 03 rewires the endpoint and issue 04 moves the row types) and `server/services/votes/list-votes.ts` (never imported — deletion test passes). Do **not** touch `server/queries/submission-details.ts`: its votes query is live via `server/api/submissions/[id].get.ts` and detail-shaped (per-vote rows, approver names, attachments, filters), not dead.

**Blocked by:** 03, 04

**Status:** resolved

- [x] `server/queries/list-submissions.ts` deleted; zero remaining importers (grep for `list-submissions` and `listOwnSubmissions`/`countOwnSubmissions`/`listAllSubmissionsForReview`/`countAllSubmissions`/`PageBounds`).
- [x] `server/services/votes/list-votes.ts` deleted; zero remaining importers (grep for `list-votes`/`listVotes`).
- [x] `server/queries/submission-details.ts` and `getSubmissionDetails` untouched and still compiling.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.

## Answer

Implemented. Both files are deleted with zero surviving importers, closing the ADR-0013 cleanup: `server/queries/list-submissions.ts` (the four list/count reads fully replaced by the review-queue module — endpoint rewired in 03, row types moved off shared in 04) and `server/services/votes/list-votes.ts` (never imported). Grep verification across `server/`, `tests/`, `pages/`, `shared/`, `components/`, `composables/`, `scripts/`: no match for `list-submissions`, `list-votes`, `listOwnSubmissions`, `countOwnSubmissions`, `listAllSubmissionsForReview`, `countAllSubmissions`, or `listVotes` outside the two deleted files and prose in `docs/adr/0013` / `.scratch`. Every surviving `PageBounds` reference resolves to `server/services/review-queue/types.ts` (the file-local interface died with the deleted file). `server/queries/submission-details.ts` is untouched — it imports only drizzle-orm, `~/db/schema`, `attachment-rules`, and `~/server/utils/db`, and its detail-shaped votes query stays live via `server/api/submissions/[id].get.ts`. `pnpm lint` (0 errors), `pnpm typecheck`, `pnpm test` (210 passed), `pnpm build` all pass.

## Comments

- Review (two-axis, both OK, zero findings): standards axis confirmed no dangling references and no lingering duplication in scope — the Duplicated Code the deletion fixes is consolidated in `server/services/review-queue/` and spec-covered, and the remaining `submission-details.ts` overlap with the queue's count aggregates is the documented deliberate split from ADR-0013. Spec axis confirmed the diff is exactly the two named deletions, `submission-details.ts` untouched, and no scope creep.

## Comments