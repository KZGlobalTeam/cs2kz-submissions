# 01: Standalone lead Decision panel

**What to build:** The lead's Decision moves out of the map info card into its own panel on the details page of decided submissions. Every role — mapper, approver, lead — sees the same material as today: status, decided-by, decision timestamps, the Decision note, and the revealed Rejection attachments with the existing lightbox. The map info card keeps only the submission facts (workshop, mappers, notes, port proof). Pending submissions keep their current page untouched.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] On approved/rejected submissions, the Decision renders as its own panel — between the map info card and the courses content — for every role, with status, decided-by name, decision timestamps, the Decision note, and the revealed Rejection attachments, lightbox included.
- [x] The map info card shows submission facts only (workshop URL, mappers, notes, port proof) and no decision material.
- [x] The extracted content is byte-equivalent to what the details page showed before this change — nothing gained, lost, or reworded.
- [x] Pending submissions render exactly as today: map info card + review surfaces, no standalone Decision panel.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.