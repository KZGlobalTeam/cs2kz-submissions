# 04: Review a CS:GO submission — per-game modes

**What to build:** Reviewing a CS:GO submission works exactly like CS2 except the course-mode vocabulary: each course is rated in three modes — KZT, SKZ, VNL — with the same nub/pro tiers, ranked semantics, notes, and the same 10-level scale. The vote form, the lead decision panel, and the approver's private checklist render the submission's game's modes and rule groups, and the API rejects any filter proposing a mode that does not belong to the submission's game.

**Blocked by:** 01, 02, 03.

**Status:** ready-for-agent

- [ ] The shared course-mode enum grows to five values (classic, vanilla, kzt, skz, vnl) via migration, and per-game allowed mode sets and labels (CKZ/VNL vs KZT/SKZ/VNL) live in one shared constant.
- [ ] The vote form on a CS:GO submission shows three filters per course — KZT, SKZ, VNL — each with nub tier, pro tier, ranked state, and notes; the CS2 vote form shows CKZ and VNL unchanged.
- [ ] The lead decision panel on a CS:GO submission offers the three CS:GO modes; the CS2 panel is unchanged.
- [ ] The review write path rejects a vote or decision whose filter mode is outside the submission's game's set with a 400.
- [ ] The approver's private checklist on a CS:GO submission mirrors the CS:GO rule groups, with no porting group.
- [ ] Both games use the same 10-level tier scale and the same ranked/awaiting/unranked semantics (unchanged shared schemas).
- [ ] Tests at seams A and B: per-game mode validation and the out-of-game-mode rejection are covered through the wire schemas and the review-write service seam with its fake store; CS2 review regression cases stay green.
- [ ] If the mode-vocabulary prefactor ticket (00) was not taken first, this ticket's first step is the equivalent extraction before the behavior change.