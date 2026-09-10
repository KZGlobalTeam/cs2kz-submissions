# 00: Mode-vocabulary prefactor (optional)

**What to build:** The per-game course-mode vocabulary exists once instead of being hardcoded in three places. A shared constant maps each game to its allowed mode set and UI labels (CS2: CKZ/VNL; CS:GO: KZT/SKZ/VNL), and the vote form and lead decision panel consume it — with behavior identical to today, landing green on its own. This is the recommended first step of ticket 04 and is not a hard blocker for any ticket; if it is skipped, ticket 04 does the equivalent extraction as its first step.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] One shared constant defines per-game mode sets and labels; nothing hardcodes a mode list or label derivation in the review components.
- [ ] The vote form and lead panel render exactly as today for CS2 (CKZ/VNL), verified by regression tests.
- [ ] The extraction is covered at seam C with the repo's pure-helper test style.