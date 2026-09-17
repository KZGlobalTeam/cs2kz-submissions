# 01: Per-game map-name prefixes

**What to build:** Map-name validation accepts more prefixes per game — CS2 keeps `kz_` only; CS:GO accepts `kz_`, `skz_`, `vnl_`, and `kzpro_`. The rule is enforced identically by the submission form and the wire schema (closing today's server-side gap where any map name passes), and the CS:GO rules-dialog copy adopts the wider set. See `.scratch/map-name-prefixes/spec.md` for the full decision record.

**Blocked by:** None.

**Type:** task

**Status:** resolved

- [x] `shared/utils/map-names.ts` (new, sibling of `course-names.ts`): `MAP_NAME_MAX_LENGTH = 27`; `MAP_NAME_PREFIXES` per game (`cs2: ['kz_']`, `csgo: ['kz_', 'skz_', 'vnl_', 'kzpro_']`); `mapNamePrefixesForGame(game)`; `matchingMapNamePrefix(game, name)` (the prefix `name` starts with, or undefined — exact lowercase match); `mapNameBodyCharsetOk(body)` (`/^[A-Za-z0-9_]+$/`, so an empty tail rejects a bare prefix); `mapNameWithinMaxLength(name)`; `mapNamePrefixListText(game)` ("one of `kz_`, `skz_`, `vnl_`, `kzpro_`" for message composition).
- [x] `shared/schemas/map-name.ts` (new): `mapNameSchemaFor(game)` — `min(1)` plus the three refines (prefix, body charset, length). CS2 messages verbatim from today's form strings (including "…(including the `kz_` prefix)"); CS:GO messages derived from the constant ("Map name must start with one of `kz_`, `skz_`, `vnl_`, `kzpro_`", charset message unchanged, "Map name must not exceed 27 characters" — no single-prefix parenthetical).
- [x] `components/submission/SubmissionForm.vue`: drop the inline `mapNameSchema`; consume `mapNameSchemaFor(game)`. CS2 behavior and the `kz_example_map` placeholder unchanged.
- [x] `shared/schemas/submission.ts`: both game schemas override `mapName` in the base shape with `mapNameSchemaFor(game)` — a CS2 write with `skz_`/bare/overlong/space-body dies with a 400; CS:GO accepts all four prefixes; the port/course refinements are untouched.
- [x] `components/submission/submissionRules.ts`: in `csgoSubmissionRulesSteps` only, derive the two naming sentences from the shared vocabulary ("Map name must start with one of `kz_`, `skz_`, `vnl_`, `kzpro_`." and "Map name must **not exceed 27 characters** in length."); the CS2 copy stays byte-identical; the file's doc comments now note the naming group tracks the map-name vocabulary while the rest of the CS:GO copy remains the placeholder pending the community draft.
- [x] Tests: new `tests/server/utils/map-names.spec.ts` (seam C — per-game sets pinned, all four accepted on CS:GO / `kz_` on CS2, rejects foreign prefixes `kjr_`, case variants `KZ_`/`VNL_`, bare prefix, non-alphanumeric body, length > 27; `MAP_NAME_MAX_LENGTH` pinned). `tests/server/utils/submission-input-schema.spec.ts` gains per-game map-name blocks (seam A — wrong prefix/bare/space/overlong rejected per game on create and edit paths; CS:GO accepts all four; existing `kz_` happy-path cases stay green).
- [x] Verification: `pnpm typecheck` clean, `pnpm lint` clean, full suite green with no CS2 regressions.

## Comments

## Answer

Implemented in commit `c49fc04`. The map-name rule now lives once in `shared/utils/map-names.ts` (per-game prefix sets, 27-char cap, body charset with a non-empty tail, list-text rendering) and `shared/schemas/map-name.ts` (`mapNameSchemaFor(game)`), consumed by the submission form and by both per-game wire schemas — a CS2 write with `skz_`/bare/overlong/space-body now 400s, CS:GO accepts all four prefixes. CS2 messages, rules copy, and the `kz_example_map` placeholder stay byte-identical; CS:GO's two naming sentences derive from the shared vocabulary. TDD at seams C and A (28 new tests: `tests/server/utils/map-names.spec.ts`, per-game blocks in `submission-input-schema.spec.ts`), plus the third pinned CS:GO divergence in `approver-checklist-state.spec.ts`; the review round also fixed the empty-name double-issue (guarded prefix refine, pinned by tests). `pnpm typecheck`, `pnpm lint`, and the full suite (430 tests) are green.