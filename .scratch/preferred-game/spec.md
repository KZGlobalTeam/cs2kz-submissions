# Preferred game, game-neutral sign-in, and the user-card game switch

**Status:** ready-for-agent

## Problem Statement

Signing in is tied to a game that isn't the user's: the sign-in page lives under the game spine (`localhost:11451/cs2` is the login URL), and every Steam callback lands in CS2 regardless of which game the user actually works in. To sign in for CS:GO work, a user signs in, lands in CS2, and must switch games afterward. The game switch itself sits in the top bar, divorced from the account area where a user's working context naturally lives.

## Solution

Sign-in becomes game-neutral and preference-driven:

1. **A neutral sign-in page at the bare root.** The login URL is `localhost:11451` — no game segment. The sign-in page carries a **CS2 | CS:GO picker** alongside the Steam button, defaulting to the stored preference (CS2 the very first time).
2. **Sign-in lands in your preferred game.** The Steam callback routes to the picked game's role page: approvers/lead approvers land on `/review`, everyone else on `/submissions`, all prefixed with the preferred game (`/csgo/review`, `/cs2/submissions`, …). The preferred game always wins — the attempted game is no longer preserved.
3. **The game switch moves into the user card**, under the avatar/name/logout row, and doubles as the preference editor: flipping it re-scopes the current page *and* updates the preference, so the next sign-in lands where you last worked.

The preference is stored per browser in a cookie — no database, no account property, no cross-device syncing. The game spine itself is untouched: every page still lives under `/cs2/…` / `/csgo/…`, deep links still carry the game, and switching still re-scopes the current page (the edit page exits to the overview, discarding unsaved edits).

## User Stories

1. As a visitor, I want to sign in at the bare root URL with no game segment, so that logging in is never tied to a game.
2. As a visitor, I want a CS2/CS:GO picker on the sign-in page, so that I can choose which game I land in after signing in.
3. As a first-time visitor with no stored preference, I want the picker to default to CS2, so that the portal's default context remains the default.
4. As a returning visitor, I want my last chosen game preselected on the sign-in page, so that I don't re-decide every time.
5. As a visitor, I want the game I select on the sign-in page to be the game I land in after signing in, so that my selection always takes effect.
6. As a signed-in user visiting the bare root, I want to be forwarded straight to my preferred game's page, so that I never see a login screen when I'm already in.
7. As a mapper signing in, I want to land on my preferred game's submissions dashboard, so that I start where my maps live.
8. As an approver signing in, I want to land on my preferred game's review queue, so that I start reviewing in my game.
9. As a lead approver signing in, I want to land on my preferred game's review queue, so that I start where my approvals and releases are.
10. As a user with no stored preference at sign-in, I want to land in CS2, so that sign-in always has a well-defined landing.
11. As a logged-out visitor opening any game page (e.g. a shared review link), I want to be sent to the bare sign-in page, so that the login URL never carries a game segment.
12. As a user whose session expired while working, I want re-sign-in to land on my preferred game's page rather than the game I last viewed, so that the preferred game is the single landing rule.
13. As a signed-in user, I want to switch game from inside my user card, under the name/avatar/logout row, so that the game control lives with my account.
14. As a signed-in user, I want switching game to re-scope the current page to the target game (query preserved), so that I keep my place when peeking at the other game.
15. As a mapper editing a submission, I want switching game to leave the editor and land on the target game's submissions overview with unsaved edits discarded, so that I never save content into the wrong game.
16. As a signed-in user, I want switching game in the card to update my preferred game, so that my next sign-in lands where I last worked.
17. As a signed-in user, I want the preference to persist in my browser across sessions, so that sign-ins keep landing me where I chose.
18. As a user signing in from another device or browser, I want to start from CS2 again, so that the preference is per-browser and never crosses devices.
19. As a signed-out visitor, I want no game switch anywhere besides the sign-in picker, so that the only pre-auth game choice is the landing preference.
20. As a mobile user below desktop widths, I want the switch to be absent together with the rest of the sidebar, so that the account-area placement stays consistent.
21. As a signed-in user logging out, I want to land on the bare sign-in page, so that logout returns to the game-neutral entry.
22. As a signed-in user, I want the sign-in picker and the user-card switch to offer the same two options with the same labels, so that the game vocabulary is uniform.
23. As a user opening a signed-in deep link (e.g. a Discord embed or shared review URL), I want it to open that game's page as today, so that the game spine and links are untouched.
24. As a signed-in user visiting a game root (e.g. `/csgo`), I want to be routed to that game's role page, so that bare game roots still resolve.
25. As a visitor, I want the Steam sign-in flow itself unchanged — button, session check, Steam OpenID round-trip — so that the only differences are the neutral URL and the picker.

