# 05: Decided and readonly surfaces render per game

**What to build:** The read-only surfaces on submission detail pages — the approver-votes section, the Status of Approval section, and the readonly courses with their Finalized filters — render the submission's game's mode sets, so a decided CS:GO submission shows Final reference badges for KZT, SKZ, and VNL while decided CS2 pages stay exactly as they are.

**Blocked by:** 04.

**Status:** ready-for-agent

- [x] The approver-votes section on a decided CS:GO submission shows one block per course per CS:GO mode (KZT, SKZ, VNL) with the same fields as CS2 (Ranked Status, NUB tier, PRO tier, proposed reasoning) and Final reference badges for the settled filters.
- [x] The Status of Approval section and the readonly courses with Finalized filters render per the submission's game.
- [x] The mapper-facing detail view (finalized filters only) renders per the submission's game.
- [x] Decided CS2 pages render byte-for-byte as today.
- [x] Tests at seams B and C: the per-game rendering helpers and the manifest/query projections are covered through the existing pure-helper and service-fake tests; CS2 regression cases stay green.

## Comments

Implemented 2026-09-11:

- **Approver-votes view per game.** `buildApproverVotesView` gains the submission's game as a required third argument and derives its mode walk from `modesForGame(game)` — the old hardcoded `modesForGame('cs2')` order was the bug: a decided CS:GO submission's kzt/skz/vnl rows and votes matched nothing and rendered zero mode blocks. `ApproverVotesSection` now takes a `game` prop and the page feeds it `details.submission.game` (the row is truth, same pattern as the vote form, lead panel, and checklists from 04). Out-of-game payload rows contribute nothing in either direction, so the view can never leak a mode across games.
- **Readonly courses and the mapper-facing detail view per game.** `CoursesReadonly` takes the submission's game and renders each course's Finalized filters through the new shared `finalFiltersForGame` helper (`shared/schemas/course-mode.ts` — the vocabulary module stays the single source): the game's own modes in the game's render order. A decided CS:GO submission shows KZT/SKZ/VNL rows; with `cs2` the helper returns classic-then-vanilla, so decided CS2 pages render exactly the rows they render today.
- **Status of Approval per game.** The section renders no Course mode at all — Vote cards carry the approver's note/reason and Rejection attachments, never filter rows — so it is game-agnostic by construction; its docstring now records that, with the per-Course-mode history living entirely in the approver-votes section above it.
- **Tests at seams B and C.** Seam C: `approver-votes-view.spec.ts` gains a per-game block (a decided CS:GO submission's KZT/SKZ/VNL blocks with Final badge groups, proposal-only rejected order, and no out-of-game leakage in either direction) and `course-mode.spec.ts` covers `finalFiltersForGame` (CS:GO vocabulary ordering, in-game-only filtering, CS2 classic-then-vanilla regression, duplicate-mode stability, empty lists); every existing CS2 case runs unchanged against `'cs2'`. Seam B: ticket 04 already pins the per-game finalized-filter projection through the review-write fake store (a CS:GO decision finalizes kzt/skz/vnl), and the review-queue reads stay per-game; CS2 regression cases stay green.
- **Verification:** typecheck clean, lint clean (3 pre-existing v-html warnings only), full suite 390 tests passing (was 382 at ticket start). Reviewed via the two-axis code-review skill: Spec axis found nothing missing, nothing extra, nothing wrong (ticket-06 manifest/export territory untouched); Standards axis found no hard violations — its three P2 judgement calls were assessed and deliberately left: the duplicated projection lambdas in `buildModeBadges` and the "Final filters"/"Status of Approval:" UI strings predate this ticket (and changing rendered strings would break the byte-for-byte CS2 rule), and `finalFiltersForGame`'s generic row shape exists to keep the vocabulary module free of the details-payload type dependency while serving the plain-object test fixtures.