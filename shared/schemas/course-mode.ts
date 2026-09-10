import type { Mode } from '~/shared/schemas/cs2kz'
import type { Game } from '~/shared/schemas/game'

/**
 * The per-game Course-mode vocabulary — the single place each game's allowed
 * mode set and its UI labels are written (CONTEXT.md: a mode is scoped to
 * its Game; CS2's `vanilla` and CS:GO's `vnl` are different modes). Render
 * order = the order the vote form, the lead decision panel, and the readonly
 * surfaces show the filters.
 *
 * - CS2 rates classic and vanilla, labelled CKZ and VNL.
 * - CS:GO rates kztimer, simplekz, and vanilla, labelled KZT, SKZ, and VNL.
 */
export const gameModeSets = {
  cs2: [
    { mode: 'classic', label: 'CKZ' },
    { mode: 'vanilla', label: 'VNL' },
  ] as const satisfies readonly CourseModeEntry<Mode>[],
  csgo: [
    { mode: 'kzt', label: 'KZT' },
    { mode: 'skz', label: 'SKZ' },
    { mode: 'vnl', label: 'VNL' },
  ] as const,
} as const

/** CS:GO's own Course modes — kztimer, simplekz, and vanilla — derived from
 *  the vocabulary so the values are written once. Not yet members of the
 *  shared `Mode` enum: the ticket-04 migration grows the `course_mode` DB
 *  enum to all five values. */
export type CsgoMode = (typeof gameModeSets.csgo)[number]['mode']

/** Every Course mode the portal knows, across both games. */
export type CourseMode = Mode | CsgoMode

/** One row of the per-game vocabulary: a Course mode and its UI label. The
 *  constraint is `string` — not `CourseMode` — so the entries can satisfy
 *  against it without the vocabulary referencing itself (whose derivation
 *  would cycle). */
export interface CourseModeEntry<M extends string> {
  mode: M
  label: string
}

/** Label lookup derived from the vocabulary, so the label text is written
 *  exactly once — no component ever maps a mode value to a label itself. */
const MODE_LABELS = [...gameModeSets.cs2, ...gameModeSets.csgo].reduce(
  (labels, entry) => {
    labels[entry.mode] = entry.label
    return labels
  },
  {} as Record<CourseMode, string>,
)

/** The label the UI shows for a Course mode — `CKZ` for classic, `VNL` for
 *  vanilla, `KZT`/`SKZ`/`VNL` for the CS:GO modes. */
export function modeLabel(mode: CourseMode): string {
  return MODE_LABELS[mode]
}

/** The allowed Course modes of a game, in render order. */
export function modesForGame(game: 'cs2'): readonly Mode[]
export function modesForGame(game: 'csgo'): readonly CsgoMode[]
export function modesForGame(game: Game): readonly CourseMode[]
export function modesForGame(game: Game): readonly CourseMode[] {
  return gameModeSets[game].map((entry) => entry.mode)
}