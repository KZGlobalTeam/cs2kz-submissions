# 11: ADR-0009 drops the deleted checklist predicates

**What to build:** ADR-0009 (`docs/adr/0009-roles-and-permission-predicates.md`) still documents `requireApproverRole` / `hasApproverRole` as the explicit-`approver` branch of the three-way permission split, "used only by the private-checklist endpoints". Both predicates and both endpoints were deleted in ticket 08, so the repo's declared authority on role predicates now points at dead code. The ADR keeps the remaining two-way split (`requireApprover` admitting both reviewer roles, `requireReviewer` for shared endpoints) and the checklist-privacy rationale; the amendment just removes the dead branch and the consequences paragraph tied to it.

**Blocked by:** 10 — ADR-0014 supersedes ADR-0003 (so the supersession story reads coherently)

**Status:** resolved

- [x] ADR-0009's `requireApproverRole` / `hasApproverRole` bullet is removed — the split is described as `requireApprover` (either reviewer role) vs `requireReviewer` (shared endpoints); the "Consequences accepted" paragraph no longer references the private-checklist leak risk or the checklist endpoints' own predicate.
- [x] No other ADR still references the deleted predicates or endpoints (ADR-0003 keeps its historical mention, now under the ticket-10 superseded banner; ADR-0014 records the browser-storage decision).
- [x] The rest of ADR-0009 (role taxonomy, `user_roles` table, admin role-removal semantics, the `requireApprover` / `requireReviewer` split) is untouched.

## Comments

Implemented 2026-08-31:

- **ADR-0009 amended**: `docs/adr/0009-roles-and-permission-predicates.md` now describes the deliberate two-way split — `requireApprover` (either reviewer role) vs `requireReviewer` (shared endpoints). The dead `requireApproverRole` / `hasApproverRole` branch (deleted with the private-checklist endpoints in ticket 08) and the "Consequences accepted" paragraph tied to it are removed; the title's "three-way" becomes "two-way". The role taxonomy, `user_roles` table, admin role-removal semantics, and the two surviving gate bullets are untouched.
- **ADR-0011 stale reference fixed**: the submission-content ADR said the delete endpoint's inline `roles.includes('lead_approver')` "becomes a named predicate mirroring `hasApproverRole`" — the mirror target was deleted in ticket 08, so it now names the actual predicate (`hasLeadApproverRole`, `server/utils/approver-gate.ts`).
- **No other ADR references the deleted surfaces**: only ADR-0003 keeps the historical mention (under its ticket-10 superseded banner), and ADR-0014 records the browser-storage decision; both are the allowed exceptions in the ticket.