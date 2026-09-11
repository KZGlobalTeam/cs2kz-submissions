import { reactive } from 'vue'

import { courseNameForGame } from '~/shared/utils/course-names'
import type { Game } from '~/shared/schemas/game'
import type { CourseImageMeta } from '~/shared/types/submission'

export interface MapperInput {
  steamId64: string
  displayName: string
}

export interface CourseInput {
  name: string
  image: CourseImageMeta | null
  mappers: MapperInput[]
}

/** The submission form's editable state, shared by the create and edit
 *  pages. The edit page maps a submission's stored content onto this shape to
 *  pre-fill the form; `notes`/`portNotes` are empty strings where the stored
 *  content has nulls. */
export interface SubmissionFormValue {
  workshopUrl: string
  mapName: string
  notes: string
  isPort: boolean
  portAuthorizationImage: CourseImageMeta | null
  portNotes: string
  mappers: MapperInput[]
  courses: CourseInput[]
}

function blankMapper(): MapperInput {
  return { steamId64: '', displayName: '' }
}

function blankCourse(game: Game, orderIndex: number): CourseInput {
  return {
    // CS:GO course names are derived from course order, never typed
    // (CONTEXT.md — Course name convention): the first course is `Main`, the
    // N-th bonus `Bonus N`. The editor renders the field non-editable on top
    // of this prefill, so the convention holds by construction. CS2 courses
    // start blank — free names, exactly as today. The derivation rule lives
    // in `courseNameForGame`; this is just the create-form prefill.
    name: courseNameForGame(game, orderIndex, ''),
    image: null,
    mappers: [blankMapper()],
  }
}

function blankForm(game: Game): SubmissionFormValue {
  return {
    workshopUrl: '',
    mapName: '',
    notes: '',
    isPort: false,
    portAuthorizationImage: null,
    portNotes: '',
    mappers: [blankMapper()],
    courses: [blankCourse(game, 1)],
  }
}

/** The CS:GO submission form starts with a `Main` course present; CS2 starts
 *  with one blank course, exactly as today. */
export function useSubmissionForm(game: Game, initial?: SubmissionFormValue) {
  const form = reactive<SubmissionFormValue>(initial ?? blankForm(game))

  return { form }
}
