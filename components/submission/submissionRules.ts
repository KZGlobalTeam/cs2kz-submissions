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
 * walks the user through.
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
      { text: 'Map name must be **easily distinguishable** from other maps.' },
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
      { text: 'At least one course must be present on the map.' },
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
        text: 'Map has been tested in the kreedz mapping discord and received sufficient feedback prior to submission.',
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
