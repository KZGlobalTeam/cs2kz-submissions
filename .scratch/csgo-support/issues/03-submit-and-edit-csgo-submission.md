# 03: Submit and edit a CS:GO submission

**What to build:** A mapper can create and edit a CS:GO submission end-to-end. Course names are prefilled and non-editable — the first course is `Main`, each added course becomes `Bonus 1`, `Bonus 2`, … following order. There is no port question, authorization upload, or porting rules step anywhere in the CS:GO flow, and the rules dialog shows the CS:GO rule set (the CS2 copy minus porting). The API enforces both rules server-side, while the CS2 form, schema, and rules stay exactly as they are.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- [ ] On the CS:GO create form the first course is prefilled `Main` and its name is not editable; each "Add Course" appends a course prefilled `Bonus 1`, `Bonus 2`, … derived from position, and removing courses keeps the remaining names on-convention.
- [ ] The CS:GO form shows no port section (no isPort question, no authorization image, no port notes).
- [ ] The rules dialog on a CS:GO submission shows the CS:GO rule set — a copy of the CS2 steps minus the porting step — and the CS2 dialog is unchanged.
- [ ] The shared wire schema rejects any port evidence on a CS:GO submission (must not be a port, no authorization image, no port notes).
- [ ] The shared wire schema enforces the CS:GO course-name convention: exactly `Main` then `Bonus 1..N` in ascending order, `Main` mandatory and first, at least one course.
- [ ] Editing a CS:GO submission keeps names derived and non-editable and the game fixed; editing a CS2 submission behaves exactly as today.
- [ ] The mine list in the CS:GO context shows CS:GO submissions, and the CS2 context shows CS2 submissions.
- [ ] Tests at seams A and C: the schema's per-game cases and the name-prefill helper are covered; CS2 regression cases stay green.