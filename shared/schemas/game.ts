import { z } from 'zod'

/** The two games the portal serves — the discriminator every submission and
 *  release row carries, and the value every game-scoped route segment must
 *  parse to. */
export const gameValues = ['cs2', 'csgo'] as const

export const GameSchema = z.enum(gameValues)

export type Game = z.infer<typeof GameSchema>