import { describe, expect, it } from 'vitest'

import { buildAuthUrls } from '~/server/utils/auth-host'

describe('buildAuthUrls', () => {
  it('anchors realm and return URL to the given origin', () => {
    const { realm, returnUrl } = buildAuthUrls('https://submissions.cs2kz.org')

    expect(realm).toBe('https://submissions.cs2kz.org/')
    expect(returnUrl).toBe('https://submissions.cs2kz.org/api/auth/callback')
  })

  it('keeps realm host === return URL host === request host (cookie host consistency)', () => {
    for (const origin of [
      'https://submissions.cs2kz.org',
      'https://cs2kz-submissions.pages.dev',
    ]) {
      const { realm, returnUrl } = buildAuthUrls(origin)
      const host = new URL(origin).host

      expect(new URL(realm).host).toBe(host)
      expect(new URL(returnUrl).host).toBe(host)
    }
  })

  it('strips trailing slashes before composing URLs', () => {
    const { realm, returnUrl } = buildAuthUrls('https://submissions.cs2kz.org/')

    expect(realm).toBe('https://submissions.cs2kz.org/')
    expect(returnUrl).toBe('https://submissions.cs2kz.org/api/auth/callback')
  })
})