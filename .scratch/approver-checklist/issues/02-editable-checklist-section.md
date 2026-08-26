# 02: Editable checklist section beside the vote form

**What to build:** The live Approver checklist section next to the vote form for a pending submission in vote mode. A plain approver sees all the same rule groups the mapper acknowledges before submitting — rendered at once, each group collapsible and expanded by default, the porting group only when the submission is a port — with an independent checkbox per rule and the Approver note textarea at the bottom. Changes auto-save (debounced) with a subtle saved/saving indicator, prefill when the approver returns, and are flushed when the vote is saved or the view unmounts, so saving the vote never drops a pending tick or note. The section is purely advisory: it never gates or influences the vote.

**Blocked by:** 01 — Checklist persistence and API spine

**Status:** ready-for-agent

- [ ] On a pending submission in vote mode, a plain approver sees the section beside the vote form: two-column on desktop, stacked on mobile.
- [ ] The section renders the same rule groups as the pre-submission dialog — naming, courses, ranked, jumpstat, porting, other — all at once on one page.
- [ ] Each group is collapsible and expanded by default; the porting group renders only when the submission is a port.
- [ ] Each rule has an independent checkbox that toggles freely; the Approver note (free text, up to 2000 characters) sits at the bottom of the section.
- [ ] Changes auto-save (debounced) with a subtle saved/saving indicator; ticks and the note survive closing the submission and prefill when the approver returns.
- [ ] Pending changes are flushed when the vote is saved and when the view unmounts, so a tick or note change made immediately before Save Vote is never lost.
- [ ] Saving a fully-emptied state (every box unchecked, note cleared) persists as an explicit reset rather than erasing the saved record.
- [ ] The checklist is purely advisory: Save Vote succeeds regardless of how many rules are ticked, and the section never contributes to the vote payload or to vote summaries.