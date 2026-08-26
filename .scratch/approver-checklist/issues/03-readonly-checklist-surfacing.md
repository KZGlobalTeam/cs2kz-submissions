# 03: Read-only checklist surfacing after review

**What to build:** The same Approver checklist section shown read-only once the submission has left review. After the submission is approved or rejected, the owning plain approver can still see the ticks and note they saved — controls inert, no save behavior — so their private verification record survives for reference. If the approver never saved anything, the section is hidden entirely rather than shown as an empty box. Visibility stays strictly private: lead approvers and the submitting mapper never see the section in any mode, and the read-only view never touches another approver's state.

**Blocked by:** 02 — Editable checklist section beside the vote form

**Status:** ready-for-agent

- [ ] When the submission has left review (approved or rejected), the owning plain approver still sees their checklist and note, rendered read-only — no editable checkboxes, no note editing, no save indicator or save behavior.
- [ ] The read-only section is hidden entirely when the approver never saved anything (no ticks and no note).
- [ ] The read-only view obeys the same porting rule as the editable one: the porting group renders only when the submission is a port.
- [ ] Placement mirrors where the editable section sits during review, keeping the two-column (desktop) / stacked (mobile) layout.
- [ ] Lead approvers and the submitting mapper never see the section in any mode, and the read-only rendering never fetches or displays state belonging to another approver.