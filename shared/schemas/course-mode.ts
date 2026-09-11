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
 *
 * The values all come from the one shared five-value `Mode` enum
 * (`shared/schemas/cs2kz.ts` + the `course_mode` DB enum, which derive from
 * the same array); only the per-game membership is written here.
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
  ] as const satisfies readonly CourseModeEntry<Mode>[],
} as const satisfies Record<Game, readonly CourseModeEntry<Mode>[]>

/** Every Course mode the portal knows — the shared five-value enum (a mode
 *  is scoped to its Game, but all five values live in one enum). */
export type CourseMode = Mode

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

/** The allowed Course modes of a game, in render order — what the vote form,
 *  the lead decision panel, and the readonly surfaces seed and iterate. */
export function modesForGame(game: Game): readonly CourseMode[] {
  return gameModeSets[game].map((entry) => entry.mode)
}

/** The first Course mode of a proposed/finalized filter list that does not
 *  belong to the submission's Game, or null when every mode is in scope. The
 *  pure verdict the review-write spine maps to a 400 — written once here so
 *  the service seam and the tests share the exact same rule (a CS:GO
 *  submission can never carry a classic/vanilla rating, and vice versa). */
export function firstModeOutsideGame(
  modes: readonly CourseMode[],
  game: Game,
): CourseMode | null {
  const allowed = new Set(modesForGame(game))
  return modes.find((mode) => !allowed.has(mode)) ?? null
}
