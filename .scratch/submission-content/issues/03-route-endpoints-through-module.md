# 03: Route the three endpoints through the module and name the lead predicate

**Type:** task

**What to build:** The three thin endpoints become parse-and-delegate adapters over the submission-content module's bound entry points, and the old per-path service files (`server/services/submissions/create-submission.ts`, `update-submission.ts`, `delete-submission.ts`) are removed once nothing imports them. Endpoint behaviour is unchanged: `POST /api/submissions` → `createSubmission(user.id, body)`; `PUT /api/submissions/[id]` → `updateSubmission(id, user.id, body)`; `DELETE /api/submissions/[id]` keeps the lead-approver vs owner split, but the inline `user.roles.includes('lead_approver')` becomes a named predicate (`hasLeadApproverRole(roles)`) defined beside `hasApproverRole` in `server/utils/approver-gate.ts` (mirroring that predicate's shape and doc-comment style), so the capability switch has a name and one home.

**Blocked by:** 02 (the module must exist before the endpoints can delegate to it)

**Status:** resolved

- [x] `server/api/submissions/index.post.ts`, `[id].put.ts`, and `[id].delete.ts` import from `server/services/submission-content` (or its `index.ts`) and do only auth, param/body extraction, and parse.
- [x] The old files under `server/services/submissions/` are deleted; no imports remain.
- [x] Delete uses `hasLeadApproverRole` (owner path passes `user.id`; lead path passes none) with the same semantics as today.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.

## Answer

Implemented in commit `71bf117`.

The three endpoints now delegate to the module's bound entry points: `index.post.ts` → `createSubmission(user.id, body)`, `[id].put.ts` → `updateSubmission(submissionId, user.id, body)`, `[id].delete.ts` → `deleteSubmission(submissionId, canDeleteUnrestricted ? undefined : user.id)`, each doing only auth, param/body extraction, and parse. `server/services/submissions/` (create/update/delete-submission.ts, 367 lines) is deleted; no imports remain. The delete endpoint's inline `user.roles.includes('lead_approver')` became `hasLeadApproverRole(roles)` in `server/utils/approver-gate.ts`, sitting beside `hasApproverRole` with the same signature and doc-comment style — the lead-approver capability switch now has a name and one home, and the owner/lead split (owner passes `user.id`, lead passes none, skipping the gate) is unchanged. `hasLeadApproverRole` is pinned by a mirror spec in `tests/server/utils/approver-gate.spec.ts` (8 tests).

`pnpm lint` (0 errors), `pnpm typecheck`, `pnpm test` (152 passed), and `pnpm build` all pass. Reviewed on both axes (Standards: no hard violations, two P2 notes — the zod-fold duplication in create/put predates this ticket, and a naming-shadow on the local boolean, fixed in the same commit by renaming it `canDeleteUnrestricted`; Spec: all four checklist items met).