# 08: Server teardown

**What to build:** The checklist's server surface disappears: no endpoints, no services, no request schema, no row types, no checklist-specific role predicate. The data never leaves the browser, so nothing server-side remains to maintain.

**Blocked by:** 06 — Editable section reads and writes the browser, 07 — Read-only card reads the browser

**Status:** resolved

- [x] No client code references the checklist API anymore — the editable section and read-only card are entirely browser-backed once 06 and 07 have landed.
- [x] The checklist endpoints and their services are deleted, and the review pages still work (an approver can vote, and the section behaves per 06).
- [x] The shared request schema and row types for the checklist are deleted, along with the tests that exercised them.
- [x] The checklist-specific role predicate is removed; the shared gate module keeps any function other surfaces still use (submission delete).
- [x] The server utility that required the approver role exclusively for the checklist endpoints is deleted; no remaining imports reference it.
- [x] Full suite (minus the deliberately deleted tests) green with zero references to the removed modules; typecheck, lint, and build clean.

## Comments

Implemented 2026-08-30:

- **Endpoints and services deleted**: `server/api/submissions/[id]/approver-checklist.get.ts` and `.put.ts`, and the whole `server/services/approver-checklists/` directory (`get-approver-checklist.ts`, `save-approver-checklist.ts`). Nuxt auto-registers API routes from files, so deleting the handlers removes the routes from the build — verified: no `approver-checklist` string remains in the built Nitro server output. The review pages need no change; the section and read-only card are fully browser-backed since 06/07, and the vote endpoint's `requireApprover` gate is untouched.
- **Shared request schema and row types deleted**: `shared/schemas/approver-checklist.ts` (the zod `ApproverChecklistBodySchema` + payload types) and `shared/types/approver-checklist.ts` (`ApproverChecklistRow`) are gone, plus their 11-test spec `approver-checklist-schema.spec.ts`. The ticks-map type `ApproverChecklist` (`Record<string, boolean[]>`) now lives in the browser storage module (`components/review/approver-checklist-storage.ts`) — its only remaining consumers are client-side (state module, read-only card, their specs) — and the dying `db/schema/approver-checklists.ts` (removed in ticket 09) inlines `Record<string, boolean[]>` in its `jsonb` column so nothing dangles in between.
- **Gate utility**: `server/utils/approver-gate.ts` keeps only `hasLeadApproverRole` (the submission-delete endpoint's unrestricted-capability predicate, `server/api/submissions/[id].delete.ts`); the checklist-specific `hasApproverRole` and `requireApproverRole` (with the now-unused import in `server/utils/permissions.ts`) are deleted. `approver-gate.spec.ts` drops the 4-test `hasApproverRole` block and keeps the `hasLeadApproverRole` block. The client-side session `hasApproverRole` (composables/useSession.ts) is a different surface and is untouched — it still drives the rendering gate.
- **Verification**: full suite 229 green — 244 − 11 deleted schema tests − 4 deleted gate tests, exactly the spec's dying-test count; zero references to any removed module (grep over the code tree — `server`, `shared`, `db`, `components`, `pages`, `composables`, `tests`; only the client modules, `db/schema/approver-checklists.ts` + its index export (ticket 09), and the storage/state specs mention the feature, all legitimately. `docs/adr/0003` and `0009` still name the deleted surface as historical records — ADR-0014's supersession lands with ticket 10, and the ADR-0009 drift is queued as ticket 11); typecheck clean (exit 0), lint 0 errors (3 pre-existing `v-html` warnings in files untouched here), and `nuxt build` clean.