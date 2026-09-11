import { gameValues, GameSchema, type Game } from '~/shared/schemas/game'
import type { UserRole } from '~/shared/types/roles'

/** The site-wide client cookie carrying the user's preferred game — the
 *  landing preference written by the sign-in picker and the user-card switch,
 *  read server-side by the Steam callback to pick the post-login landing.
 *  Site-wide path and a long lifetime so it survives the Steam round-trip and
 *  follows the browser across sessions. */
export const PREFERRED_GAME_COOKIE = 'cs2kz_preferred_game'

/** The preference cookie's lifetime in seconds — a year, so the landing
 *  preference follows the browser across sessions without a refresh ritual,
 *  matching US17's per-browser persistence. */
export const PREFERRED_GAME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** UI labels for the switcher and the Discord embed Game fields, written
 *  once so pages and the notifier cannot drift. */
export const gameLabels: Record<Game, string> = {
  cs2: 'CS2',
  csgo: 'CS:GO',
}

/** The ordered switcher options: every game, labelled for the UI. */
export const gameOptions: readonly { value: Game, label: string }[] =
  gameValues.map((value) => ({ value, label: gameLabels[value] }))

/** True when the value is exactly one of the supported game segments. */
export function isGameSegment(value: unknown): value is Game {
  return GameSchema.safeParse(value).success
}

/** Resolves an arbitrary segment value to the nearest valid Game, falling
 *  back (default `cs2`, the portal's default context) when absent/invalid.
 *  The route middleware rejects invalid segments before any page renders;
 *  the fallback covers ingredient code like middleware redirects and
 *  composables used outside the game spine. */
export function coerceGame(value: unknown, fallback: Game = 'cs2'): Game {
  return isGameSegment(value) ? value : fallback
}

/** Prefixes a page path with the game segment: `gamePath('cs2', '/submissions')`
 *  → `/cs2/submissions`. Every page navigation and link goes through this, so
 *  a link opened elsewhere lands in the same game. */
export function gamePath(game: Game, path: string): string {
  return `/${game}${path.startsWith('/') ? path : `/${path}`}`
}

/** Prefixes an API path with the game segment: `apiGamePath('cs2', '/releases/1/export')`
 *  → `/api/cs2/releases/1/export`. All client fetches of game-scoped routes
 *  go through this. */
export function apiGamePath(game: Game, path: string): string {
  return `/api/${game}${path.startsWith('/') ? path : `/${path}`}`
}

/** The edit page's route shape: `/submissions/{id}/edit`. Switching game
 *  there exits the editor (discarding unsaved edits) to the target game's
 *  submissions overview. */
const EDIT_EXIT_PATTERN = /^\/submissions\/[^/]+\/edit$/

export interface GameSwitch {
  /** The path to navigate to after switching context. */
  path: string
  /** Whether the switch re-scopes the same page (query string preserved) or
   *  lands on a fresh overview (the edit-page exit). */
  preserveQuery: boolean
}

/** Computes where flipping the game switcher lands, given the current full
 *  page path (`/cs2/submissions/…`). Same page re-scoped to the target game;
 *  the edit page is the one exception and exits to the target game's
 *  submissions overview. */
export function gameSwitchPath(target: Game, currentPath: string): GameSwitch {
  // Drop the leading game segment (the whole app lives under one) and keep
  // the remaining path shape to re-scope for the target game.
  const rest = currentPath.split('/').filter(Boolean).slice(1).join('/')

  if (EDIT_EXIT_PATTERN.test(`/${rest}`)) {
    return { path: `/${target}/submissions`, preserveQuery: false }
  }

  return {
    path: `/${target}${rest ? `/${rest}` : ''}`,
    preserveQuery: true,
  }
}

/** The role→landing rule of sign-in: any reviewer (approver or lead) lands
 *  on the review queue, everyone else (submitters) on the submissions
 *  dashboard. */
function isReviewer(roles: readonly UserRole[]): boolean {
  return roles.includes('approver') || roles.includes('lead_approver')
}

/** The full post-login landing path for a game and a user's roles — reviewers
 *  land on the review queue, everyone else on the submissions dashboard
 *  (`/cs2/review`, `/csgo/submissions`, …). Shared by the Steam callback and
 *  both sign-in gates (the bare root and the game roots) so the landing rule
 *  is written once. */
export function resolvePostLoginPath(game: Game, roles: readonly UserRole[]): string {
  return gamePath(game, isReviewer(roles) ? '/review' : '/submissions')
}
