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