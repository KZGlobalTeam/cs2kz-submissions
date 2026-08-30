# 11: ADR-0009 drops the deleted checklist predicates

**What to build:** ADR-0009 (`docs/adr/0009-roles-and-permission-predicates.md`) still documents `requireApproverRole` / `hasApproverRole` as the explicit-`approver` branch of the three-way permission split, "used only by the private-checklist endpoints". Both predicates and both endpoints were deleted in ticket 08, so the repo's declared authority on role predicates now points at dead code. The ADR keeps the remaining two-way split (`requireApprover` admitting both reviewer roles, `requireReviewer` for shared endpoints) and the checklist-privacy rationale; the amendment just removes the dead branch and the consequences paragraph tied to it.

**Blocked by:** 10 — ADR-0014 supersedes ADR-0003 (so the supersession story reads coherently)

**Status:** ready-for-agent

- [ ] ADR-0009's `requireApproverRole` / `hasApproverRole` bullet is removed — the split is described as `requireApprover` (either reviewer role) vs `requireReviewer` (shared endpoints); the "Consequences accepted" paragraph no longer references the private-checklist leak risk or the checklist endpoints' own predicate.
- [ ] No other ADR still references the deleted predicates or endpoints (ADR-0003 keeps its historical mention, now under the ticket-10 superseded banner; ADR-0014 records the browser-storage decision).
- [ ] The rest of ADR-0009 (role taxonomy, `user_roles` table, admin role-removal semantics, the `requireApprover` / `requireReviewer` split) is untouched.