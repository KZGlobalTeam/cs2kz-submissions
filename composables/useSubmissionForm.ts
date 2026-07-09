import { reactive } from 'vue'

export function useSubmissionForm() {
  const form = reactive({
    workshopUrl: '',
    mapName: '',
    notes: '',
    mappers: [
      { steamId64: '', steamId: '', displayName: '' },
    ],
    courses: [
      {
        name: '',
        image: null as null | {
          url: string
          mime: string
          width: number
          height: number
          sizeBytes: number
        },
        mappers: [{ steamId64: '', steamId: '', displayName: '' }],
      },
    ],
  })

  function addMapper() {
    form.mappers.push({ steamId64: '', steamId: '', displayName: '' })
  }

  function addCourse() {
    form.courses.push({
      name: '',
      image: null,
      mappers: [{ steamId64: '', steamId: '', displayName: '' }],
    })
  }

  return {
    form,
    addMapper,
    addCourse,
  }
}
