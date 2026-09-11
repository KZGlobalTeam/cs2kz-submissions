# 07: Branding and Discord notifications

**What to build:** The portal's public wording covers both games and the Discord notifications say which game an event belongs to. The login page reads "KZ Global Submission Portal", the Discord sender becomes "KZ Submissions", every notification embed carries a Game field, and submission links in embeds carry the game context so a click lands in the right game.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- [x] The login page title reads "KZ Global Submission Portal".
- [x] The Discord sender name is "KZ Submissions".
- [x] Every Discord embed — submission created, vote recorded, decision cast — carries a Game field naming the submission's game.
- [x] Submission links inside embeds carry the game context.
- [x] Notification payload tests are extended for the new sender name and the Game field, and CS2-regression payload expectations are updated accordingly.

## Comments

Implemented 2026-09-11:

- Login page heading (`pages/[game]/index.vue`) reads exactly "KZ Global Submission Portal"; the browser tab title (`nuxt.config.ts`) is rebranded to "KZ Global Submissions" so no user-facing "CS2KZ" remains in the rendered portal (review-driven add — the spec line "The portal's public wording covers both games").
- Discord sender becomes "KZ Submissions": `SENDER_NAME` in `payloads.ts`, the single constant all three payloads read from.
- Every embed — submission-created, vote-recorded, decision-cast — leads with a `Game` field naming the submission's game, labelled through the shared `gameLabels` ('CS2' / 'CS:GO') so the switcher and the notifier cannot drift; the value comes from the notifier's post-commit context read (the row is truth, and the embed link already carried the game segment from ticket 01 — `/cs2|csgo/submissions/{id}`).
- Tests: payload specs assert the Game field inside the full embed shapes for all three events plus a CS:GO label check; the service spec asserts the literal sender name and both game values; CS2-regression embed expectations updated.
- Verification: 398 unit tests passing, typecheck clean, lint clean (3 pre-existing `v-html` warnings only). Reviewed via the two-axis code-review skill — spec axis confirmed all five checks; standards axis found no hard violations. Review findings fixed: the tab-title rebrand above, dropping a redundant context re-pick in `notifySubmissionCreated`, and the `gameLabels` comment now covering the embeds.