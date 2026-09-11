import { describe, expect, it } from 'vitest'

import {
  CSGO_BONUS_NAME_PREFIX,
  CSGO_MAIN_COURSE_NAME,
  courseNameForGame,
  csgoCourseNameForOrder,
  csgoCourseNamesMatchConvention,
} from '~/shared/utils/course-names'

describe('csgoCourseNameForOrder', () => {
  it('names the first course Main', () => {
    expect(csgoCourseNameForOrder(1)).toBe('Main')
  })

  it('names the N-th subsequent course Bonus N-1, following order', () => {
    expect(csgoCourseNameForOrder(2)).toBe('Bonus 1')
    expect(csgoCourseNameForOrder(3)).toBe('Bonus 2')
    expect(csgoCourseNameForOrder(10)).toBe('Bonus 9')
  })

  it('is defensive for 0 and negative orders (call sites are 1-based)', () => {
    expect(csgoCourseNameForOrder(0)).toBe('Main')
    expect(csgoCourseNameForOrder(-3)).toBe('Main')
  })

  it('derives the labels from the shared constants', () => {
    expect(CSGO_MAIN_COURSE_NAME).toBe('Main')
    expect(CSGO_BONUS_NAME_PREFIX).toBe('Bonus')
  })
})

describe('csgoCourseNamesMatchConvention', () => {
  it('accepts the empty list vacuously — at-least-one-course is the wire schema’s job', () => {
    expect(csgoCourseNamesMatchConvention([])).toBe(true)
  })

  it('accepts exactly Main then Bonus 1..N in ascending order', () => {
    expect(csgoCourseNamesMatchConvention(['Main'])).toBe(true)
    expect(csgoCourseNamesMatchConvention(['Main', 'Bonus 1', 'Bonus 2'])).toBe(true)
  })

  it('rejects a sequence that does not start with Main', () => {
    expect(csgoCourseNamesMatchConvention(['Bonus 1'])).toBe(false)
    expect(csgoCourseNamesMatchConvention(['Bonus 1', 'Main'])).toBe(false)
  })

  it('rejects a gap in the bonus sequence', () => {
    expect(csgoCourseNamesMatchConvention(['Main', 'Bonus 2'])).toBe(false)
  })

  it('rejects free names, duplicates, and wrong casing', () => {
    expect(csgoCourseNamesMatchConvention(['Main', 'Course B'])).toBe(false)
    expect(csgoCourseNamesMatchConvention(['Main', 'Main'])).toBe(false)
    expect(csgoCourseNamesMatchConvention(['main'])).toBe(false)
    expect(csgoCourseNamesMatchConvention(['Main', 'bonus 1'])).toBe(false)
  })
})

describe('courseNameForGame', () => {
  it('derives the convention name for CS:GO and ignores the fallback', () => {
    expect(courseNameForGame('csgo', 1, 'stored')).toBe('Main')
    expect(courseNameForGame('csgo', 2, 'stored')).toBe('Bonus 1')
    expect(courseNameForGame('csgo', 3, 'stored')).toBe('Bonus 2')
  })

  it('passes the value through unchanged for CS2 — free names, exactly as today', () => {
    expect(courseNameForGame('cs2', 1, 'stored')).toBe('stored')
    expect(courseNameForGame('cs2', 2, '')).toBe('')
  })
})