## Implementation Decisions

- **One concept, one cookie.** "Preferred game" is a single landing preference: the sign-in picker writes it before launching Steam, and the user-card switch writes it as part of switching. The switch is navigation *plus* preference write — never one without the other. No separate "save" step exists anywhere.
- **Sign-in moves to the bare root.** The root page becomes a standalone sign-in page (no app layout) carrying the Steam button and a segmented CS2/CS:GO picker. The old implicit `/` → `/cs2` redirect is removed; the sign-in URL is the root with no game segment.
- **Cookie storage, no schema change.** The preference is a plain client cookie (site-wide path, long lifetime) written with the framework's cookie composable and read server-side by the Steam callback. No `users` column, no migration, no new endpoints. Absent or invalid cookie values coerce to CS2 via the existing game coercer.
- **Steam callback landings resolve through the new resolver.** The callback reads the cookie, coerces it to a Game, resolves the landing via the shared resolver below, and redirects to `${origin}${landing}`. Role resolution is unchanged (approver/lead → review, everyone else → submissions).
- **New shared pure resolver — the testing seam.** A function `resolvePostLoginPath(game, roles)` → full landing path (`/cs2/review`, `/csgo/submissions`, …), shared by the Steam callback and both sign-in gates (the bare root and the game roots). It collapses the reviewer-check currently duplicated between the callback and the game-root gate, which the new root gate would otherwise make a third copy.
- **Auth retargeting.** The auth middleware now sends unauthenticated visitors to the bare root instead of the attempted game's root. The attempted-game landing and any returnTo are dropped by design — the preferred game always wins the landing.
- **Game roots become pure gates.** A game-root page (e.g. `/csgo`) gains the auth middleware: logged-out visitors bounce to the bare root; signed-in visitors are routed to that game's role page through the resolver. Its standalone login UI is gone.
- **User card and layout.** The sidebar user block (avatar / name / logout) becomes a card with the game switch beneath the row; switching writes the cookie then navigates with the existing switch semantics (same-page re-scope with query preserved; the edit page exits to the target game's submissions overview with the query dropped). The top-bar header is removed — the switch was its only content. The sidebar's signed-out "Sign in" button is removed as dead UI once logout targets the bare root.
- **Logout lands on the bare root.**
- **Accepted consequences.** Below `lg` widths the switch is absent (the sidebar is desktop-only, as today); logged-out visitors see no switch anywhere except the sign-in picker; clearing cookies resets the preference to CS2.

## Testing Decisions

- **A good test asserts external behavior**: the resolver maps every role class (mapper, approver, lead approver) × both games to the correct landing path — the decision-rich rule of this feature — without touching cookies, routing, or the Nuxt runtime.
- **One seam tested:** the shared `resolvePostLoginPath` resolver. Optional companion: a thin coercion helper for the raw cookie string (invalid → CS2), so the "cookie → landing" chain can be asserted as a unit; the cookie-fallback semantics themselves are already covered by the existing `coerceGame` unit tests.
- **Prior art:** `tests/server/utils/games.spec.ts` — pure vitest units over the shared game-path utilities, imported via the `~` alias, no fakes, no Nuxt runtime. The resolver tests land in the same family.
- **Explicitly not tested:** the cookie composable's read/write plumbing, the h3 redirect mechanics, and Steam OpenID verification — thin glue or external and unchanged.

## Out of Scope

- Cross-device preference syncing: explicitly rejected (cookie over a `users.preferred_game` column, see ADR-0017).
- returnTo / attempted-game preservation on sign-in.
- Mobile navigation redesign: the switch is desktop-only with the rest of the sidebar.
- Changes to the game spine, route structure, switch re-scope semantics, or role-routing definitions.
- Changes to Steam auth itself: OpenID flow, session persistence, host anchoring.

## Further Notes

- ADR-0017 (`docs/adr/0017-preferred-game-and-neutral-sign-in.md`) records the decision and the rejected alternatives (DB column, `/login` page, returnTo).
- The glossary already captures the vocabulary: **Game** (amended — the user-card switch is now the only place the game changes; the sign-in page carries no game context) and **Preferred game** (new).
- Existing users need no backfill: no cookie means CS2, the portal's default context.
- Domain nuance preserved: the sign-in picker *chooses the landing*; it does not change the game. The user-card switch remains the only place the game changes mid-session.