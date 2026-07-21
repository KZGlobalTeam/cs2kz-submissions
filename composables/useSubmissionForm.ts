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

function blankMapper(): MapperInput {
  return { steamId64: '', displayName: '' }
}

function blankCourse(): CourseInput {
  return { name: '', image: null, mappers: [blankMapper()] }
}

export function useSubmissionForm() {
  const form = reactive({
    workshopUrl: '',
    mapName: '',
    notes: '',
    mappers: [blankMapper()],
    courses: [blankCourse()],
  })

  return {
    form,
    blankMapper,
    blankCourse,
  }
}
