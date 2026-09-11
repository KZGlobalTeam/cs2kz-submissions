import { createError } from 'h3'

import {
  NewMapSchema,
  type CourseFilterState,
  type CourseFilterTier,
  type NewMap,
} from '~/shared/schemas/cs2kz'
import { gameModeSets } from '~/shared/schemas/course-mode'
import type { Game } from '~/shared/schemas/game'
import type { ReleaseContents, ReleaseFinalFilter } from '~/server/services/release-contents'

interface Cs2ExportInput {
  name: string
  workshopId: number
  mappers: string[]
  courses: Array<{
    name: string
    mappers: string[]
    filters: NewMap['courses'][number]['filters']
  }>
}

/** The CS2 formatter seam: DB-row-shaped maps → NewMapSchema-validated CS2
 *  release payload. CS2-only by behavior — `NewMapSchema` pins the
 *  classic/vanilla filter keys — which is why the per-game dispatch routes
 *  only the CS2 branch through it. */
export function toCs2NewMapExport(maps: Cs2ExportInput[]): NewMap[] {
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

/** One finalized filter as any export shape renders it: the finalized facts
 *  plus the ADR-0008 `notes` placeholder — the manifest carries no reason
 *  text after the finalized-reasoning purge, and every export branch
 *  re-synthesizes the key at the edge. Shared by both branches so the CS2
 *  and CS:GO filter objects cannot drift. */
function finalizedFilterToExport(filter: ReleaseFinalFilter) {
  return {
    nub_tier: filter.nubTier,
    pro_tier: filter.proTier,
    state: filter.state,
    notes: '',
  } satisfies CsgoExportFilter
}

/** Shapes the ordered manifest into the validated CS2 export payload. The
 *  filters-presence refusal is an export concern — the `NewMap` schema
 *  requires both modes' finalized filters, and the image pack renders
 *  neither — so it lives here, not in the shared resolution. Reads only the
 *  classic/vanilla keys the CS2-keyed manifest carries, so the ADR-0008
 *  contract stays byte-identical. */
export function toCs2ReleaseExportPayload(contents: ReleaseContents): NewMap[] {
  return toCs2NewMapExport(
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
            classic: finalizedFilterToExport(classic),
            vanilla: finalizedFilterToExport(vanilla),
          },
        }
      }),
    })),
  )
}

/** The three Course modes of a CS:GO release, narrowed to literals — the
 *  keys the provisional payload's filters record carries. */
type CsgoMode = (typeof gameModeSets.csgo)[number]['mode']

/** One finalized filter as the provisional CS:GO export renders it: the same
 *  keys as the CS2 filter objects, with the same notes placeholder — the
 *  skeleton mirrors ADR-0008, only the mode keys differ. */
export interface CsgoExportFilter {
  nub_tier: CourseFilterTier
  pro_tier: CourseFilterTier
  state: CourseFilterState
  notes: ''
}

/** One course in the provisional CS:GO payload: the CS2 skeleton's course
 *  shape, with the filters record keyed by the three CS:GO modes. */
export interface CsgoExportCourse {
  name: string
  filters: Record<CsgoMode, CsgoExportFilter>
  mappers: string[]
}

/** One map in the provisional CS:GO payload: the CS2 skeleton's map shape
 *  (`state` forced to approved), filters per course keyed kzt/skz/vnl. */
export interface CsgoExportMap {
  name: string
  workshop_id: number
  state: 'approved'
  mappers: string[]
  courses: CsgoExportCourse[]
}

/** Builds one course's provisional filters record from the manifest, walking
 *  the CS:GO vocabulary in render order and refusing (400) a course that
 *  lacks any one of the three modes' finalized filters — the placeholder
 *  contract only ever ships complete courses. */
function csgoCourseFilters(
  course: ReleaseContents['maps'][number]['courses'][number],
): Record<CsgoMode, CsgoExportFilter> {
  const filters = {} as Record<CsgoMode, CsgoExportFilter>
  for (const { mode } of gameModeSets.csgo) {
    const filter = course.filters[mode]
    if (!filter) {
      throw createError({
        statusCode: 400,
        statusMessage: `Missing finalized filters for course ${course.name}`,
      })
    }
    filters[mode] = finalizedFilterToExport(filter)
  }
  return filters
}

/** Shapes the ordered manifest into the provisional CS:GO export payload. The
 *  shape is explicitly provisional (ADR-0016): it mirrors the CS2 skeleton
 *  with `kzt`/`skz`/`vnl` filter keys until the CS:GO KZ dashboard API is
 *  decided, and the whole placeholder is contained here — swapping in the
 *  real contract later touches only this adapter. */
export function toCsgoReleaseExportPayload(contents: ReleaseContents): CsgoExportMap[] {
  return contents.maps.map((map) => ({
    name: map.mapName,
    workshop_id: map.workshopId,
    state: 'approved',
    mappers: map.mappers,
    courses: map.courses.map((course) => ({
      name: course.name,
      filters: csgoCourseFilters(course),
      mappers: course.mappers,
    })),
  }))
}

/** The release export payload, per game: the ADR-0008 `NewMap` contract for
 *  CS2, the provisional CS:GO shape otherwise. The two never mix — the
 *  release manifest keys filters by the release's game, and each branch
 *  reads only its own game's modes. */
export type ReleaseExportPayload = NewMap[] | CsgoExportMap[]

/** Per-game dispatch of the release export: resolves nothing itself (the
 *  manifest is already resolved, game-scoped), only shapes. CS2 stays
 *  byte-identical to today's payload; CS:GO emits the provisional shape. */
export function toReleaseExportPayload(
  contents: ReleaseContents,
  game: 'cs2',
): NewMap[]
export function toReleaseExportPayload(
  contents: ReleaseContents,
  game: 'csgo',
): CsgoExportMap[]
export function toReleaseExportPayload(
  contents: ReleaseContents,
  game: Game,
): ReleaseExportPayload
export function toReleaseExportPayload(
  contents: ReleaseContents,
  game: Game,
): ReleaseExportPayload {
  return game === 'cs2'
    ? toCs2ReleaseExportPayload(contents)
    : toCsgoReleaseExportPayload(contents)
}