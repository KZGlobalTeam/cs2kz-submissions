# 01: Decided-view badge tuning — neutral entries, accent-blue "Final" labels, no reasoning settlement

**What to build:** Rework the visual presentation of the approver-votes section on decided submissions so the loud default-colored badges disappear and the settlement reads clearly. The NUB tier, PRO tier, and Reasoning entry badges render explicitly neutral — the same color the vote form shows for those fields — so no badge silently inherits the theme default. The Final reference badges on NUB tier and PRO tier stay neutral and are marked by the word `Final:` in the site's accent blue, instead of by a colored badge. The Ranked Status Final badge follows its value's rank — green when the lead settled Ranked, neutral when Unranked — with the same accent-blue `Final:` label, so the rank distinction the entry badges already carry now exists on the settlement too. The Reasoning row loses its Final badge entirely: no `Final: —` placeholder, no implied settled reasoning — only the reasoning each approver actually proposed remains. The section's display model stops deriving a reasoning settlement altogether, and its unit tests assert the new shape.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] On decided submissions, the NUB tier, PRO tier, and Reasoning entry badges render explicitly neutral, identical in color to those fields in the vote form; no badge inherits the theme default color.
- [x] The Ranked Status entry badges keep their existing Ranked=green / Unranked=neutral colors, unchanged.
- [x] The Final reference badges on NUB tier and PRO tier render neutral and carry the word `Final:` in the site's accent blue (`#7c9cff`).
- [x] The Final reference badge on Ranked Status renders green when the settled value is Ranked and neutral when Unranked, with the same accent-blue `Final:` label.
- [x] The Reasoning row renders no Final badge and no placeholder dash — only proposed reasoning badges, which keep rendering written text only (missing or blank reasoning omitted exactly as today).
- [x] The display model never derives a reasoning settlement entry — unit tests assert its absence and that every other shape rule holds unchanged: tier values as numbers 1–10, Ranked/Unranked labels, proposals attributed by approver name, a Vote proposing no filter on a Course contributing no badges, and the zero-vote decided shape.
- [x] The section's layout, ordering, and visibility rules are otherwise untouched; pending submissions and the vote/decision forms are not modified.
- [x] Verified in the browser as an approver on an approved and a rejected decided submission (before/after captured), and `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.

---

## Shipped

Committed as the working tree with `ApproverVotesSection` re-tuned: NUB/PRO/Reasoning
entries explicitly `neutral` (matching the vote form's other-approver votes), Ranked
Status entries keep Ranked=green / Unranked=neutral, every Final reference badge is
`neutral` — green on Ranked Status only when the settled value is Ranked — and its
`Final:` word renders in `text-accent` (`#7c9cff`). The Reasoning row renders proposals
only: the view model's `ReasoningBadges` carries no final entry, so no `Final: —`
placeholder is ever derived. Browser-verified as Reeed on the approved kz_mescaline
(`Final:Ranked` green; `Final:3/4/10/Unranked` neutral; all `Final:` label spans compute
to `rgb(124, 156, 255)`; reasoning rows show only proposed text) and the rejected
kz_warrior (no Final badges, entries neutral/green per field and value); pending vote
form untouched.