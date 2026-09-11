import type { Game } from '~/shared/schemas/game'

/**
 * The CS:GO course-name convention (CONTEXT.md — Course name convention):
 * the first course is `Main`, the N-th subsequent course is `Bonus N`.
 * Names are derived by construction in the form (prefilled, non-editable)
 * and enforced by the shared wire schema server-side, so a direct API write
 * with a free name is a 400. CS2 courses keep free ASCII names and never
 * touch these helpers.
 */

export const CSGO_MAIN_COURSE_NAME = 'Main'

export const CSGO_BONUS_NAME_PREFIX = 'Bonus'

/** The convention name of a CS:GO course at 1-based `orderIndex` — `Main`
 *  at 1, `Bonus 1` at 2, `Bonus 2` at 3, … Defensive for 0/negative inputs
 *  (returns `Main`): call sites are 1-based (stored `orderIndex` and the
 *  form's position + 1). */
export function csgoCourseNameForOrder(orderIndex: number): string {
  return orderIndex <= 1
    ? CSGO_MAIN_COURSE_NAME
    : `${CSGO_BONUS_NAME_PREFIX} ${orderIndex - 1}`
}

/** True when the course names follow the convention in ascending order:
 *  exactly `Main` then `Bonus 1..N`, `Main` mandatory and first, no other
 *  names allowed. Vacuously true for an empty list — the at-least-one-course
 *  rule is enforced by the wire schema's `courses.min(1)` separately. */
export function csgoCourseNamesMatchConvention(names: readonly string[]): boolean {
  return names.every((name, index) => name === csgoCourseNameForOrder(index + 1))
}

/** The form-state course name of a course at 1-based `orderIndex`, per game:
 *  the derived convention name for CS:GO, the given value unchanged for CS2
 *  (free text). One place knows that the derivation is CS:GO-only, so the
 *  form prefill, the course editor's add/remove, and the edit mapping cannot
 *  restate the rule. */
export function courseNameForGame(
  game: Game,
  orderIndex: number,
  fallback: string,
): string {
  return game === 'csgo' ? csgoCourseNameForOrder(orderIndex) : fallback
}
