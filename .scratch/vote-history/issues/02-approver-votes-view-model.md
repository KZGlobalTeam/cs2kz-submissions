# 02: Approver-votes view model

**What to build:** The pure derivation behind the approver-votes section (the spec's single test seam). A stateless module maps the details payload — courses, Votes, and Finalized filters — into the badge structure the page renders verbatim: per Course and per Course mode, per-field badge groups (Ranked Status, NUB tier, PRO tier, Reasoning) with one entry per approver plus a "Final" reference entry per field. Tier values render as numbers 1–10, ranked state as Ranked/Unranked, reasoning as text. Votes that proposed nothing on a Course contribute nothing there, and empty reasoning is omitted. A decided submission with zero Votes yields a well-defined empty shape. No UI in this ticket; the test suite is the verification.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The module takes the payload's courses, Votes, and Finalized filters and returns, per Course and per Course mode, badge groups for Ranked Status / NUB tier / PRO tier / Reasoning: each badge carries the approver's name and a display value (tier as a number 1–10, ranked as Ranked/Unranked, reasoning as text).
- [ ] Each field's badge group also carries one "Final" entry derived from the Course's Finalized filter for that mode.
- [ ] A Vote that recorded no proposed Course filter on a Course contributes no badges there; empty reasoning entries are omitted.
- [ ] A decided submission with zero Votes produces a well-defined empty shape suitable for the Status of Approval empty state.
- [ ] The types line up exactly with the existing details-payload types — no drift copies introduced.
- [ ] Unit tests in the repository's pure node-env style cover every case above, including multi-approver attribution and the missing-cell cases.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` all pass.