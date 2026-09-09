# Final badge colors on the decided page and the finalized-reasoning purge

**Status:** ready-for-agent

## Problem Statement

On the decided submission details page, the approver-votes section renders the per-approver badges for NUB tier, PRO tier, and Reasoning in the component's default color — a loud green that is "all over the place" — while the same fields in the live vote form render as quiet neutral badges. The green comes from badges that carry no explicit color inheriting the theme default, not from any intent: the vote form's own other-approver votes force neutral on exactly those fields.

Worse, the Reasoning row carries a "Final" reference badge that is never real. The lead approver has no way to write reasoning for a Finalized filter — the decision form hardcodes notes to null — so that badge always renders as a permanent `Final: —` placeholder. It is not a thing, yet it occupies the row and implies a settled reasoning that cannot exist.

Underneath the view, the same dead idea threads through the data model: a `notes` field on Finalized filters that no UI ever writes, accepted by the Decision API schema, selected by the details query, and carried through the release-export pipeline (always empty), exposing the always-null placeholder to the external dashboard's import contract for no benefit.

The Final badges themselves also miss the one useful distinction the rest of the row already has: the Ranked Status value distinguishes Ranked (green) from Unranked (neutral) on the entry badges, but the Final badge on that row is one flat default color that says nothing about rank.

## Solution

For reviewers on decided submissions, the approver-votes section is re-tuned, and the dead finalized-reasoning field is purged from the review-side data model while the release export keeps its external contract byte-for-byte:

1. **Entry badges** for NUB tier, PRO tier, and Reasoning render explicitly neutral — the same color the vote form shows for those fields. Ranked Status entries keep their existing Ranked=green / Unranked=neutral distinction.
2. **Final reference badges** for NUB tier and PRO tier render neutral, with the word `Final:` in the site's accent blue (`#7c9cff`), so the settlement is marked by its label, not by coloring the whole badge.
3. **The Ranked Status Final badge** follows its value's rank: Ranked in green, Unranked in neutral, with the same accent-blue `Final:` label — the distinction the entries already carry now exists on the settlement too.
4. **The Reasoning row loses its Final badge entirely.** No placeholder (`—`), no implied settlement; only the approvers' proposed reasoning badges remain.
5. **Data-model purge (review side):** the `notes` field is removed from Finalized filters — the database column (via a migration, with a pre-flight check that no non-null value exists), the Decision request schema (proposed Course filters on a Vote keep their reasoning — that is a different field), the decision write path, and the details payload type. The lead decision form never had a reasoning input, so it loses only the hardcoded null it sent.
6. **Release export unchanged for the dashboard:** the release-export JSON keeps its `notes` key per finalized filter, emitting the same placeholder the documented null→`''` coercion produces today, so the external CS2KZ dashboard import contract (ADR-0008) sees a byte-identical payload. The purge stops above the export; the shaping adapter synthesizes the placeholder at the edge.
7. **Docs:** the glossary records that a Finalized filter carries no reasoning (the Filter note is proposal-only) and glosses the "Final reference badge"; one ADR records the purge and the export rationale; the change ships as a tracked spec.

## User Stories

