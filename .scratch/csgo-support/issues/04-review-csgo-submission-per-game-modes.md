# 04: Review a CS:GO submission — per-game modes

**What to build:** Reviewing a CS:GO submission works exactly like CS2 except the course-mode vocabulary: each course is rated in three modes — KZT, SKZ, VNL — with the same nub/pro tiers, ranked semantics, notes, and the same 10-level scale. The vote form, the lead decision panel, and the approver's private checklist render the submission's game's modes and rule groups, and the API rejects any filter proposing a mode that does not belong to the submission's game.

**Blocked by:** 01, 02, 03.

**Status:** ready-for-agent

- [x] The shared course-mode enum grows to five values (classic, vanilla, kzt, skz, vnl) via migration, and per-game allowed mode sets and labels (CKZ/VNL vs KZT/SKZ/VNL) live in one shared constant.
- [x] The vote form on a CS:GO submission shows three filters per course — KZT, SKZ, VNL — each with nub tier, pro tier, ranked state, and notes; the CS2 vote form shows CKZ and VNL unchanged.
- [x] The lead decision panel on a CS:GO submission offers the three CS:GO modes; the CS2 panel is unchanged.
- [x] The review write path rejects a vote or decision whose filter mode is outside the submission's game's set with a 400.
- [x] The approver's private checklist on a CS:GO submission mirrors the CS:GO rule groups, with no porting group.
- [x] Both games use the same 10-level tier scale and the same ranked/awaiting/unranked semantics (unchanged shared schemas).
- [x] Tests at seams A and B: per-game mode validation and the out-of-game-mode rejection are covered through the wire schemas and the review-write service seam with its fake store; CS2 review regression cases stay green.
- [x] If the mode-vocabulary prefactor ticket (00) was not taken first, this ticket's first step is the equivalent extraction before the behavior change.

## Comments

Implemented 2026-09-11:

- **Shared enum to five values.** `modeValues` in `shared/schemas/cs2kz.ts` grows to `classic`/`vanilla`/`kzt`/`skz`/`vnl`; the wire `ModeSchema`, the `course_mode` DB enum, and migration `0011_heavy_randall_flagg.sql` (add-only `ALTER TYPE … ADD VALUE`, no data migration) all derive from the same array, so they cannot drift. `course-mode.ts` simplifies to the one-five-value world: `gameModeSets`/`modesForGame` (CS2: CKZ/VNL; CS:GO: KZT/SKZ/VNL) are the single vocabulary, the two-type `CsgoMode` derivation collapses into `CourseMode = Mode`, and a new pure verdict `firstModeOutsideGame` gives the write path's 400 its shared rule.
- **Vote form and lead panel per game.** `useVoteForm(courses, existing, game)` and `LeadDecisionPanel` seed from `modesForGame(game)`; both take a `game` prop that the page wires to the detail payload's own `details.submission.game` (the row is truth — the form always seeds modes the write will accept). `CourseFilterVoteTable` labels via `modeLabel`, so KZT/SKZ/VNL render with the same nub tier, pro tier, ranked state, and notes fields. CS2 renders exactly as today (CKZ/VNL).
- **Write-path mode guard.** `SubmissionRecord` gains `game`, read inside the transaction. The shared `runGuardedWrite` spine runs the mode-scope guard right after the status guard, before any row is written: both `saveVote` and `finalizeSubmission` reject any proposed/finalized filter whose mode is outside the submission's own game's set with a 400 naming the offending mode — a CS:GO submission can never carry a classic/vanilla rating, and a direct cross-game API call is refused by the row. Reads stay scoped by the route segment; only the write's modes are checked against the row (reconciled with `route-game.ts`'s docstring).
- **Checklist and scale.** The page now passes the row's game to the approver checklists too (single authority on the page), so the CS:GO checklist mirrors the CS:GO rule groups with no porting group; both games share the unchanged 10-level tier scale and the same ranked semantics (shared schemas untouched).
- **Tests.** Seam A: `review-write-schemas.spec.ts` pins the five-value enum and accepts kzt/skz/vnl on both Vote and Final filter wires. Seam B: `save-vote.spec.ts` and `finalize-submission.spec.ts` cover the out-of-game-mode 400 (votes and decisions, both directions) and in-game persistence for CS:GO; every CS2 regression case stays green unchanged (fake submissions seed `game`). Seam C: `course-mode.spec.ts` covers `firstModeOutsideGame`.
- **Verification:** typecheck clean, lint clean (3 pre-existing `v-html` warnings only), full suite 382 tests passing (was 370 at ticket start). Reviewed via the two-axis code-review skill: Spec axis clean (no missing/partial requirements, no scope creep, nothing wrong); Standards axis found no hard violations — its two judgement calls (page split between route and row game, and the axiom wording tension with `route-game.ts`) were fixed: all review surfaces on the page now take the row's game, the stale "detail read is game-scoped" docstrings are corrected, the duplicated guard closure is folded into the spine, and the rationale is stated once, reconciled with the route-game docstring.