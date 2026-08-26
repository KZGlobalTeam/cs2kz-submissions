import { reactive } from 'vue'

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

function blankCourse(): CourseInput {
  return { name: '', image: null, mappers: [blankMapper()] }
}

function blankForm(): SubmissionFormValue {
  return {
    workshopUrl: '',
    mapName: '',
    notes: '',
    isPort: false,
    portAuthorizationImage: null,
    portNotes: '',
    mappers: [blankMapper()],
    courses: [blankCourse()],
  }
}

export function useSubmissionForm(initial?: SubmissionFormValue) {
  const form = reactive<SubmissionFormValue>(initial ?? blankForm())

  return {
    form,
    blankMapper,
    blankCourse,
  }
}