# 06: Releases per game and per-game export

**What to build:** Releases are per-game. A release is created in the current game context and only ever contains approved submissions of its own game — the attachable picker hides the other game's maps and attaching across games is rejected. The release manifest and JSON export are per-game: the CS2 export stays byte-identical to today's external CS2KZ dashboard contract, and the CS:GO export produces a provisional JSON carrying `kzt`/`skz`/`vnl` filter keys, refused when any course lacks all three modes' finalized filters, and still marks the release exported. The image pack is untouched.

**Blocked by:** 01, 02, 04.

**Status:** ready-for-agent

- [ ] The release manifest resolves each course's finalized filters per the release's game (two modes for CS2, three for CS:GO).
- [ ] The new-release page's approved-submissions picker lists only approved submissions of the release's game; the release detail lists only its own game's submissions.
- [ ] Attaching a submission whose game differs from the release's game is rejected with a 400 end-to-end (the predicate from 01 is enforced on the attach path).
- [ ] The CS2 release export payload is byte-identical to today's (ADR-0008 contract, `classic`/`vanilla` keys, `notes` placeholders) and its contract tests stay green.
- [ ] The CS:GO release export emits the provisional JSON with `kzt`/`skz`/`vnl` filter keys per course, and refuses with a 400 when any course lacks all three modes' finalized filters.
- [ ] Exporting a CS:GO release marks the release exported, exactly like CS2.
- [ ] The image pack downloads work identically for both games, unchanged.
- [ ] The CS:GO payload shape lives in the single shaping adapter (the placeholder contract is contained; swapping in the real KZ-dashboard shape later touches only that adapter).
- [ ] Tests at seams D and B: byte-identical CS2 export coverage, the CS:GO placeholder shape and its missing-filters refusal, and the game-aware manifest resolution through the release-contents service seam.