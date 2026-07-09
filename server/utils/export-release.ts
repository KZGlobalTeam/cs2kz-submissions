import { createError } from 'h3'

import { NewMapSchema, type NewMap } from '~/shared/schemas/cs2kz'

interface ExportReleaseInput {
  workshopId: number
  mappers: string[]
  courses: Array<{
    name: string
    mappers: string[]
    filters: NewMap['courses'][number]['filters']
  }>
}

export function toReleaseExport(maps: ExportReleaseInput[]): NewMap[] {
  return maps.map((map) => {
    const parsed = NewMapSchema.safeParse({
      workshop_id: map.workshopId,
      description: null,
      state: 'approved',
      mappers: map.mappers,
      courses: map.courses.map((course) => ({
        name: course.name,
        description: null,
        mappers: course.mappers,
        filters: course.filters,
      })),
    })

    if (!parsed.success) {
      throw createError({
        statusCode: 500,
        statusMessage: parsed.error.issues[0]?.message ?? 'Invalid release export',
      })
    }

    return parsed.data
  })
}
