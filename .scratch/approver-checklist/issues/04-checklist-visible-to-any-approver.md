# 04: Checklist visible to any approver — the lead role no longer hides it

**What to build:** Relax the checklist's role gate from "plain approver" (holds `approver` and not `lead_approver`) to "holds `approver`" — a user who is both an approver and a lead approver sees the Approver checklist section (editable in vote mode, read-only after review) exactly like any other approver, keyed to their own private row. The section must never appear for lead-*only* users or mappers, and privacy is unchanged: every viewer reads and writes only their own checklist; nobody ever sees another user's.

**Blocked by:** 03 — Read-only checklist surfacing after review

**Status:** ready-for-agent

- [x] A user holding both `approver` and `lead_approver` sees the editable section beside the vote form in vote mode — same placement, layout, autosave, and prefill as a plain approver — and their ticks/note save and read back through the API.
- [x] A both-roles user whose submission has left review sees their saved checklist and note read-only, in the same side-column spot as during review.
- [x] The API accepts a both-roles user on `GET` and `PUT /api/submissions/[id]/approver-checklist`, scoped to their own row.
- [x] Lead-only users, roleless mappers, and anonymous users are still rejected on both endpoints, and the section still never renders for them.

## Comments

Implemented and verified 2026-08-27:

- Gate: `server/utils/approver-gate.ts` `isPlainApprover` → `hasApproverRole` (returns `roles.includes('approver')` only). The doc comment explains why a dedicated predicate is kept: the shared `requireApprover` guard deliberately admits lead-*only* users, which the checklist must not. `server/utils/permissions.ts` `requirePlainApprover` → `requireApproverRole`; both checklist endpoints use it. Truth-table test updated (`approver-gate.spec.ts`): approver passes, approver+lead passes, lead-only and neither rejected.
- Page: `pages/submissions/[id]/index.vue` drops the local `isPlainApprover` computed and gates on the session's `hasApproverRole` (the precise "holds the approver role" check, lead status irrelevant): the vote-mode side column and the post-review read-only branch now render for approver+lead; `flushChecklistBeforeVote` follows. In vote mode the two-column grid and checklist card are unconditional (the enclosing `v-if` already requires `hasApproverRole`).
- Not in scope: the lead *decision* surface (`mode=approve`) is untouched — the checklist's home remains beside the vote form. A lead+approver reaches it via the Vote action (`?mode=vote`); lead-only users still land on the decision panel with no checklist anywhere. Flagged for follow-up if a checklist beside the decision panel is wanted.
- Verification: unit suite 81 passing; typecheck and lint clean (3 pre-existing `v-html` warnings only); build clean. Live checks against the dev server (:11451) with minted sessions: both-roles user — `GET`/`PUT` round-trip through the API (200), editable section renders beside the vote form with saved ticks prefilled, read-only card renders with disabled ticks + note on a temporarily-approved submission; lead-only user — API 403 and decision panel with no checklist section; anonymous 401. All minted users, sessions, checklist rows deleted and the modified submission restored to `pending` afterwards.