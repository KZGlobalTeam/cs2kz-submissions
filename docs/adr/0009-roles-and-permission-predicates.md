# Approver and lead approver are separate roles with a deliberate three-way permission-predicate split

Roles live in a many-to-many `user_roles` table (`approver`, `lead_approver`); a user may hold either or both, and the admin dashboard merges them into one row per user with a combined role list (commit `1c88da4`). Capabilities: approvers cast Votes and keep private per-submission checklists; leads additionally cast Decisions and create/manage Releases. Admin "removal" of a role only deletes the `user_roles` row (guarded so at least one lead always remains) — it never deletes the user or their votes, so review history survives role changes.

Permission gates split three ways, deliberately (`server/utils/permissions.ts`, `server/utils/auth.ts`):

- `requireApprover` admits any user holding `approver` *or* `lead_approver` — a lead-only user is effectively also an approver on anything sitting on the voting/review surface (they can cast votes and view the review queue), because they must still judge without being able to finalize.
- `requireApproverRole` / `hasApproverRole` requires the explicit `approver` role — used only by the private-checklist endpoints, because a lead-*only* user must never see an approver's private verification state (ADR-0003).
- `requireReviewer` admits either role for shared endpoints such as rejection-attachment upload/delete.

Consequences accepted: the split is easy to misuse — reaching for the shared `requireApprover` where exact-role semantics were meant would leak the private checklist surface, which is why the checklist endpoints carry their own predicate with an explaining comment.