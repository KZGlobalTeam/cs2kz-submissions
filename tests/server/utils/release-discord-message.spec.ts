import { describe, expect, it } from 'vitest'

import type {
  ReleaseContents,
  ReleaseCourse,
  ReleaseFinalFilter,
  ReleaseMap,
} from '~/server/services/release-contents'
import {
  colorizeTier,
  serverOperatorMention,
  toReleaseDiscordMessage,
} from '~/server/utils/release-discord-message'
import type { CourseFilterTier } from '~/shared/schemas/cs2kz'

function filter(mode: ReleaseFinalFilter['mode'], nubTier: CourseFilterTier): ReleaseFinalFilter {
  return { mode, nubTier, proTier: 'impossible', state: 'ranked' }
}

function course(
  name: string,
  orderIndex: number,
  filters: ReleaseCourse['filters'],
): ReleaseCourse {
  return { courseId: `${name}-${orderIndex}`, orderIndex, name, imageUrl: '', mappers: ['1'], filters }
}

function cs2Map(mapName: string, workshopId: number, nubTier: CourseFilterTier): ReleaseMap {
  return {
    mapName,
    workshopId,
    createdAt: new Date(0),
    mappers: ['1'],
    courses: [
      course('Main', 1, { classic: filter('classic', nubTier), vanilla: filter('vanilla', 'impossible') }),
    ],
  }
}

function contents(maps: ReleaseMap[]): ReleaseContents {
  return { releaseName: 'Release', maps }
}

describe('colorizeTier', () => {
  it.each([
    ['very-easy', '\u001b[2;32mT1\u001b[0m'],
    ['easy', '\u001b[2;32mT2\u001b[0m'],
    ['medium', '\u001b[2;34mT3\u001b[0m'],
    ['advanced', '\u001b[2;34mT4\u001b[0m'],
    ['hard', '\u001b[2;31mT5\u001b[0m'],
    ['very-hard', '\u001b[2;31mT6\u001b[0m'],
    ['extreme', '\u001b[2;35mT7\u001b[0m'],
    ['impossible', '\u001b[2;35mT10\u001b[0m'],
  ] as const)('renders %s as %j', (tier, expected) => {
    expect(colorizeTier(tier)).toBe(expected)
  })
})

describe('serverOperatorMention', () => {
  it('falls back to the plain-text mention per game when no role id is configured', () => {
    expect(serverOperatorMention('cs2')).toBe('@CS2 - Server Operator')
    expect(serverOperatorMention('csgo', '  ')).toBe('@CS:GO - Server Operator')
  })

  it('renders a pinging role mention when a role id is configured', () => {
    expect(serverOperatorMention('cs2', '123456789012345678')).toBe('<@&123456789012345678>')
  })
})

describe('toReleaseDiscordMessage', () => {
  it('renders the map release announcement template', () => {
    const message = toReleaseDiscordMessage(
      contents([
        cs2Map('kz_engram', 3759997670, 'hard'),
        cs2Map('kz_sxb2_misato', 3082850001, 'very-hard'),
        cs2Map('kz_royal_purple', 3679728328, 'medium'),
        cs2Map('kz_silly_metamodernity', 3718800235, 'easy'),
      ]),
      'cs2',
    )

    expect(message).toBe([
      '@CS2 - Server Operator',
      '**New map release in approximately 48 hours**',
      '',
      '```ansi',
      'kz_engram (\u001b[2;31mT5\u001b[0m):3759997670',
      'kz_sxb2_misato (\u001b[2;31mT6\u001b[0m):3082850001',
      'kz_royal_purple (\u001b[2;34mT3\u001b[0m):3679728328',
      'kz_silly_metamodernity (\u001b[2;32mT2\u001b[0m):3718800235',
      '```',
      '',
      'Thank you,',
      'The Map Approval Team',
    ].join('\n'))
  })

  it('uses the first course’s CKZ nub tier, ignoring VNL, pro tiers and bonuses', () => {
    const map = cs2Map('kz_a', 1, 'very-easy')
    map.courses.push(course('Bonus', 2, {
      classic: filter('classic', 'impossible'),
      vanilla: filter('vanilla', 'impossible'),
    }))

    expect(toReleaseDiscordMessage(contents([map]), 'cs2')).toContain('kz_a (\u001b[2;32mT1\u001b[0m):1')
  })

  it('uses the KZT nub tier for a CS:GO release', () => {
    const map: ReleaseMap = {
      mapName: 'kz_csgo',
      workshopId: 42,
      createdAt: new Date(0),
      mappers: ['1'],
      courses: [course('Main', 1, {
        kzt: filter('kzt', 'advanced'),
        skz: filter('skz', 'impossible'),
        vnl: filter('vnl', 'impossible'),
      })],
    }

    const message = toReleaseDiscordMessage(contents([map]), 'csgo')
    expect(message.startsWith('@CS:GO - Server Operator\n')).toBe(true)
    expect(message).toContain('kz_csgo (\u001b[2;34mT4\u001b[0m):42')
  })

  it('opens with a pinging role mention when a role id is given', () => {
    const message = toReleaseDiscordMessage(
      contents([cs2Map('kz_a', 1, 'hard')]),
      'cs2',
      { serverOperatorRoleId: '987' },
    )
    expect(message.split('\n')[0]).toBe('<@&987>')
  })

  it('refuses a map whose first course lacks the finalized CKZ filter, naming it', () => {
    const map = cs2Map('kz_a', 1, 'hard')
    map.courses[0]!.filters.classic = null

    expect(() => toReleaseDiscordMessage(contents([map]), 'cs2')).toThrowError(
      expect.objectContaining({
        statusCode: 400,
        statusMessage: 'Missing finalized CKZ filter for course Main of kz_a',
      }),
    )
  })

  it('refuses an empty release', () => {
    expect(() => toReleaseDiscordMessage(contents([]), 'cs2')).toThrowError(
      expect.objectContaining({ statusCode: 400, statusMessage: 'Release has no maps to announce' }),
    )
  })
})
