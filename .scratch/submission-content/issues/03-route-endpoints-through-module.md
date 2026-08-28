# 03: Route the three endpoints through the module and name the lead predicate

**Type:** task

**What to build:** The three thin endpoints become parse-and-delegate adapters over the submission-content module's bound entry points, and the old per-path service files (`server/services/submissions/create-submission.ts`, `update-submission.ts`, `delete-submission.ts`) are removed once nothing imports them. Endpoint behaviour is unchanged: `POST /api/submissions` → `createSubmission(user.id, body)`; `PUT /api/submissions/[id]` → `updateSubmission(id, user.id, body)`; `DELETE /api/submissions/[id]` keeps the lead-approver vs owner split, but the inline `user.roles.includes('lead_approver')` becomes a named predicate (`hasLeadApproverRole(roles)`) defined beside `hasApproverRole` in `server/utils/approver-gate.ts` (mirroring that predicate's shape and doc-comment style), so the capability switch has a name and one home.

**Blocked by:** 02 (the module must exist before the endpoints can delegate to it)

**Status:** ready-for-agent

- [ ] `server/api/submissions/index.post.ts`, `[id].put.ts`, and `[id].delete.ts` import from `server/services/submission-content` (or its `index.ts`) and do only auth, param/body extraction, and parse.
- [ ] The old files under `server/services/submissions/` are deleted; no imports remain.
- [ ] Delete uses `hasLeadApproverRole` (owner path passes `user.id`; lead path passes none) with the same semantics as today.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.

## Answer

*(pending implementation)*