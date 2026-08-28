import { describe, expect, it } from 'vitest'

import { createReleaseContentsService } from '~/server/services/release-contents/resolve-release-contents'
import type { ReleaseCourseRow, ReleaseMapRow } from '~/server/services/release-contents'
import {
  createFakeDb,
  createFakeStore,
  seedCourse,
  seedFinalFilter,
  seedLink,
  seedMap,
  seedRelease,
  type FakeReleaseContentsDb,
} from './fake-release-contents-store'

const RELEASE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const MAP_A = '11111111-1111-4111-8111-111111111111'
const MAP_B = '22222222-2222-4222-8222-222222222222'
const MAP_C = '33333333-3333-4333-8333-333333333333'
const COURSE_1 = 'c0ffee00-0000-4000-8000-000000000001'
const COURSE_2 = 'c0ffee00-0000-4000-8000-000000000002'
const COURSE_3 = 'c0ffee00-0000-4000-8000-000000000003'

function approvedMap(overrides: Partial<ReleaseMapRow>): ReleaseMapRow {
  return {
    id: MAP_A,
    mapName: 'mute',
    workshopId: 2798160350,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    status: 'approved',
    ...overrides,
  }
}

function course(overrides: Partial<ReleaseCourseRow>): ReleaseCourseRow {
  return {
    id: COURSE_1,
    submissionId: MAP_A,
    orderIndex: 1,
    name: 'Main',
    imageUrl: 'https://storage.example/main.jpg',
    ...overrides,
  }
}

function seededRelease(): FakeReleaseContentsDb {
  const db = createFakeDb()
  seedRelease(db, RELEASE_ID, 'Release One')
  seedLink(db, RELEASE_ID, [MAP_A])
  seedMap(db, approvedMap({}))
  seedCourse(db, course({}))
  return db
}

function service(db: FakeReleaseContentsDb) {
  return createReleaseContentsService({ store: createFakeStore(db) })
}

describe('createReleaseContentsService.resolve', () => {
  it('404s an unknown release', async () => {
    await expect(service(createFakeDb()).resolve(RELEASE_ID)).rejects.toMatchObject(
      {
        statusCode: 404,
        statusMessage: 'Release not found',
      },
    )
  })

  it('resolves an empty release to a named manifest with no maps', async () => {
    const db = createFakeDb()
    seedRelease(db, RELEASE_ID, 'Release One')

    await expect(service(db).resolve(RELEASE_ID)).resolves.toEqual({
      releaseName: 'Release One',
      maps: [],
    })
  })

  it('orders maps by createdAt ascending, then mapName as tie-break', async () => {
    const db = createFakeDb()
    seedRelease(db, RELEASE_ID, 'Release One')
    seedLink(db, RELEASE_ID, [MAP_A, MAP_B, MAP_C])
    seedMap(db, approvedMap({ id: MAP_A, mapName: 'zeta', createdAt: new Date('2026-01-02T00:00:00Z') }))
    seedMap(db, approvedMap({ id: MAP_B, mapName: 'alpha', createdAt: new Date('2026-01-01T00:00:00Z') }))
    // Same createdAt as `alpha` — the name tie-break decides.
    seedMap(db, approvedMap({ id: MAP_C, mapName: 'beta', createdAt: new Date('2026-01-01T00:00:00Z') }))

    const { maps } = await service(db).resolve(RELEASE_ID)

    expect(maps.map((map) => map.mapName)).toEqual(['alpha', 'beta', 'zeta'])
  })

  it('rejects a release containing a non-approved submission with one message', async () => {
    const db = createFakeDb()
    seedRelease(db, RELEASE_ID, 'Release One')
    seedLink(db, RELEASE_ID, [MAP_A])
    seedMap(db, approvedMap({ status: 'pending' }))

    await expect(service(db).resolve(RELEASE_ID)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Release contains non-approved submission',
    })
  })

  it('orders courses by orderIndex ascending within their map', async () => {
    const db = seededRelease()
    seedCourse(
      db,
      course({ id: COURSE_2, orderIndex: 2, name: 'Bonus' }),
    )
    seedCourse(db, course({ id: COURSE_3, orderIndex: 3, name: 'Swap' }))
    seedCourse(db, course({ id: COURSE_1, orderIndex: 1, name: 'Main' }))

    const { maps } = await service(db).resolve(RELEASE_ID)

    expect(maps[0]!.courses.map((c) => c.name)).toEqual([
      'Main',
      'Bonus',
      'Swap',
    ])
  })

  it('attaches map mappers, course mappers and image facts', async () => {
    const db = seededRelease()
    db.mapMappers.push(
      { submissionId: MAP_A, steamId64: '76561197960265728' },
      { submissionId: MAP_A, steamId64: '76561197960265729' },
    )
    db.courseMappers.push({ courseId: COURSE_1, steamId64: '76561197960265730' })

    const { maps } = await service(db).resolve(RELEASE_ID)

    expect(maps[0]!.mappers).toEqual(['76561197960265728', '76561197960265729'])
    expect(maps[0]!.courses[0]).toMatchObject({
      courseId: COURSE_1,
      orderIndex: 1,
      name: 'Main',
      imageUrl: 'https://storage.example/main.jpg',
      mappers: ['76561197960265730'],
    })
  })

  it('attaches finalised filters per course and mode, null when absent', async () => {
    const db = seededRelease()
    seedFinalFilter(db, {
      submissionId: MAP_A,
      courseId: COURSE_1,
      mode: 'classic',
      nubTier: 'very-easy',
      proTier: 'medium',
      state: 'ranked',
      notes: 'Curve is generous',
    })

    const { maps } = await service(db).resolve(RELEASE_ID)
    const filters = maps[0]!.courses[0]!.filters

    expect(filters.classic).toEqual({
      mode: 'classic',
      nubTier: 'very-easy',
      proTier: 'medium',
      state: 'ranked',
      notes: 'Curve is generous',
    })
    expect(filters.vanilla).toBeNull()
  })
})

describe('createReleaseContentsService.markExported', () => {
  it('stamps through the store, and only when called', async () => {
    const db = createFakeDb()
    const store = createFakeStore(db)
    const svc = createReleaseContentsService({ store })

    await svc.markExported(RELEASE_ID)

    expect(db.exported).toEqual([RELEASE_ID])
  })
})