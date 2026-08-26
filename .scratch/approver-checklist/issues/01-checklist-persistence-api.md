# 01: Checklist persistence and API spine

**What to build:** The server half of the Approver checklist feature, end-to-end at the API layer. An approver's verified-rule ticks and their Approver note get a private, persistent home — one record per submission per approver, deleted with the submission — with dedicated endpoints that only the owning plain approver can read and write. The shared submission-detail payload carries none of this data, so privacy holds by construction and a shared per-submission client cache can never leak one approver's private state to another. Verifiable by API calls and tests before any UI exists.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The new storage has one row per (submission, approver): a JSON checklist mapping each rule-group key to an array of booleans, a nullable note column, and timestamps; a unique constraint per (submission, approver); rows cascade-delete when the submission is deleted; the migration applies cleanly to a fresh database.
- [ ] A plain approver can write their checklist and note for a submission and read them back unchanged, including an explicit "reset to nothing" save (empty checklist, note cleared) that remains distinguishable from "never saved".
- [ ] Body validation: valid payloads are accepted; malformed payloads are rejected with clear errors — checklist not an object, checklist arrays containing non-boolean values, note longer than 2000 characters; empty or whitespace-only notes normalize to null.
- [ ] The role gate passes only for users holding the plain approver role — lead-only, combined approver+lead, and neither are all rejected — verified with a full truth-table test.
- [ ] Lead approvers, non-approvers (mappers), and anonymous users are rejected on both endpoints.
- [ ] Data is scoped to the caller's own record: reads and writes address only the current user's checklist; no endpoint ever returns another approver's checklist, and the shared submission-detail payload is unchanged (no checklist or note data rides along in it).
## Comments

Implemented and verified 2026-08-26:

- Storage: `submission_approver_checklists` (jsonb checklist, nullable note, timestamps, unique (submission, approver), cascade on submission/user delete). Migration `drizzle/0005_slim_catseye.sql` applied to the dev DB **and** verified from scratch on a throwaway fresh database (all 15 tables created; dropped afterwards).
- API: `GET`/`PUT /api/submissions/[id]/approver-checklist`, strict plain-approver gate (`isPlainApprover` — `approver` and not `lead_approver`), own-row scoping only. GET returns the row (with timestamps) when saved, `null` otherwise — "reset to nothing" stays distinguishable from "never saved". Malformed bodies → 400 with structured zod issues.
- Tests: `approver-checklist-schema.spec.ts` (11) + `approver-gate.spec.ts` (4). Full suite 61 passing; typecheck, lint, and build clean.
- Live API battery: 401 anonymous; 403 lead-only / approver+lead / mapper; plain-approver write/read-back unchanged incl. reset; cross-approver data isolation; shared submission-detail payload carries no checklist/note.
- Reviewed via code-review skill (Standards: no violations; Spec: OK, fresh-DB clause now attested).
