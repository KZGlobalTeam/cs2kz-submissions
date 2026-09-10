# 02: Game spine — pages, navigation, switcher

**What to build:** Every page lives under a game segment (`/cs2/…`, `/csgo/…`), the bare path redirects to `/cs2`, and a single top-bar switcher is the only place the game changes — flipping it re-scopes every page, with no game badges anywhere. Activating the switcher from the edit page discards the in-progress form and lands on the target game's submissions overview.

**Blocked by:** 01.

**Status:** ready-for-agent

- [x] All pages render under their game segment; the bare path redirects to `/cs2`.
- [x] One top-bar switcher swaps the game context and is present wherever the app shell is.
- [x] Route middleware rejects a request for an unknown game segment.
- [x] Activating the switcher from the edit page leaves the editor, discards unsaved edits, and lands on the target game's submissions overview.
- [x] Shared links and page navigations carry the game segment, so a link opened elsewhere lands in the same game.
- [x] No page renders a game badge (the context is the whole mechanism).
- [x] Navigation behavior and the switcher are verified manually (seam decision S2); any pure route/game helpers extracted along the way are covered by seam C tests.

## Comments

Implemented 2026-09-10:

- Pages moved under `pages/[game]/…` (submissions list/new/detail/edit, review, releases list/new/detail, admin approvers); the bare `pages/index.vue` is now a `redirect: '/cs2'`, and the old login page moved to `pages/[game]/index.vue` (still `layout: false`), redirecting by role into the current game's `review`/`submissions`. The Steam auth callback lands on `/cs2`-scoped `review`/`submissions`.
- One top-bar switcher: new global route middleware `middleware/game.global.ts` rejects an unknown/malformed game segment with a 404 before any page renders (routes without a segment — the bare redirect and API routes — pass through). New `components/common/GameSwitcher.vue` (rendered in the default layout's header, so it is wherever the app shell is) flips the context by navigating to `gameSwitchPath(target, route.path)`: the same page re-scoped in the target game with the query preserved, except the edit page, which exits to the target game's submissions overview — a navigation consequence, no per-form state to reset. The layout keys `<main>` by the game, so flipping remounts every page (fresh setup, fresh data fetches, no cross-game cache bleed), and the sidebar nav items are game-scoped.
- Shared helpers in `shared/utils/games.ts` (seam C): `gameLabels`/`gameOptions` (switcher vocabulary derived from the shared enum), `isGameSegment`, `coerceGame`, `gamePath`, `apiGamePath`, and `gameSwitchPath` (same-page re-scope vs edit exit). `composables/useGameRoute.ts` resolves the current game from the route (defensive `cs2` fallback). All client fetches moved to `apiGamePath(game, …)` and all navigations to `gamePath(game, …)`; `usePaginatedTable` keys and `useAsyncData` keys are game-scoped so switching games can never serve another game's cached rows. Auth/approver/lead middleware redirect to the current game's submissions.
- No page renders a game badge: the switcher in the header is the only place the game appears.
- Verification: typecheck clean, lint clean (3 pre-existing `v-html` warnings only), full suite 340 tests passing, including new seam-C spec `tests/server/utils/games.spec.ts` and the updated `use-release-export.spec.ts` (game-scoped export URL, reactive to a route game switch). Manual browser pass (seam S2, via pw-session): `/` → 302 → `/cs2`; logged-in shell renders on every section page with the switcher; flipping cs2↔csgo re-scopes URL, nav and page (filters preserved, e.g. `/cs2/review?status=approved&unvoted=true` → `/csgo/review?status=approved&unvoted=true`); rules-dialog proceed lands on the game's `submissions/new`; switching from the edit page lands on the target game's submissions overview; `/kzt/…` → 404; per-game mine lists (created scratch rows in both games via the API, each appeared only in its own game's list) — scratch rows deleted afterwards.
- Note: applied the pending ticket-01 migration (`0010_productive_tarantula.sql`) to the remote DB — it had not been run, so the `game` column was missing and every game-scoped read 500'd; after `pnpm db:migrate` both games' reads work.
- Reviewed via the two-axis code-review skill (both axes BLOCK on the same finding): the Steam-auth callback landing was still segmentless (`/review`|`/submissions`), which the page move turned into a 404 — fixed to `/cs2/review`|`/cs2/submissions`. Same review also flagged: `middleware/auth.ts` now preserves the attempted game segment on an expired session (was hardcoded `/cs2`), a dead comment in `games.ts` was deleted, and the Discord notification embed links — the app's only real shared links — now carry the submission's own game (`/cs2/submissions/{id}` etc.) via the notifier's post-commit context read (the embed Game field/sender rename remain ticket 07). Non-blocking standards note (ticket-04 interim, pre-existing): `useVoteForm`/`LeadDecisionPanel` still seed both `modesForGame('cs2')` in two places — that duplication is ticket 04's per-game rework.