1. As an approver, I want the NUB tier, PRO tier, and Reasoning badges on a decided submission to look the same as those fields do in the vote form, so that the decided page reads consistently with the review surface and the loud green is gone.
2. As an approver, I want every badge in the votes section to carry an explicit color, so that no badge silently inherits the theme default and wanders back to green after a theme change.
3. As an approver, I want the Ranked Status entries to keep their Ranked=green / Unranked=neutral colors, so that I can tell ranked from unranked proposals at a glance as I can today.
4. As an approver, I want the Final badges for NUB tier and PRO tier to stay neutral with only the word `Final:` picked out in accent blue, so that the settlement reads distinctly from the proposals without reintroducing colored badges everywhere.
5. As an approver, I want the Final badge on Ranked Status to turn green when the lead settled Ranked and neutral when Unranked, so that the final rank is visible at a glance alongside the proposals' rank colors.
6. As an approver, I want the "Final" label on every Final badge to use the site's accent blue, uniform across the three rows, so that "this is the settlement" is one consistent marker.
7. As an approver, I want no Final badge on the Reasoning row at all, so that the row shows only the reasoning each approver actually proposed and never a `Final: —` placeholder implying a settled reasoning that cannot exist.
8. As an approver, I want the proposed reasoning entries to keep rendering exactly as they do today (written text only, missing or blank reasoning omitted), so that only the dead settlement marker disappears.
9. As an approver, I want the decided page to render identically apart from colors and the removed badge, so that no layout, ordering, or visibility rule changes.
10. As a lead approver, I want the same re-tuned section as any approver, so that I inspect the settled record on the same terms as everyone else.
11. As a lead approver, I want the decision form to stay exactly as it is — no reasoning input appears there — so that this change adds no new decision-time writing burden.
12. As a submitting mapper, I want my decided submission's page unchanged — map facts, the lead Decision, and the Finalized filters, and never individual Votes — so that the reviewers-only rule holds.
13. As a maintainer, I want the Finalized-filter `notes` column dropped from the database, so that the dead field stops living in the schema.
14. As a maintainer, I want the purge to run only after a check that every existing `notes` value is empty, so that no real data is ever dropped.
15. As a maintainer, I want the Decision request schema to reject `notes` on Finalized filters while the Vote request schema keeps accepting it on proposed filters, so that the two decision sides encode different truth and cannot drift.
16. As a maintainer, I want the decision write path and the details payload to stop carrying final-filter notes, so that the dead field disappears from every review-side surface.
17. As the external CS2KZ dashboard, I want the release export JSON to keep its per-filter `notes` key with the same placeholder value as today, so that the import contract I paste into is unchanged.
18. As a maintainer, I want the release-export code to satisfy its validation schema exactly as before, so that ADR-0008's externally-versioned contract keeps passing.
19. As a future reader of the codebase, I want the glossary to say a Finalized filter carries no reasoning and that the Filter note exists only on proposals, so that the domain model matches what the code actually does.
20. As a future reader, I want a short ADR explaining why the field existed, why it was purged, and why the export still emits the placeholder, so that the history is not a mystery.
21. As an agent, I want the shape changes — reasoning never carries a Final badge, the Decision schema rejects notes, the write path persists none, and the export still emits the placeholder — covered at the existing pure seams, so that I can change code confidently.

## Implementation Decisions

- **Colors are made explicit, never inherited.** In the decided votes section, every badge gets a concrete color: entry badges for NUB tier, PRO tier, and Reasoning are `neutral` (matching the vote form's other-approver-votes badges); Ranked Status entries keep `success` for Ranked and `neutral` for Unranked; the Final badges for NUB/PRO are `neutral` with the `Final:` label text in accent blue (`text-accent`, the design's `#7c9cff`); the Ranked Status Final badge is `success` when the settled value is Ranked and `neutral` when Unranked, with the same accent-blue `Final:` label. The accent blue, not the badge color, is the settlement marker — answering "green all over the place" without losing the rank distinction.
- **The Reasoning field's Final reference badge is gone from the display model itself.** The pure view model that derives the section's shape stops producing a final reasoning entry — it is never derived, not merely hidden. Reasoning display values become written text only (the `null` placeholder existed solely for the dead settlement marker); the row's doc comments are rewritten to match.
- **The purge is review-side only.** `notes` disappears from Finalized filters across: the database table (column dropped by migration), the Decision request schema, the decision write path and its store contract, and the details payload type/query. The Vote proposal path is untouched — proposed Course filters keep their `notes` (approvers still write reasoning when they vote).
- **Schema seam for the two decision sides.** The shared filter-fields schema currently carries `notes` for both Vote proposals and Finalized filters; `notes` moves up into the Vote proposal schema only. A Vote body still accepts notes; a Decision body no longer does.
- **The lead decision form loses only the hardcoded null.** It never had a reasoning input, so the form's payload stops sending `notes: null`; no UI appears.
- **Release export keeps its contract (ADR-0008).** The ordered-manifest layer drops the notes field along with the review-side purge; the export shaping adapter re-synthesizes the `notes` key per finalized filter with the same placeholder the documented null→`''` coercion produces today, so the JSON pasted into the external CS2KZ dashboard's import dialog is byte-identical. The shared snake_case export schema keeps its nullable `notes` key untouched.
- **Migration with a safety pre-flight.** The column drop ships as the next drizzle-kit migration. Before running it, the operator verifies no row holds a non-null `notes` — expected, since no writer ever produced one — and halts otherwise. No data backfill is needed; the export is never persisted and is always rebuilt from live rows.
- **Docs.** The glossary's Filter note entry is reworded to proposal-only ("a Finalized filter never carries one") and the Finalized filter entry notes it carries no reasoning; the "Final reference badge" display concept is glossed. A new ADR records the purge: the field was un-writable from day one, the badge was a permanent placeholder, the review-side surface is purged, and the export placeholder is retained deliberately for the external contract — including the rejected alternative of keeping the field for a future lead reasoning input.

