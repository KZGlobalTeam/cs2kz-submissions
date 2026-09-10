# CS:GO support: two games, one submission portal

**Status:** ready-for-agent

## Problem Statement

The site currently carries the approval process for one game only: CS2. The community also needs the same approval pipeline for CS:GO maps. CS:GO's ecosystem differs from CS2's in four concrete ways:

- **Three rating filters instead of two.** CS2 courses are rated in two Course modes (classic, labelled CKZ, and vanilla, labelled VNL). CS:GO courses are rated in three: kztimer (KZT), simplekz (SKZ), and vanilla (VNL).
- **No ports.** A CS:GO map is an original that later gets ported to CS2 — the port concept (the isPort flag, the authorization screenshot, the porting rules step) belongs to CS2 only.
- **Constrained course naming.** CS:GO course names are not arbitrary: the convention is `Main`, `Bonus 1`, `Bonus 2`, … CS2 keeps free names.
- **Different submission rules.** CS:GO submissions have their own rules document; for now it is a copy of the CS2 rules, to be replaced by a community draft later. The two games must never share one rule set.

Two further consequences follow from the site's release pipeline, which today packages approved maps into per-named releases whose JSON exports to the external CS2KZ dashboard: releases must become **per-game** (a CS:GO release can never contain a CS2 map), and the CS:GO export needs its own JSON shape — currently **undecided** (it will eventually feed a CS:GO KZ API dashboard, not the CS2KZ one), so a provisional placeholder ships in the meantime.

## Solution

One portal serves both games, scoped by a **global game context** rather than by badges or filters sprinkled through pages:

1. **One place to switch game.** A single switcher in the top bar changes the whole app's context. Routes carry the game (`/cs2/…`, `/csgo/…`); the bare path redirects to `/cs2`. No page ever shows a game badge, because every page is already about one game.
2. **Submissions belong to a game.** Every submission row stores its game, set by the context it was created in (the create form has no game picker — the context is the picker). Editing takes place inside the same game; switching game from the edit page exits the editor and lands on the target game's submissions overview, discarding unsaved edits.
3. **CS:GO course names are prefilled, not typed.** When the mapper creates a CS:GO submission, the first course is automatically named `Main` (non-editable); each "Add Course" appends `Bonus 1`, `Bonus 2`, … following order. The API enforces the same convention server-side.
4. **CS:GO has no port flow.** The CS:GO form has no port question, no authorization-upload, and no porting rules step; the CS:GO rules copy drops the porting group. The API rejects any port evidence on a CS:GO submission.
5. **Per-game modes and rules.** CS:GO courses are rated in KZT/SKZ/VNL with the same nub/pro tiers, ranked semantics, and the same 10-level scale as CS2; rules are keyed per game and the approver checklist mirrors the submission's game's groups.
6. **Releases are per-game.** Releases are created in the current context and their game is fixed; attachability lists and attach validation filter by the release's game. The CS2 export stays byte-identical (ADR-0008 contract); the CS:GO export emits a provisional JSON with `kzt`/`skz`/`vnl` filter keys, gated on all three modes being finalized per course. The image pack works unchanged for both.
7. **Branding and notifications.** The portal reads "KZ Global Submission Portal"; the Discord sender becomes "KZ Submissions" and every embed carries a Game field; embed links carry the game context.

Mappers, approvers, and leads do the exact CS2 flows they already know, in the game context they picked — nothing about voting, decisions, or review changes except the mode set.

## User Stories

