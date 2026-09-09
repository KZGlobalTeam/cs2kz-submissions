# Approver votes on the decided submission details page

**Status:** ready-for-agent

## Problem Statement

When an approver opens the details page of an approved or rejected submission, they see the lead approver's final Decision and the Finalized filters, but none of the individual Votes that produced that outcome. The per-approver judgments disappear the moment review ends, even though they are exactly the evidence the Decision was built on. The approver who comes late to a decided submission cannot tell who voted which way, what they proposed for each course's filters, or why.

## Solution

For **decided** (approved/rejected) submissions only, restructure the details page for reviewers:

1. **Map info panel** — the submission facts, minus the Decision block (workshop, mappers, notes, port proof, proof of permission).
2. **Lead Decision panel** (new, standalone) — the Decision: status, decided-by, decision timestamps, the Decision note, and the revealed Rejection attachments. Rendered for every role, exactly the material mappers are entitled to today.
3. **Approver votes section** (approvers and lead approver only) — one block per Course following the vote form's layout: course name and image, then per Course mode ("CKZ / VNL Filter") four read-only fields — Ranked Status, NUB tier, PRO tier, Reasoning — each rendered as static labels with a badge per approver (`Name: value`), replacing the form's radio group, selects, checkbox, and textarea. A "Final" reference badge per field shows the lead's Finalized filter for that Course mode, so proposals sit next to the settlement.
4. **Status of Approval section** at the bottom (approvers and lead approver only) — every approver's yes/no Vote with its Approval note or Rejection reason and any Rejection attachments, mirroring the vote form's own section but including the viewer's own vote. A decided submission can legally have zero Votes (lead-only finalization), so the empty state is written for a terminal page, not a pending one.

Mappers keep today's view: map info, the Decision panel, and the read-only courses section with Finalized filters — never individual Votes (already enforced server-side by the API's role-based strip). Pending submissions keep the current review surfaces untouched. The backend, API, and schema are unchanged: the details payload already carries every Vote with its attachments and proposed Course filters for approvers.

## User Stories

1. As an approver, I want to see every approver's Vote — who, which way, and their Approval note or Rejection reason — on the details page of an approved or rejected submission, so that I can understand how the final Decision was reached.
2. As an approver, I want each Vote's proposed Course filters shown per Course and per Course mode following the vote form's layout, so that I can review what each approver proposed for every course.
3. As an approver, I want the individual filter fields rendered as static values with a badge per approver (`Name: value`) under Ranked Status, NUB tier, PRO tier, and Reasoning, so that I can attribute each proposal at a glance and never mistake the page for an editable review surface.
4. As an approver, I want the tier labels to render as numbers (1–10) and the ranked state as Ranked/Unranked, matching how OtherApproverVotes displays them today, so that the decided page reads consistently with the review panels.
5. As an approver, I want a vote's proposed filters for a Course only when the approver actually recorded them — a No Vote that proposed nothing contributes no badges — so that partial proposals render honestly.
6. As an approver, I want the lead's Finalized filters shown as a "Final" reference badge alongside each field's proposal badges, so that I can compare what each approver proposed with what the lead settled in one place.
7. As a lead approver, I want the identical approver-votes view as any approver, so that I can inspect Votes on decided submissions without a separate surface.
8. As an approver, I want the lead's Decision in its own panel between the map info and the votes section — status, decided-by, timestamps, Decision note, and revealed Rejection attachments — so that the terminal ruling reads as distinct from the Votes that preceded it.
9. As an approver who is also the submitter of a decided submission (owner-approver), I want to see the votes section like any approver when I open my own submission's details, so that my reviewer admission is not affected by also being the mapper.
10. As a submitting mapper, I want the details page of my decided submission to keep showing the map info, the Decision, and the Finalized filters — and never individual Votes — so that the reviewers-only rule and my right to see only the revealed decision material hold unchanged.
11. As an approver, I want the votes section and the Status of Approval section rendered only on approved/rejected submissions, never on pending ones, so that the live review surfaces (vote form and lead decision form, with their inline other-approver votes) stay exactly as they are.
12. As an approver, I want the Status of Approval section at the bottom to list every approver's yes/no Vote — including my own — with its note/reason and Rejection attachments, so that the whole decision record is on one page.
13. As an approver, I want Rejection attachments shown with the Vote that carried them, openable in the existing lightbox, so that I can review the evidence without leaving the page.
14. As an approver, I want a sensible empty state when a submission was decided with no Votes at all (a lead-only finalization), so that a terminal page never claims "no other approver votes yet".
15. As an approver, I want the new sections to carry no headings or titles, so that the page flows as a faithful read-only rendition of the vote form.
16. As a maintainer, I want the derivation of the badge view (votes + Finalized filters → per-course, per-mode, per-field badges) to live in one pure, stateless module with unit tests in the repository's existing style, so that the badge, missing-cell, and empty-state logic is covered without introducing a component-test framework.