## Testing Decisions

- **What makes a good test here:** external behavior at the pure seams — the display model's shape (which badges exist, which fields have a Final entry, what values render), the wire schemas' acceptance rules, the write store contract, and the export payload's shape. Not component markup, not colors, not migration mechanics.
- **Cardinal rule observed:** the reasoning field never carries a Final reference badge, and the release export still emits its notes placeholder. Tests assert both in both directions (the shape has no final reasoning; the export keeps the key).
- **Seams (four existing pure seams, one per touched module; endpoint-handler tests have no prior art in this repo and are not invented here):**
  1. **The approver-votes view model** — the section's shape derivation moves to: reasoning's final entry is always absent; entries and the ranked/nub/pro finals keep their existing projection; written-proposal and missing-cell rules unchanged.
  2. **The review-write wire schemas** — Decision bodies reject `notes` on Finalized filters; Vote bodies still accept `notes` on proposed filters.
  3. **The decision write spine** with its fake store — `replaceFinalFilters` persists final-filter records without notes.
  4. **The release export shaping** — the JSON keeps a per-finalized-filter notes placeholder after the manifest drops the field.
- **Prior art:** `tests/server/utils/approver-votes-view.spec.ts` (vote-history ticket 02), `tests/server/utils/review-write-schemas.spec.ts`, `tests/server/services/review-write/finalize-submission.spec.ts`, and `tests/server/utils/export-release.spec.ts` — all pure-function or fake-store specs under the repository's node-env vitest setup.
- **Deliberately not covered:** badge colors (the repo has no component-test harness and colors are component-locally decided, matching the `OtherApproverVotes` precedent; guarded by typecheck and the in-browser verification below) and the migration itself (an ops step with its pre-flight check).
- **Verification recipe:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, plus an in-browser pass over an approved and a rejected decided submission as an approver (saved session) confirming the neutral entries, the accent-blue `Final:` labels, the rank-colored Final badge, and no reasoning Final badge — and one approved release whose export JSON still carries the notes placeholder.

## Out of Scope

- The pending-review surfaces: the vote form, the lead decision form, their inline other-approver votes, and the approver checklist are untouched.
- The approver-proposed `notes` field on Vote Course filters: approvers keep writing reasoning; only the Finalized-filter copy is purged.
- The mapper-facing read-only courses section: it never rendered finalized reasoning, so nothing changes there.
- The Status of Approval section and the Decision panel: untouched.
- The release image pack and the release manifest's other fields: untouched.
- Any change to the external dashboard's import contract: the export payload is deliberately byte-identical.
- A lead reasoning input: neither built nor promised; the ADR records the rejected alternative.
- Renaming the "Reasoning for Tier" label, any timestamps, or any other display material on the decided page.
- A data backfill or historical-export rewrite: unnecessary and out of scope.

## Further Notes

- **Fact on record:** the Finalized-filter notes field was never writable — the lead decision form hardcoded null since the decision form gained its filter grid — so the Reasoning row's Final badge always rendered `Final: —`, which is precisely why "it's not a thing".
- **Value precision on the export placeholder:** today the export adapter's documented null→`''` coercion means the dashboard-facing value has always been the empty string; "keep it null" fixes the *key's existence*, and the spec preserves the payload byte-for-byte (placeholder emitted as `''`), which is strictly stronger than any null semantics.
- **Slug and tracker:** this spec lives at `.scratch/final-badges-reasoning-purge/`; it directly amends the decided page delivered by the `vote-history` effort, so the two specs should be read together.