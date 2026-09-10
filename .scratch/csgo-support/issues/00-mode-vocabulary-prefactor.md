# 00: Mode-vocabulary prefactor (optional)

**What to build:** The per-game course-mode vocabulary exists once instead of being hardcoded in three places. A shared constant maps each game to its allowed mode set and UI labels (CS2: CKZ/VNL; CS:GO: KZT/SKZ/VNL), and the vote form and lead decision panel consume it — with behavior identical to today, landing green on its own. This is the recommended first step of ticket 04 and is not a hard blocker for any ticket; if it is skipped, ticket 04 does the equivalent extraction as its first step.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] One shared constant defines per-game mode sets and labels; nothing hardcodes a mode list or label derivation in the review components.
- [x] The vote form and lead panel render exactly as today for CS2 (CKZ/VNL), verified by regression tests.
- [x] The extraction is covered at seam C with the repo's pure-helper test style.

## Comments

Implemented 2026-09-10:

- New `shared/schemas/course-mode.ts` is the single home of the vocabulary: `gameModeSets` (game → ordered `{ mode, label }` entries), `modesForGame` (render-ordered mode set per game) and `modeLabel` (label lookup derived from the vocabulary, so labels are written once). `CsgoMode` derives from the vocabulary; the shared `Mode` enum stays two-valued — growing to five is the ticket-04 migration.
- Consumers rewired: `useVoteForm` (vote form's filter seeding) and `LeadDecisionPanel` seed from `modesForGame('cs2')`; `CourseFilterVoteTable`, `LeadDecisionPanel`, `ApproverVotesSection`, and `CoursesReadonly` label filters via `modeLabel`; the decided view's `approver-votes-view` mode order runs off the same set. No review component hardcodes a mode list or label derivation.
- Regression: `tests/server/utils/course-mode.spec.ts` pins `modesForGame('cs2') === ['classic', 'vanilla']` and labels CKZ/VNL (the old seeded/render behavior) plus the CS:GO vocabulary (kzt/skz/vnl, KZT/SKZ/VNL). Reviewed via /code-review (both axes OK with notes; the one actionable finding — the vocabulary written twice in the module — fixed by deriving `CsgoMode`).
- `pnpm typecheck`, `pnpm lint` (0 errors), and the full suite (326 tests) are green.