## Implementation Decisions

- **Scope of the change.** Only the read path and only the decided branch of the details page. The pending branch — vote form, lead decision form, live other-approver votes, approver checklist — is untouched. No backend, API, schema, or storage change: the details payload already carries each Vote with approver name, decision, note/reason, attachments, and proposed Course filters, and already strips the Votes payload from every non-approver response.
- **Panel extraction.** The Decision block is lifted out of the map info panel into its own read-only panel. The extraction is safe — the map info panel has a single consumer, the details page. The moved material (status, decided-by, timestamps, Decision note, revealed Rejection attachments) is exactly what every role sees today; the map info panel keeps the submission facts (workshop, mappers, notes, port proof).
- **Votes section composition.** A single pure view-model module derives the display structure from `(courses, votes, finalFilters)`: for each Course, for each Course mode, for each of the four fields (ranked state, nub tier, pro tier, reasoning), a list of per-approver badge entries plus one "Final" entry from the Finalized filter. Tier values render as numbers; ranked state as Ranked/Unranked; reasoning as text; any field a vote did not propose on a given Course is simply absent (no placeholder rows for unvoted filters, no "Vote on this filter" checkbox). The section renders no headings.
- **Status of Approval section.** Reuses the existing vote summary panel with the current-user exclusion removed, so the viewer's own Vote appears too. Its empty-state copy is replaced for the decided context: a decided submission may legitimately have zero Votes (lead-only finalization per ADR-0007), so the text must not imply pending review.
- **Visibility rule.** The votes section and Status of Approval section render only for the approver and lead approver roles, on decided submissions, including a viewer who is also the submitter (reviewer admission is role-based, not ownership-based). Mappers — including the owner — see map info, the Decision panel, and the read-only courses section with Finalized filters exactly as today; the server-side strip is the enforcement boundary, the client rendering never trusts an empty votes array alone.
- **No timestamps.** The display deliberately stays faithful to the vote form, which shows no timestamps; `createdAt`/`updatedAt` remain available in the payload if wanted later.
- **No titles.** Neither new section carries a heading; the page flows as content blocks.

## Testing Decisions

- **What makes a good test here:** the pure view-model's external behavior — badge groups per Course per mode per field with the right approver names and display values (tier numbers 1–10, Ranked/Unranked, reasoning text); a vote that proposed no filters on a Course contributing no badges; empty reasoning omitted; the "Final" entry derived from each Finalized filter; and the decided-with-zero-votes shape that drives the Status of Approval empty state. Not the component markup or the page's role branching.
- **Seam (one):** the pure view-model module. It is stateless (payload in, display model out), so no fakes are needed — the same style as the existing pure modules.
- **Prior art:** `tests/server/utils/workshop.spec.ts`, `tests/server/utils/submission-mutability.spec.ts`, and `tests/server/services/review-queue/resolve-filters.spec.ts` — pure-function specs under the repository's node-env vitest config.
- **Deliberately not covered:** badge rendering, panel layout, page branching — the repo has no component-test harness and this feature does not justify introducing one; those are guarded by the typecheck and manual/e2e verification of the decided page.

## Out of Scope

- An audit trail of Vote changes: the model stays a snapshot — one current Vote per approver per submission (the schema's unique constraint remains), never a change log.
- Any backend, API, schema, or storage change: the payload, the role-based Votes strip, and the write paths are untouched.
- The pending-submission review surfaces: vote form, lead decision form, live other-approver votes, approver checklist.
- Timestamp display: deliberately omitted to stay faithful to the vote form layout.
- Comparison tooling beyond the "Final" reference badge: no diff highlighting, deltas, or proposal-vs-finalization annotations.
- Mapper-visible Votes: the reviewers-only rule is unchanged and remains server-enforced.
- The lead Decision's write-once, terminal semantics (ADR-0007) and the review-write module (ADR-0010): untouched.
- Release export and image pack artifacts: their Finalized-filter semantics are unchanged.

## Further Notes

- During design, the CONTEXT.md **Vote** glossary entry was sharpened: Votes are visible to reviewers only at every stage of the submission's life — never to the submitter, pending or decided — matching what the details API already enforces.
- No new ADR is warranted: this is a presentational read-path change with no schema, no contract change, and no reversal cost; the terminality and one-shot guarantees of ADR-0007 are not touched.
- A decided submission with zero Votes is a legal state (ADR-0007 lead discretion), which is why the Status of Approval empty state differs from the pending-surfaces' "no other approver votes yet".
- The "Final" reference badge derives from Finalized filters, which are written exactly once at Decision time and never edited — so the reference row is stable from the decision onward.