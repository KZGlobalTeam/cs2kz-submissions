# 03: Approver votes section

**What to build:** On decided (approved/rejected) submissions, approvers and the lead see the per-Course approver-votes section built on ticket 02's view model: each Course renders as a block in the vote form's layout — course name and image, then per Course mode ("CKZ / VNL Filter") the four fields as static labels with a badge per approver (`Name: value`) and a "Final" reference badge per field showing the Finalized filter. No headings, no input controls. For reviewers, this section replaces the read-only courses section; mappers keep the read-only courses section with map facts and Finalized filters and never see the Votes. A viewer who is also the submitter sees the section like any approver. Pending submissions are untouched.

**Blocked by:** 01, 02

**Status:** resolved

- [x] On approved/rejected submissions, approvers and the lead see one block per Course in the vote form's layout: course name and image, then per Course mode the four fields (Ranked Status, NUB tier, PRO tier, Reasoning) as static labels with a badge per approver showing name and display value, plus a "Final" badge per field from the Finalized filters.
- [x] The section has no headings and no input controls — no checkbox, radio groups, selects, or textareas anywhere in it.
- [x] For approvers and the lead on decided submissions, the votes section replaces the read-only courses section; mappers continue to see the read-only courses section with map facts and Finalized filters and never see the votes section.
- [x] A viewer who is also the submitter of the decided submission sees the section like any other approver.
- [x] An approver who proposed no Course filter on a given Course shows no badges for it — the missing-cell case renders honestly.
- [x] Pending submissions render exactly as today; the existing review surfaces are untouched.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.