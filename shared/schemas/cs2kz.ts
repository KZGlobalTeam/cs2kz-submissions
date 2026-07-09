import { z } from 'zod'

export const courseFilterTierValues = [
  'very-easy',
  'easy',
  'medium',
  'advanced',
  'hard',
  'very-hard',
  'extreme',
  'death',
  'unfeasible',
  'impossible',
] as const

export const courseFilterStateValues = [
  'unranked',
  'pending',
  'ranked',
] as const

export const modeValues = ['classic', 'vanilla'] as const
export const mapStateValues = ['invalid', 'in-testing', 'approved'] as const

export const CourseFilterTierSchema = z.enum(courseFilterTierValues)
export const CourseFilterStateSchema = z.enum(courseFilterStateValues)
export const ModeSchema = z.enum(modeValues)
export const MapStateSchema = z.enum(mapStateValues)

export const CourseFilterSchema = z.object({
  nub_tier: CourseFilterTierSchema,
  pro_tier: CourseFilterTierSchema,
  state: CourseFilterStateSchema,
  notes: z.string().nullable(),
})

export const CourseFiltersSchema = z.object({
  vanilla: CourseFilterSchema,
  classic: CourseFilterSchema,
})

export const NewCourseSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  mappers: z.array(z.string().min(1)).min(1),
  filters: CourseFiltersSchema,
})

export const NewMapSchema = z.object({
  workshop_id: z.number().int().nonnegative(),
  description: z.string().nullable(),
  state: MapStateSchema,
  mappers: z.array(z.string().min(1)).min(1),
  courses: z.array(NewCourseSchema).min(1),
})

export type CourseFilterTier = z.infer<typeof CourseFilterTierSchema>
export type CourseFilterState = z.infer<typeof CourseFilterStateSchema>
export type Mode = z.infer<typeof ModeSchema>
export type MapState = z.infer<typeof MapStateSchema>
export type CourseFilter = z.infer<typeof CourseFilterSchema>
export type CourseFilters = z.infer<typeof CourseFiltersSchema>
export type NewCourse = z.infer<typeof NewCourseSchema>
export type NewMap = z.infer<typeof NewMapSchema>