1. As a mapper, I want to create a submission inside the current game context, so that the form, rules, and validations match the game I'm submitting for.
2. As a mapper submitting a CS:GO map, I want the form's first course to be pre-named `Main` and non-editable, so that the naming convention is impossible to violate by accident.
3. As a mapper submitting a CS:GO map, I want every "Add Course" to append a course pre-named `Bonus 1`, `Bonus 2`, … following the existing order, so that names always match the convention.
4. As a mapper submitting a CS:GO map, I want my course names to stay derived from course order even after removing or re-adding courses, so that the convention is invariant.
5. As a mapper submitting a CS2 map, I want course names to remain free text exactly as today, so that the CS2 flow is untouched.
6. As a mapper submitting a CS:GO map, I want no port question, no authorization-image upload, and no porting rules step anywhere in the flow, so that the form reflects a game that has no ports.
7. As a mapper submitting a CS2 map, I want the port flow to remain exactly as today, so that ports keep their permission evidence.
8. As a mapper, I want the pre-submission rules dialog to show the current game's rule set — CS:GO shows the CS:GO copy, CS2 shows the CS2 rules — so that I acknowledge the rules that actually apply.
9. As a mapper editing a CS:GO submission, I want my course names to remain non-editable and derived from order, so that I can never accidentally rename a course out of the convention.
10. As a mapper editing any submission, I want the game to stay fixed, so that I never accidentally move content between games.
11. As a mapper, I want switching game from the edit page to leave the editor and land on the target game's submissions overview with my unsaved edits discarded, so that I never save half-edited content into the wrong game.
12. As a mapper, I want my submissions list to show only the current game's submissions, so that the list is always about one game without badges.
13. As a mapper, I want to get a clear API rejection if a CS:GO submission ever carries port evidence, so that the no-ports rule holds even for direct API calls.
14. As a mapper, I want to get a clear API rejection if a CS:GO submission ever carries a course name outside the `Main`/`Bonus N` convention, so that the naming rule holds even for direct API calls.
15. As an approver, I want the vote form on a CS:GO submission to rate each course in three modes — KZT, SKZ, VNL — each with nub tier, pro tier, ranked state, and notes, so that I can propose filters for all three communities.
16. As an approver, I want the vote form on a CS2 submission to stay exactly as today (CKZ and VNL), so that the CS2 review surface is untouched.
17. As an approver, I want the same 10-level tier scale and the same ranked/awaiting/unranked semantics on both games, so that one rating vocabulary covers the whole site.
18. As an approver, I want the review queue to show only the current game's pending submissions, so that I review one game at a time.
19. As an approver, I want the other game's pending submissions to require switching the game context to see, with no count hints anywhere, so that the switcher is the single mechanism (by explicit choice, no cross-game awareness UI).
20. As an approver, I want the readonly/decided views on a CS:GO submission to show KZT/SKZ/VNL per course, so that deciding and history read consistently with the vote form.
21. As an approver, I want to be rejected with a clear error if I ever submit a vote whose filter mode does not belong to the submission's game, so that a CS:GO submission can never carry a classic/vanilla rating.
22. As a lead approver, I want the lead decision panel on a CS:GO submission to offer KZT/SKZ/VNL per course, so that I can finalize filters for all three modes.
23. As a lead approver, I want the decision write path to reject finalized filters whose mode does not belong to the submission's game, so that the stored record is always game-consistent.
24. As a lead approver, I want to create a release inside the current game context, with the release's game fixed to that context, so that a CS:GO release is definitionally a CS:GO release.
25. As a lead approver, I want the release's attachable-submissions picker to list only approved submissions of the release's game, so that I cannot offer a cross-game map.
26. As a lead approver, I want attaching a submission whose game differs from the release's game to be rejected even when the request comes directly to the API, so that no cross-game release row can ever exist.
27. As a lead approver, I want the CS2 release export to remain byte-identical to today's payload, so that the external CS2KZ dashboard import contract (ADR-0008) is untouched.
28. As a lead approver, I want the CS:GO release export to produce a provisional JSON payload with per-course `kzt`/`skz`/`vnl` filter objects, so that the CS:GO dashboard story has a concrete shape to iterate on.
29. As a lead approver, I want the CS:GO release export to refuse with a clear error when any course lacks all three modes' finalized filters, so that the placeholder contract only ever ships complete courses.
30. As a lead approver, I want exporting a CS:GO release to mark the release exported exactly like CS2, so that the exported flag is one mechanism for both games.
31. As a lead approver, I want the release's image pack to work identically for both games, so that course images ship without game-specific code.
32. As a member of the CS:GO community, I want the submission rules shown to CS:GO mappers to be their own copy — not the shared CS2 set — so that the two games can never drift into one rule set.
33. As a member of the community, I want the CS:GO rules copy to initially be the CS2 rules minus the porting group, so that a sensible placeholder exists until the real CS:GO draft replaces it.
34. As an approver, I want my private checklist on a CS:GO submission to mirror the CS:GO rule groups (including no porting group), so that I check the same things the mapper acknowledged.
35. As anyone visiting the site, I want every page to belong to one game context and the top-bar switcher to be the single place the game changes, so that there is never any ambiguity about which game a page is about.
36. As a reviewer sharing a link, I want links to carry the game context, so that the person I share with lands in the same game.
37. As a user hitting the bare path, I want to be redirected to the CS2 context, so that there is always a well-defined default.
38. As a maintainer, I want existing submissions and releases to migrate to the CS2 game with no data loss, so that history is preserved without any guessing.
39. As a maintainer, I want the port-authorization columns to remain on the submissions table, simply always-null for CS:GO rows, so that no destructive migration is needed for a field CS:GO never touches.
40. As a maintainer, I want one shared enum of five course modes, with each game's allowed set enforced in code, so that the DB enum and the wire validation cannot drift.
41. As the external CS2KZ dashboard, I want the CS2 release export to keep its `classic`/`vanilla` keys and `notes` placeholders byte-for-byte, so that my import dialog never changes.
42. As a future reader of the codebase, I want the glossary to define Game and to scope Course mode, Port, Submission rules, and Release per game, so that the domain model matches the code.
43. As a future reader, I want an ADR recording the game discriminator, the scoped contexts, the per-game releases, and the provisional CS:GO export, so that the history of these choices is not a mystery.
44. As an agent changing this code, I want the per-game rules tested at the existing pure and module seams (wire schemas, service fakes, client helpers, export utils), so that I can change code confidently.

