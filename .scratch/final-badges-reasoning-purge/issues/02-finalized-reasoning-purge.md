# 02: Purge the finalized-reasoning field from the review data model and pipeline, keeping the release-export contract

**What to build:** Remove the `notes` field from Finalized filters across the entire review side — the database, the Decision request contract, the decision write path, the details payload, and the lead decision form — while leaving Vote proposals untouched (approvers still write reasoning when they vote) and keeping the release export byte-identical for the external dashboard. Concretely: the Finalized-filter column is dropped from the database via the next migration, preceded by a pre-flight check that no row holds a non-null value (expected, since no writer ever produced one). The shared filter-fields schema splits so that `notes` lives on the Vote proposal schema only; a Decision body that carries notes is rejected. The decision write spine persists final-filter records without notes, the details payload type no longer carries the field, and the lead decision form stops sending its hardcoded null. The release pipeline stops reading the field from storage, and the export shaping emits the same per-finalized-filter notes placeholder the documented null-to-empty-string coercion produces today — so the JSON pasted into the external dashboard's import dialog is unchanged (ADR-0008). The shared snake_case export schema keeps its nullable notes key untouched.

**Blocked by:** 01 (the display model must stop reading finalized notes before the shared type loses them)

**Status:** ready-for-agent

- [ ] A pre-flight check confirms zero rows hold a non-null notes value on Finalized filters, and only then the column is dropped via the next drizzle migration (migration file committed).
- [ ] The Decision request schema rejects `notes` on Finalized filters, and the Vote request schema still accepts `notes` on proposed filters — the two decision sides now encode different truth.
- [ ] The decision write spine persists Finalized-filter records without notes; its fake-store contract test asserts the record shape.
- [ ] The details payload for decided submissions carries no Finalized-filter notes, and no review-side module reads the field after the purge.
- [ ] The lead decision form's payload no longer sends `notes: null`; no new input appears.
- [ ] The release pipeline no longer reads Finalized-filter notes from storage (its store select, manifest type, and resolver drop the field).
- [ ] The release export JSON keeps its per-finalized-filter notes key with the same placeholder value it emits today, byte-identical for the external dashboard; the shared export schema's nullable notes key is untouched (ADR-0008).
- [ ] Unit tests are updated and green across the review-write wire schemas, the decision write spine, the release-contents resolution, and the export shaping — each asserting the absence on the review side and the preserved placeholder on the export side. Vote/save-vote behavior is unaffected.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass, and the migration applies cleanly against a local database.
---

## Shipped

Committed as `#02 final-badges-reasoning-purge`: the Finalized-filter `notes`
field is purged from the review side end to end — the database column dropped
by migration `0009_rapid_red_shift.sql` (with its documented pre-flight
check), the Decision request schema now rejects `notes` on Finalized filters
while the Vote schema keeps accepting it on proposed filters (the two decision
sides encode different truth), the decision write spine and its Drizzle store
persist final-filter records with no notes, the details payload type and the
release-content resolution carry no final-filter notes, and the lead decision
form's payload no longer sends its hardcoded `notes: null`. The release export
still emits the per-finalized-filter `notes: ""` placeholder via the shaping
adapter, byte-identical for the external dashboard (ADR-0008); the shared
snake_case export schema's nullable `notes` key is untouched.

- [x] All checklist bullets above met.
- [x] Pre-flight check run on the configured database before applying:
  `SELECT COUNT(*) FROM submission_final_filters WHERE notes IS NOT NULL` →
  **0 non-null rows** (32 rows total). Pre-flight query is documented in the
  migration header for the operator contract.
- [x] Migration `db:generate` → `0009_rapid_red_shift.sql` (single
  `DROP COLUMN`), applied cleanly via `pnpm db:migrate`; verified the column
  is gone and all 32 final-filter rows remain.
- [x] `pnpm lint` (0 errors) && `pnpm typecheck` && `pnpm test` (306 passed)
  && `pnpm build` all pass.
- [x] Live API verification as Reeed (lead approver, saved session):
  release export for "Global Map Release 2026-09-09" (9 maps) carries
  `notes: ""` on every finalized filter; the decided-submission details
  payload returns final-filters with no `notes` key while Vote proposal
  filters keep theirs; the decision endpoint accepts the new notes-free body
  (409 on the already-decided submission — the write gate, not a parse
  failure) and rejects a stale body carrying `notes: null` with a 400 and the
  zod issue at `filters[0].notes`.
- [x] Unit tests updated and green at the four pure seams: wire schemas
  (Decision rejects notes, Vote accepts written notes), the decision write
  spine's fake-store contract (`not.toHaveProperty('notes')` per stored
  record), release-contents resolution (`not.toHaveProperty('notes')`), and
  export shaping (notes key present with the `''` placeholder on every
  course × mode). Vote/save-vote fixtures and behavior untouched.
