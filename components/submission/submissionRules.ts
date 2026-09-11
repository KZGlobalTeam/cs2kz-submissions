import type { Game } from '~/shared/schemas/game'

export interface SubmissionRule {
  /** Markdown text describing the rule. */
  text: string
}

export interface SubmissionRulesStep {
  /** Stable key used to track checkbox state across re-renders. */
  key: string
  /** Step heading shown in the stepper. */
  title: string
  /** Optional one-line description shown under the title. */
  description?: string
  /** The rules the mapper must tick through for this step. */
  rules: SubmissionRule[]
  /**
   * When true, this step first asks whether the map is a port. If the
   * mapper says "no", the rules are skipped and the step is satisfied.
   */
  askIsPort?: boolean
}

/**
 * The rules a mapper must acknowledge before creating a submission,
 * grouped into ordered steps. Order matters: it is the order the dialog
 * walks the user through. This is the CS2 set — the porting group belongs
 * to CS2 only (CONTEXT.md — Port); CS:GO has its own copy below.
 */
export const submissionRulesSteps: SubmissionRulesStep[] = [
  {
    key: 'naming',
    title: 'Map and Course Naming Requirements',
    rules: [
      { text: 'Map name must start with `kz_`.' },
      {
        text: 'Map name must only contain ASCII **alphanumeric characters** (and underscores).',
      },
      {
        text: 'Map name must **not exceed 27 characters** in length (including the `kz_` prefix).',
      },
      {
        text: 'Map name must be identical with the workshop map name and vpk file name.',
      },
      {
        text: 'Course names can **only** contain ASCII characters (including spaces, punctuation, quotes, etc.) and be unique across all courses **on your map**.',
      },
    ],
  },
  {
    key: 'courses',
    title: 'Rules for Courses',
    rules: [
      { text: 'Each course must have a working timer.' },
      {
        text: 'Doing `!r <course number or course name>` where the number is the order of current course should teleport you to the start of the course.',
      },
      { text: 'Doing `!end` should teleport you to the end of the current course.' },
    ],
  },
  {
    key: 'ranked',
    title: 'Rules for Ranked Courses',
    rules: [
      {
        text: 'Avoid using clips, non-solid blocks, triggers, or moving blocks in unintuitive or exploitable ways.',
      },
      { text: 'Avoid inconsistent mechanics like moving platforms or time-based events.' },
      {
        text: 'Avoid "pre-run setups" like breakable objects or doors which do not open automatically.',
      },
      {
        text: 'There must be **no way to skip** from the start to the end of a course in a way that results in ridiculously short times.',
      },
    ],
  },
  {
    key: 'jumpstat',
    title: 'Jumpstat Area Requirements',
    rules: [
      { text: 'There must be a jumpstat area.' },
      {
        text: 'Jumpstats areas must include labeled LJ blocks ranging at least from **210–280**, in increments of 10, using readable Arabic numerals.',
      },
      { text: 'Doing `!lj` should teleport you to the jumpstat area.' },
    ],
  },
  {
    key: 'porting',
    title: 'Rules for Porting',
    askIsPort: true,
    rules: [
      { text: 'Ports need to follow the current global standards.' },
      {
        text: 'Ports have to take advantage of the source 2 engines mapping features (lighting, texture quality and reflections etc)',
      },
      { text: 'Ports must look better than their older counterparts.' },
      {
        text: "If you're **not the original mapper**, you **must get permission** from them.",
      },
      {
        text: 'If the original mapper has been **inactive for 2 years or more,** and you\'ve made **honest but unsuccessful attempts** to contact them, then you **may submit your port anyway**.',
      },
    ],
  },
  {
    key: 'other',
    title: 'Other',
    rules: [
      {
        text: 'Map has been tested thoroughly in the KZ forum and received sufficient feedback prior to submission.',
      },
      { text: 'Map must not have discriminatory, obscene, or sexually explicit content.' },
      {
        text: `Map proves reasonable effort and quality, including:
- Fully textured
- Good lighting and visibility
- Performance optimizations
- Reasonable file size`,
      },
    ],
  },
]

/**
 * The CS:GO submission rules — its own copy of the CS2 rules minus the
 * porting group, an explicit placeholder until the community's own CS:GO
 * draft exists (CONTEXT.md — Submission rules: the two games never share
 * one rule set). Written out as an independent array (not derived from the
 * CS2 set) so the two sets are structurally separate from day one: a later
 * CS2 wording change never touches the CS:GO copy, and the community draft
 * replaces exactly this array. The per-game structure is final; only the
 * copy's wording will change. A CS:GO map is an original (it later gets
 * ported to CS2), so the porting step never appears.
 */
export const csgoSubmissionRulesSteps: SubmissionRulesStep[] = [
  {
    key: 'naming',
    title: 'Map and Course Naming Requirements',
    rules: [
      { text: 'Map name must start with `kz_`.' },
      {
        text: 'Map name must only contain ASCII **alphanumeric characters** (and underscores).',
      },
      {
        text: 'Map name must **not exceed 27 characters** in length (including the `kz_` prefix).',
      },
      {
        text: 'Map name must be identical with the workshop map name and vpk file name.',
      },
      {
        text: 'Course names can **only** contain ASCII characters (including spaces, punctuation, quotes, etc.) and be unique across all courses **on your map**.',
      },
    ],
  },
  {
    key: 'courses',
    title: 'Rules for Courses',
    rules: [
      { text: 'Each course must have a working timer.' },
      {
        text: 'Doing `!r <course number or course name>` where the number is the order of current course should teleport you to the start of the course.',
      },
      { text: 'Doing `!end` should teleport you to the end of the current course.' },
    ],
  },
  {
    key: 'ranked',
    title: 'Rules for Ranked Courses',
    rules: [
      {
        text: 'Avoid using clips, non-solid blocks, triggers, or moving blocks in unintuitive or exploitable ways.',
      },
      { text: 'Avoid inconsistent mechanics like moving platforms or time-based events.' },
      {
        text: 'Avoid "pre-run setups" like breakable objects or doors which do not open automatically.',
      },
      {
        text: 'There must be **no way to skip** from the start to the end of a course in a way that results in ridiculously short times.',
      },
    ],
  },
  {
    key: 'jumpstat',
    title: 'Jumpstat Area Requirements',
    rules: [
      { text: 'There must be a jumpstat area.' },
      {
        text: 'Jumpstats areas must include labeled LJ blocks ranging at least from **210–280**, in increments of 10, using readable Arabic numerals.',
      },
      { text: 'Doing `!lj` should teleport you to the jumpstat area.' },
    ],
  },
  {
    key: 'other',
    title: 'Other',
    rules: [
      {
        text: 'Map has been tested thoroughly in the KZ forum and received sufficient feedback prior to submission.',
      },
      { text: 'Map must not have discriminatory, obscene, or sexually explicit content.' },
      {
        text: `Map proves reasonable effort and quality, including:
- Fully textured
- Good lighting and visibility
- Performance optimizations
- Reasonable file size`,
      },
    ],
  },
]

/** The rules a mapper must acknowledge — per game: CS2 keeps the full set
 *  (porting included, the CS2 dialog exactly as today); CS:GO reads its own
 *  copy without porting. The approver checklist mirrors the same lookup so
 *  the porting step never renders on a CS:GO submission. */
export function rulesStepsForGame(game: Game): readonly SubmissionRulesStep[] {
  return game === 'csgo' ? csgoSubmissionRulesSteps : submissionRulesSteps
}