## Implementation Decisions

- **Game discriminator.** A `game` enum (`cs2` | `csgo`) is added to submissions and releases. A migration backfills every existing row to `cs2`. No other table needs the discriminator: courses, votes, filters, and attachments live under their submission, which already knows its game.
- **Route-scoped contexts.** Page routes and API routes carry the game as a URL segment (`/cs2/submissions/…`, `/csgo/review/…`; the API mirrors it, `/api/cs2/submissions/…`), so links, server middleware, and the client agree on the game without shared state. The bare path redirects to `/cs2`. A single top-bar switcher is the only place the game changes; activating it while editing navigates to the target game's submissions overview, discarding in-progress edits (no per-form game state exists, so nothing needs resetting). Server-side route guards validate the game segment.
- **Context supersedes the per-form picker.** The create form carries no game picker: the current context is the picker. (Reconciled from round 1: the "explicit required picker" idea is superseded by the single-switcher architecture settled in round 3.)
- **Course modes stay one enum, scoped per game.** The shared `course_mode` enum grows to five values (`classic`, `vanilla`, `kzt`, `skz`, `vnl`). A shared constant maps game → allowed modes (`cs2`: classic/vanilla, `csgo`: kzt/skz/vnl) and game → UI labels (`CKZ`/`VNL` vs `KZT`/`SKZ`/`VNL`). The vote form, lead panel, readonly views, and the release manifest iterate the submission's game's mode set; `review-write` rejects any vote/decision filter whose mode is outside the submission's game's set with a 400.
- **CS:GO course naming by construction + validation.** On the CS:GO form, course names are derived from course position and rendered non-editable: the first course is `Main`, the `N`-th bonus is `Bonus N`. The shared wire schema enforces the same convention server-side (names must be exactly `Main` + `Bonus 1..N` in ascending order, `Main` mandatory and first, at least one course), so a direct API write with a free name is a 400. CS2 names stay free text. Stored `orderIndex` remains 1-based as today; the name derives from it.
- **Ports are CS2-only.** The shared wire schema rejects any port evidence on a CS:GO submission (isPort must be false, no authorization image, no port notes). The CS:GO form omits the port section; the CS:GO rules omit the porting group. The port-authorization columns remain on the table, always null for CS:GO rows.
- **Rules are per-game.** The rule steps become a game-keyed lookup. The CS:GO set is a copy of the CS2 steps minus the porting group — an explicit placeholder until the community's own CS:GO draft exists. The approver checklist continues to mirror the rule groups via the existing mechanism, now keyed by the submission's game, so the porting group never renders on a CS:GO submission.
- **Releases and export.** Releases are created in the current game context and their game is fixed thereafter (releases have no content-edit flow). The attachable-submissions picker filters by the release's game; attach validates game equality (a pure predicate consulted at the endpoint, per seam S1) and rejects cross-game adds with a 400. The image pack is game-agnostic and unchanged. The JSON export becomes per-game: for CS2, the payload stays byte-identical to today (ADR-0008 contract, `classic`/`vanilla` keys, `notes` placeholders); for CS:GO, the payload is a provisional JSON mirroring the CS2 skeleton with `kzt`/`skz`/`vnl` filter keys, refused with a 400 when any course lacks all three modes' finalized filters, and export still marks the release exported. The CS:GO shape is explicitly provisional — the shaping adapter is the single place that knows it, so swapping in the real KZ-dashboard contract later touches exactly one seam.
- **Branding and notifications.** The login page reads "KZ Global Submission Portal"; the Discord sender becomes "KZ Submissions"; every embed gains a `Game` field; submission links in embeds carry the game segment.
- **What does not change.** Voting, decisions, review queue mechanics, rejection attachments, notifications logic, upload validation (both games keep the 1920×1080 JPG course-image spec), role gates, pagination — only the mode sets, the game scoping, and the release/export split are new.

