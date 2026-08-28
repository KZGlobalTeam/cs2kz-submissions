# 01: Move the workshop-URL rule onto the shared wire schema

**Type:** task

**What to build:** The stricter workshop-URL rule the client form enforces today (a `steamcommunity.com` workshop or sharedfiles filedetails URL carrying a numeric `id`, per the refine in `components/submission/SubmissionForm.vue`) becomes a refine on `SubmissionInputSchema.workshopUrl` in `shared/schemas/submission.ts`, so both the create and the replace endpoints reject an invalid URL at parse with a 400 before any write. `assertWorkshopId` in `shared/utils/workshop.ts` becomes an internal happy-path derivation whose failure maps to a 400-family error instead of a raw `Error` (which today surfaces as a 500); `extractWorkshopId` stays tolerant so legacy rows and stored URLs keep working. No behaviour change for valid submissions: the same workshop URLs that submit successfully today still do.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [ ] `SubmissionInputSchema.workshopUrl` validates the client's rule (host `steamcommunity.com`, pathname `/(?:sharedfiles|workshop)/filedetails/`, numeric `id` query param), with the same messages the client shows.
- [ ] An invalid workshop URL fails endpoint parse with 400 and nothing is written (create and replace).
- [ ] `assertWorkshopId`'s unreachable failure maps to a 400, not a raw-Error 500; `extractWorkshopId` is unchanged and tolerant.
- [ ] Specs pin the new refine's accept/reject cases and messages in the repo's pure-test style (mirroring `tests/server/utils/submission-input-schema.spec.ts`).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.

## Answer

Implemented in commit `e9ea0df`.

`SubmissionInputSchema.workshopUrl` now enforces the client form's rule with the client's messages — `min(1, 'Workshop URL is required')`, `.url('Must be a valid URL')`, and a refine over `isSteamWorkshopUrl` ('Must be a Steam Workshop URL') whose predicate is byte-identical to `SubmissionForm.vue`'s: host `steamcommunity.com`, pathname `/(?:sharedfiles|workshop)/filedetails/`, numeric `id` query param. Both the create (`index.post.ts`) and replace (`[id].put.ts`) endpoints wrap the parse in the repo's ZodError→400 fold (same shape as `vote.put.ts`), so an invalid URL dies with a 400 — and nothing is written, since parsing precedes the service call — instead of a raw 500.

`assertWorkshopId` now throws `createError({ statusCode: 400, statusMessage: 'Invalid Steam Workshop URL' })` instead of a raw `Error` — a caller mistake, never a 500. Its branch is nearly unreachable after the refine: it fires only for a digit-only `id` that is not derivable (overflowing a safe integer, or falsy 0). `extractWorkshopId` is untouched and stays tolerant of legacy URL shapes.

Behavior pinned in `tests/server/utils/submission-input-schema.spec.ts` (accept sharedfiles + workshop paths; reject empty / non-URL / wrong host / wrong path / non-numeric / missing id, each with the exact client message(s) and `['workshopUrl']` path) and the new `tests/server/utils/workshop.spec.ts` (400 mapping for the two unreachable-failure shapes, extractor tolerance). `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass. Reviewed on both axes (Standards: no hard violations, P2 comment-accuracy note fixed; Spec: all four checklist items, P2 note that the repo has no endpoint-test harness — the 400-and-nothing-written guarantee is structural: parse precedes the service call).