# Approval note on yes votes

**Status:** ready-for-agent

## Problem Statement

An approver voting **yes** on a submission has no place to write down why. A **no** vote carries a required Rejection reason, but a **yes** vote carries only the per-course Filter notes — no vote-level free text. So a reviewer approving a map cannot leave a short explanation or comment for the other approvers and the lead, while rejecting does support one.

In addition, the Vote carries a ghost: a second no-side text field, the optional Rejection explanation, exists end-to-end in the database, API, and types — but it was never wired into the vote form, was never written by the UI, and has never held data. The domain model says a short reason is enough for a rejection; the extra field is dead surface.

## Solution

A yes Vote gains one **optional Approval note**: a single optional free-text field, rendered in the vote form only when the decision is Yes, prefilled on re-save, stored on the vote row (null on a no vote), displayed to approvers in the vote summary next to the approver's check, and included in the Discord vote ping on a yes vote that has one — the exact mirror of the Rejection reason on the no side.

The dormant **Rejection explanation** field is removed: the column is dropped, the field is gone from the Vote API contract and types, the summary panel's fallback logic simplifies, and the glossary term is deleted. After this change each decision side of a Vote carries exactly one text field: the required Rejection reason on No, the optional Approval note on Yes.

## User Stories

1. As an approver voting **yes** on a submission, I can write an optional note explaining or commenting on my approval, so that the other approvers and the lead understand my reasoning alongside my proposed Course filters.
2. As an approver voting **no**, I keep providing a required short Rejection reason exactly as today, so that the rejection workflow is unchanged.
3. As an approver editing my saved yes vote, I can change or clear my note, so that my vote reflects my latest judgment.
4. As an approver switching my vote from **no to yes**, I can add a note and the previous Rejection reason no longer applies, so that a vote never carries text for the wrong decision side.
5. As an approver switching my vote from **yes to no**, my note is discarded and a Rejection reason becomes required, so that no yes-side material lingers on a No.
6. As an approver, saving a yes vote with no note (or only whitespace) succeeds, so that an optional field never blocks a save.
7. As another approver reviewing the submission, I see each yes voter's note next to their name and check in the vote summary, so that I can weigh everyone's reasoning at a glance.
8. As the lead approver about to cast the Decision, I see every approver's Approval note in the summary, so that my final ruling is informed by the full review.
9. As a submitter or mapper, I never see any approver's note — votes remain stripped from non-approvers server-side — so that internal review commentary stays internal.
10. As a watcher of the Discord channel, a yes vote with a note posts an "Approval note" embed field, so that the webhook shows the same detail as the site.
11. As a watcher of the Discord channel, a yes vote without a note posts no Approval note field, so that the embed stays clean.
12. As an approver, the long Rejection explanation field no longer exists in the form, the API, or the types, so that the vote shape has no dead surface and one text field per decision side.
13. As a maintainer reading the project glossary, "Approval note" is defined and "Rejection explanation" is gone, so that the terminology matches shipped behavior.
14. As a deployer, the schema migration adds the nullable Approval note column and drops the never-populated Rejection explanation column without losing data, so that the database matches the model.
15. As an approver editing a Course filter, neither the Approval note nor the Rejection reason affects the per-filter "Reasoning for Tier" notes, so that vote-level and filter-level text stay separate concerns.
16. As a release maintainer, the release export and image pack never contain approval notes or any vote text, so that published artifacts are unaffected.

## Implementation Decisions

- **Vote body contract**: the Vote request body gains `approvalNote` (nullable free text) in place of `rejectionExplanation`. It carries no requiredness and no content rules — a yes or no vote is valid with a null, empty, or whitespace-only note. The required-Rejection-reason rule on No is untouched. Unknown fields are stripped by the existing body-parse (non-strict), so a stale client sending the old field is silently ignored rather than rejected — acceptable because this application is the only writer of votes.
- **Persistence**: the Vote table gains a nullable `approval_note` text column; the `rejection_explanation` column is dropped. Enforced null-on-the-other-side invariant: a no Vote always stores a null note, exactly as a yes Vote always stores a null Rejection reason today.
- **Review-write service**: the vote upsert persists the note; the vote recorded-facts payload carried to the notifier gains the note, mirroring how the Rejection reason is carried today.
- **Notification template**: the vote embed gains a truthy-guarded "Approval note" field rendered only on a yes vote that has a written note — the exact guard pattern already used for the "Rejection reason" field on No. No field renders when the note is absent.
- **Submission detail query**: exposes the Approval note per vote and stops exposing the Rejection explanation. Visibility unchanged: vote payloads remain stripped for anyone without an approver role, before they reach the client.
- **Vote form**: the note is a single-line input rendered only when Yes is selected, prefilled from the approver's previous vote on re-save, and submitted as null on a No vote. No validation beyond the schema.
- **Vote summary**: yes-vote rows display the note next to the check; no-vote rows display the Rejection reason via the existing label logic, minus the removed explanation fallback.
- **Domain vocabulary (CONTEXT.md)**: add an **Approval note** entry ("the optional free text an approver writes on a yes Vote; reviewers-only, never the Decision"), remove the **Rejection explanation** entry, and rewrite the **Vote** entry to state one text field per decision side. No ADR: adding an optional nullable column and dropping a never-populated one is neither hard to reverse nor surprising, so it fails the ADR criteria.
- **Migration**: generated and applied through the project's standard schema flow; the drop is lossless because the old column has never held data.

## Testing Decisions

A good test for this feature asserts externally observable behavior — what the service persisted, what facts the notifier received, what the embed contains — never internal implementation. Prior art is the existing review-write and notifications suites, which test exactly this way against in-memory fakes and pure payload builders.

- **Review-write service** (existing seam, primary coverage): yes vote persists its note and re-save updates it; no vote stores a null note with its Rejection reason intact; switching decision sides swaps the meaningful text field; the vote ping facts carry the note on Yes. Drives the service through the in-memory fake store exactly as the current save-vote suite does.
- **Vote body schema** (existing seam): the field is optional, nullable, and unconstrained; the old field is absent from the accepted shape; the required-Rejection-reason rule on No still holds.
- **Notification payloads** (existing seam): the vote embed's exact field set — an "Approval note" field present on a yes vote with a note, absent with none, mirroring the existing "Rejection reason" guard assertions.
- **Typecheck covers** the query selection, vote-form prefill/submit wiring, and summary display changes — the repo has no UI component test seam, and these changes are column swaps; this matches existing convention.

## Out of Scope

- Revealing any vote material (including Approval notes) to submitters or mappers — votes stay approver-only.
- Making the note required, imposing length limits, or rich-text rendering.
- The per-Course filter notes ("Reasoning for Tier") and any Course-filter behavior.
- The pre-existing tension between the glossary's "avoid 'Status of Approval'" guidance and the current vote-form radio label.
- Release exports, image packs, and the release-content modules.
- UI component or end-to-end tests for the new input; manual verification of the review flow stands in.

## Further Notes

- Data fact: the live database holds 82 votes and zero non-empty `rejection_explanation` rows — the field was never written by the UI and never contained data, so dropping it loses nothing and the change is trivially reversible.
- The vote ping currently re-fires on a same-approver re-save (the re-ping is the change signal); the Approval note rides that same ping, inheriting the existing semantics unchanged.
- The dormant field is believed never to have been requested; a short required reason is the agreed no-side shape.