import { createError } from 'h3'

import { NewMapSchema, type NewMap } from '~/shared/schemas/cs2kz'

interface ExportReleaseInput {
  name: string
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
      name: map.name,
      workshop_id: map.workshopId,
      state: 'approved',
      mappers: map.mappers,
      courses: map.courses.map((course) => ({
        name: course.name,
        mappers: course.mappers,
        filters: {
          classic: {
            ...course.filters.classic,
            notes: course.filters.classic.notes ?? '',
          },
          vanilla: {
            ...course.filters.vanilla,
            notes: course.filters.vanilla.notes ?? '',
          },
        },
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