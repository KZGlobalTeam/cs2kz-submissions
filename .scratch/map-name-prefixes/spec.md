# Map name prefixes — spec

## Purpose

The map-name validation rule currently accepts a single prefix, `kz_`, on both games. CS:GO submissions must also accept the mover-community namespaces `skz_`, `vnl_`, and `kzpro_` (SimpleKZ, vanilla, KZPro). CS2 stays `kz_`-only. The rule is enforced identically by the submission form and the wire schema, and the CS:GO rules-dialog copy adopts the wider set so form, dialog, and approver checklist agree.

## Decisions (grilling session, 2026-09-16)

1. **Per-game prefix sets.** CS2: `{kz_}`; CS:GO: `{kz_, skz_, vnl_, kzpro_}`. Prefixes are lowercase and matched exactly — never case-insensitively. ADR-0016's per-game-divergence precedent applies; a `skz_`/`vnl_`/`kzpro_` map in a CS2 release would be foreign to the ADR-0008 import contract.
2. **Server-side mirroring.** The wire schema currently accepts any map name (`min(1)` only) — the one gap against the "wire rejects what the UI rejects" philosophy (workshop URL, CS:GO course names). Create and edit 400 on a foreign prefix/character/length, per game.
3. **Length cap.** 27 characters **total** for every name, whatever the prefix. The rules text and messages stop saying "including the `kz_` prefix" where the prefix list is no longer single.
4. **Tail rule.** A map name needs at least one character after its prefix — bare `kz_`/`skz_`/`vnl_`/`kzpro_` is rejected (today `kz_` alone passes). Charset `[A-Za-z0-9_]` unchanged. No prefix/substring ambiguity: `kzpro_…` does not start with `kz_`.
5. **CS:GO rules copy adopts the prefixes** (overrides an earlier placeholder decision). The two naming sentences in `csgoSubmissionRulesSteps` are **derived** from the shared vocabulary, so the dialog can never drift from what the form enforces; the rest of the CS:GO copy stays a literal placeholder pending the community draft, and the two arrays remain structurally separate.
6. **CS2 byte-identical.** CS2 form messages, rules-dialog text, and the `kz_example_map` placeholder stay exactly as today. Only CS:GO strings derive from the constant.
7. **Single source of truth.** Pure predicates + constants in `shared/utils/map-names.ts` (sibling of `course-names.ts`); the zod schema in `shared/schemas/map-name.ts`; both the form and the per-game wire schemas consume it.
8. **Docs.** New CONTEXT.md glossary term "Map name prefix" (already captured). No new ADR — per-game divergence is ADR-0016's settled subject and a validation rule is cheap to reverse.
9. **No data migration.** Every existing row already passed the client's `kz_`-only rule (the form was shared); the server gap only admitted direct API writes. No existing submission violates the new rule, so the edit path is safe unchanged.

## In scope

- `shared/utils/map-names.ts` — constants + pure predicates.
- `shared/schemas/map-name.ts` — per-game zod schema with granular, derived messages.
- `components/submission/SubmissionForm.vue` — consume the shared schema; CS:GO messages derived, CS2 verbatim.
- `components/submission/submissionRules.ts` — CS:GO copy's two naming sentences derived; CS2 copy untouched; doc comments updated.
- `shared/schemas/submission.ts` — per-game wire schemas use the shared map-name schema (closes the server gap).
- Tests at seams A and C; CS2 regression cases stay green.

## Out of scope

- Any change to the rest of the CS:GO rules copy (still the placeholder pending the community draft).
- CS2 wording, messages, or placeholder changes.
- Data migration or backfill.
- Course names, workshop URL, or any other field.
- A new ADR.