import { describe, expect, it } from 'vitest'

import { parseRetryAfterSeconds } from '~/server/services/notifications/retry'
import type { RetryResponse } from '~/server/services/notifications/retry'

/** A fake HTTP response surface for the parser — hermetic: no fetch, no
 *  network, no Discord, the same vibe as the rest of the module's tests. */
function fakeResponse(
  overrides: {
    resetAfter?: string | null
    retryAfter?: string | null
    body?: unknown
    bodyError?: Error
  } = {},
): RetryResponse {
  return {
    headers: {
      get(name: string): string | null {
        if (name === 'x-ratelimit-reset-after') {
          return overrides.resetAfter ?? null
        }
        if (name === 'retry-after') {
          return overrides.retryAfter ?? null
        }
        return null
      },
    },
    async json() {
      if (overrides.bodyError) {
        throw overrides.bodyError
      }
      return overrides.body
    },
  }
}

describe('parseRetryAfterSeconds', () => {
  it('takes the X-RateLimit-Reset-After header first — the most trustworthy source', async () => {
    await expect(
      parseRetryAfterSeconds(
        fakeResponse({
          resetAfter: '0.5',
          retryAfter: '2',
          body: { retry_after: 7 },
        }),
      ),
    ).resolves.toBe(0.5)
  })

  it('falls back to the plain Retry-After header when the reset-after header is missing', async () => {
    await expect(
      parseRetryAfterSeconds(
        fakeResponse({ retryAfter: '3', body: { retry_after: 7 } }),
      ),
    ).resolves.toBe(3)
  })

  it('falls back to the rate-limit body retry_after when both headers are missing', async () => {
    await expect(
      parseRetryAfterSeconds(fakeResponse({ body: { retry_after: 4 } })),
    ).resolves.toBe(4)
  })

  it('skips a header whose value is not a number and moves to the next source', async () => {
    await expect(
      parseRetryAfterSeconds(
        fakeResponse({ resetAfter: 'garbage', retryAfter: '5' }),
      ),
    ).resolves.toBe(5)
    await expect(
      parseRetryAfterSeconds(
        fakeResponse({ resetAfter: 'garbage', retryAfter: 'nope', body: { retry_after: 6 } }),
      ),
    ).resolves.toBe(6)
  })

  it('treats a body retry_after of 100 or more as milliseconds (the contested-units guard)', async () => {
    // 5000ms — a webhook-scale wait can only be milliseconds.
    await expect(
      parseRetryAfterSeconds(fakeResponse({ body: { retry_after: 5000 } })),
    ).resolves.toBe(5)
    // Sub-second waits are already seconds, so they pass through untouched.
    await expect(
      parseRetryAfterSeconds(fakeResponse({ body: { retry_after: 60 } })),
    ).resolves.toBe(60)
    await expect(
      parseRetryAfterSeconds(fakeResponse({ body: { retry_after: 100 } })),
    ).resolves.toBe(0.1)
  })

  it('returns undefined when the body carry-over is not a number', async () => {
    await expect(
      parseRetryAfterSeconds(fakeResponse({ body: { retry_after: 'soon' } })),
    ).resolves.toBeUndefined()
  })

  it('returns undefined when the rate-limit body is unreadable', async () => {
    await expect(
      parseRetryAfterSeconds(
        fakeResponse({ bodyError: new Error('body gone') }),
      ),
    ).resolves.toBeUndefined()
  })

  it('returns undefined when no retry window is offered at all — the sender falls back to its 1s default', async () => {
    await expect(
      parseRetryAfterSeconds(fakeResponse({})),
    ).resolves.toBeUndefined()
  })
})