## Testing Decisions

- **Ethos.** Tests assert external behavior through the established seams — the shared wire schemas, the service-module spines against their in-memory fakes, and the pure client helpers — never implementation details. This mirrors the repo's existing test suite.
- **Shared wire schemas (seam A).** Extend the existing submission-input-schema and review-write-schemas specs: a CS:GO input with port evidence fails; a CS:GO input with a free course name fails and the convention (`Main`/`Bonus 1..N`) passes; a CS2 input keeps today's rules; the five-value mode enum is accepted at the schema layer.
- **Service modules with fakes (seam B).** Extend the existing fake-store harnesses for `submission-content` (the game lands on the row on create/update), `review-write` (a vote or decision proposing a mode outside the submission's game's set is rejected; in-game modes persist), `review-queue` (reads filter by the context game), and `release-contents` (the manifest resolves filters per the release's game — two modes for CS2, three for CS:GO).
- **Client pure helpers (seam C).** Test in the existing pure-function style: the game-keyed rules lookup (CS:GO has no porting group), the course-name prefill helper (`Main`, `Bonus 1…N`), and the per-game mode sets/labels shared by the vote form and lead panel.
- **Export utils + API level (seam D).** Extend export-release specs: the CS2 payload is unchanged byte-for-byte; the CS:GO payload carries `kzt`/`skz`/`vnl` keys and 400s on missing finalized filters. Add a pure test for the attach game-match predicate and an API-level test for the game-scoped submissions read (precedent: `submissions/index.get.spec.ts`).
- **Not automated.** Route-prefix navigation, the top-bar switcher, and the edit-page exit are verified manually (seam decision S2); the pure helpers they depend on are covered by seam C.

## Out of Scope

- The final CS:GO export JSON contract: only the provisional placeholder ships; the real shape lands when the CS:GO KZ dashboard API is known.
- The community's real CS:GO submission rules: the CS:GO copy is a placeholder; the draft is authored by the user separately.
- Detecting the game from the workshop URL or Steam app ID: the game comes from the route context, never inferred.
- Cross-game UI: no game badges on pages, no mixed queues, no per-game count hints (explicitly chosen — the switcher is the whole mechanism).
- kztimer/simplekz/vanilla tier conversions or leaderboard/API integrations beyond the placeholder export.
- End-to-end browser automation for the switcher and routes.
- A full releases module fake seam (kept to a pure predicate plus API-level coverage, per seam decision S1).
- Any change to the CS2KZ dashboard import contract (byte-identical, ADR-0008).

## Further Notes

- Docs accompany this change: the glossary gains `Game` and scopes `Course mode`, `Port`, `Submission rules`, `Release`, and `Course` per game, with the KZT/SKZ/VNL vs CKZ/VNL labels; one ADR records the game discriminator, the route-scoped contexts, per-game releases, and the provisional CS:GO export.
- Migration ordering: add the enum and columns, backfill to `cs2`, then ship code that requires the column. No destructive steps; the port columns are untouched.
- Every stored submission and release row keeps its own game, so the database never depends on client context — the route is navigation, the row is truth.
- The CS:GO rules placeholder being a "copy of CS2 minus porting" is a content decision, not structural: the per-game structure is final, only the copy's wording will be replaced.