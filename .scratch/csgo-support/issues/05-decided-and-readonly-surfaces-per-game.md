# 05: Decided and readonly surfaces render per game

**What to build:** The read-only surfaces on submission detail pages — the approver-votes section, the Status of Approval section, and the readonly courses with their Finalized filters — render the submission's game's mode sets, so a decided CS:GO submission shows Final reference badges for KZT, SKZ, and VNL while decided CS2 pages stay exactly as they are.

**Blocked by:** 04.

**Status:** ready-for-agent

- [ ] The approver-votes section on a decided CS:GO submission shows one block per course per CS:GO mode (KZT, SKZ, VNL) with the same fields as CS2 (Ranked Status, NUB tier, PRO tier, proposed reasoning) and Final reference badges for the settled filters.
- [ ] The Status of Approval section and the readonly courses with Finalized filters render per the submission's game.
- [ ] The mapper-facing detail view (finalized filters only) renders per the submission's game.
- [ ] Decided CS2 pages render byte-for-byte as today.
- [ ] Tests at seams B and C: the per-game rendering helpers and the manifest/query projections are covered through the existing pure-helper and service-fake tests; CS2 regression cases stay green.