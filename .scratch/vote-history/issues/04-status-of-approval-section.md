# 04: Status of Approval section

**What to build:** At the bottom of the reviewer view on decided submissions, every approver's Vote — including the viewer's own — listed with the Approval note (on yes) or Rejection reason and Rejection attachments (on no), mirroring the vote form's own section but with no self-exclusion. A decided submission can legally have zero Votes (a lead-only finalization), so the empty state reads as a terminal page, never as "no other approver votes yet". Mappers see none of it.

**Blocked by:** 03

**Status:** resolved

- [x] Below the approver-votes section, approvers and the lead see every Vote on the submission: approver name, yes/no, the Approval note on yes, the Rejection reason on no, and any Rejection attachments with the existing lightbox.
- [x] The viewer's own Vote is included — there is no self-exclusion in this section.
- [x] A decided submission with no Votes shows a terminal-appropriate empty state; the pending-review wording ("no other approver votes yet") never appears on a decided page.
- [x] Mappers never see this section.
- [x] The existing vote summary component's other usages (the pending review panels) are unchanged.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.