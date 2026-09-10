# 01: Game spine — data and API

**What to build:** The portal's data and API learn about games. Every submission and release row carries a game (`cs2` or `csgo`), with all existing rows backfilled to `cs2`. Every API endpoint carries a validated game segment, so reads return only that game's rows and writes stamp rows with the route's game. Attaching a submission to a release of another game is rejected.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] A migration adds the `game` enum and columns to submissions and releases; every existing row is backfilled to `cs2` with no data loss.
- [x] Every API endpoint accepts a game segment and rejects an unknown or malformed one with an error.
- [x] The mine submissions list, the review queue, the release detail, and the release attach-candidates read return only rows of the requested game.
- [x] Creating a submission or release stamps the row with the game from the route.
- [x] Attaching a submission whose game differs from the release's game is rejected with a 400, even on a direct API call.
- [x] The whole surface behaves exactly as today when the requested game is `cs2` (the current default).
- [x] Tests: per-game reads and the attach game-match are covered at the API level and as a pure predicate respectively (seams A and D); the review-queue and release-contents reads are covered through their existing service seams with fakes.

## Comments

Implemented 2026-09-10:

- Migration `0010_productive_tarantula.sql`: `game` enum (`cs2` | `csgo`) plus columns on submissions and releases; `ADD COLUMN … DEFAULT 'cs2' NOT NULL` backfills every existing row in-statement, no data loss; port columns untouched. `gameEnum` derives from the shared `gameValues` array (votes.ts pattern) with a drift-guard assertion beside the existing "DB enums derive" test.
- API routes restructured under `server/api/[game]/…` (submissions: index, detail, edit, delete, vote, decision; releases: index, create, detail, delete, export, images, attach, detach). Every one validates the segment via `requireRouteGame` (`server/utils/route-game.ts`) — unknown/malformed/missing → 400 before auth or reads. Auth, admin, and uploads stay ungated (game-agnostic).
- Reads scoped by game: mine list and review queue through `ReviewQueueFilters.game` (required; resolved+fake store agree), release list/detail via `listReleases({game})`/`findReleaseById(id, game)` (mismatch → 404), attach-candidates are the game-scoped queue read, and release resolution (`resolveReleaseContents(releaseId, game)`) refuses an other-game release — 404 before export/export-marking. No row wire shape changes beyond the additive `game` column the detail/create responses already carry.
- Writes stamp the route's game: `createSubmission(user.id, game, body)` and the release create insert both set `game` from the segment. Edits never change a row's game. Attach validates `gamesMatch(submission.game, release.game)` (pure predicate, `server/utils/attach-game-match.ts`) and 400s a cross-game attach even on a direct API call; release-not-found is now an explicit 404.
- Client call sites (pages/components/composables) were mechanically updated to `/api/cs2/...` to keep the app green after the route move (the game segment is hardcoded `cs2` for now — ticket 02 parameterizes it with the switcher; Nuxt's typed `$fetch` failures made the move unmissable).
- Tests: API-level game-scope + segment-400s (`tests/server/api/[game]/submissions/index.get.spec.ts`); pure predicate (`attach-game-match.spec.ts`); review-queue and release-contents seams extended with fakes (game-filtered reads, other-game release 404); create stamps the game onto the row.
- Verification: 320 unit tests passing, typecheck clean, lint clean (3 pre-existing `v-html` warnings only). Reviewed via the two-axis code-review skill — the one spec-axis finding (release DELETE missing segment validation) and the standards-axis findings (enum derivation, trailing newlines, stale comment paths) are fixed.
- Not in scope (later tickets): page routes/middleware/switcher (02), CS:GO course naming and port rules (03), per-game modes (04), readonly surfaces (05), per-game release export shapes (06), branding/notifications (07).