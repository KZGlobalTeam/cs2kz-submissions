# 07: Branding and Discord notifications

**What to build:** The portal's public wording covers both games and the Discord notifications say which game an event belongs to. The login page reads "KZ Global Submission Portal", the Discord sender becomes "KZ Submissions", every notification embed carries a Game field, and submission links in embeds carry the game context so a click lands in the right game.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- [ ] The login page title reads "KZ Global Submission Portal".
- [ ] The Discord sender name is "KZ Submissions".
- [ ] Every Discord embed — submission created, vote recorded, decision cast — carries a Game field naming the submission's game.
- [ ] Submission links inside embeds carry the game context.
- [ ] Notification payload tests are extended for the new sender name and the Game field, and CS2-regression payload expectations are updated accordingly.