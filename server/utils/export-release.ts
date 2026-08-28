import { createError } from 'h3'

import { NewMapSchema, type NewMap } from '~/shared/schemas/cs2kz'
import type { ReleaseContents } from '~/server/services/release-contents'

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

/** Shapes the ordered manifest into the validated export payload. The
 *  filters-presence refusal is an export concern — the `NewMap` schema
 *  requires both modes' finalized filters, and the image pack renders
 *  neither — so it lives here, not in the shared resolution. */
export function toReleaseExportPayload(contents: ReleaseContents): NewMap[] {
  return toReleaseExport(
    contents.maps.map((map) => ({
      name: map.mapName,
      workshopId: map.workshopId,
      mappers: map.mappers,
      courses: map.courses.map((course) => {
        const classic = course.filters.classic
        const vanilla = course.filters.vanilla
        if (!classic || !vanilla) {
          throw createError({
            statusCode: 400,
            statusMessage: `Missing finalized filters for course ${course.name}`,
          })
        }
        return {
          name: course.name,
          mappers: course.mappers,
          filters: {
            classic: {
              nub_tier: classic.nubTier,
              pro_tier: classic.proTier,
              state: classic.state,
              notes: classic.notes,
            },
            vanilla: {
              nub_tier: vanilla.nubTier,
              pro_tier: vanilla.proTier,
              state: vanilla.state,
              notes: vanilla.notes,
            },
          },
        }
      }),
    })),
  )
}