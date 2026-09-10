# 02: Game spine — pages, navigation, switcher

**What to build:** Every page lives under a game segment (`/cs2/…`, `/csgo/…`), the bare path redirects to `/cs2`, and a single top-bar switcher is the only place the game changes — flipping it re-scopes every page, with no game badges anywhere. Activating the switcher from the edit page discards the in-progress form and lands on the target game's submissions overview.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] All pages render under their game segment; the bare path redirects to `/cs2`.
- [ ] One top-bar switcher swaps the game context and is present wherever the app shell is.
- [ ] Route middleware rejects a request for an unknown game segment.
- [ ] Activating the switcher from the edit page leaves the editor, discards unsaved edits, and lands on the target game's submissions overview.
- [ ] Shared links and page navigations carry the game segment, so a link opened elsewhere lands in the same game.
- [ ] No page renders a game badge (the context is the whole mechanism).
- [ ] Navigation behavior and the switcher are verified manually (seam decision S2); any pure route/game helpers extracted along the way are covered by seam C tests.