/** The 429 retry window, parsed hermetically: what the webhook POST seam
 *  needs off a rate-limited HTTP response. The real `Response` structurally
 *  satisfies the minimal surface, so the parsing — header precedence, the
 *  contested-units guard — is unit-testable without fetch or Discord
 *  (spec §Testing Decisions: hermetic sender tests). */
export interface RetryResponse {
  headers: { get(name: string): string | null }
  json(): Promise<unknown>
}

/** Extracts Discord's retry window in seconds from a 429 response, from the
 *  most trustworthy source down: `X-RateLimit-Reset-After` (seconds,
 *  float), then the plain `Retry-After` header (HTTP-seconds), then the
 *  rate-limit body's `retry_after`. The body field's units are contested in
 *  the wild — the docs say seconds, but there is a long-standing report of
 *  the API returning milliseconds — so it is the fallback with the guard
 *  below, and the sender clamps the wait either way, so a misread can only
 *  stall (or shorten) the single retry, never throw. Returns undefined when
 *  no usable window is offered; the sender falls back to its 1s default. */
export async function parseRetryAfterSeconds(
  response: RetryResponse,
): Promise<number | undefined> {
  let retryAfterSeconds: number | undefined

  const resetAfter = response.headers.get('x-ratelimit-reset-after')
  if (resetAfter !== null) {
    const parsed = Number(resetAfter)
    if (!Number.isNaN(parsed)) {
      retryAfterSeconds = parsed
    }
  }
  if (retryAfterSeconds === undefined) {
    const retryAfter = response.headers.get('retry-after')
    if (retryAfter !== null) {
      const parsed = Number(retryAfter)
      if (!Number.isNaN(parsed)) {
        retryAfterSeconds = parsed
      }
    }
  }
  if (retryAfterSeconds === undefined) {
    try {
      const body = (await response.json()) as { retry_after?: unknown }
      if (typeof body.retry_after === 'number') {
        // The contested-units guard: on a webhook-scale wait a body value
        // over 100 can only be milliseconds, so treat it as such.
        retryAfterSeconds =
          body.retry_after >= 100 ? body.retry_after / 1000 : body.retry_after
      }
    }
    catch {
      // Unreadable rate-limit body: undefined, and the sender falls back
      // to its 1s default.
    }
  }

  return retryAfterSeconds
}