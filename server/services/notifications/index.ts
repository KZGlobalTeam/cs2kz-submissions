import { getAppConfig } from '~/server/utils/config'

import { createDrizzleNotificationStore } from './drizzle-store'
import { createNotificationsService } from './notifications'
import type {
  DecisionCastFacts,
  DiscordWebhookPayload,
  NotificationsDeps,
  SubmissionCreatedFacts,
  VoteRecordedFacts,
  WebhookPostResult,
} from './types'

/** Production HTTP-post binding over global `fetch`. A 429 surfaces the
 *  retry window so the sender can honour it for one retry, from the most
 *  trustworthy source down: Discord's `X-RateLimit-Reset-After` header
 *  (seconds, float), then the plain `Retry-After` header (HTTP-seconds),
 *  then the rate-limit body's `retry_after`. The body field's units are
 *  contested in the wild — the docs say seconds, but there is a long-standing
 *  report of the API returning milliseconds — so it is the fallback with the
 *  guard below, and the sender clamps the wait either way, so a misread can
 *  only stall (or shorten) the single retry, never throw. */
async function postJson(
  url: string,
  payload: DiscordWebhookPayload,
): Promise<WebhookPostResult> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (response.status !== 429) {
    return { status: response.status }
  }

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
      // Unreadable rate-limit body: the sender falls back to its 1s default.
    }
  }

  return { status: 429, retryAfterSeconds }
}

/** Production wiring: the real webhook URL and site-origin config, a real
 *  `fetch`, and the real post-commit context read. */
const notificationsService = createNotificationsService({
  getWebhookUrl: () => getAppConfig().discordWebhookUrl,
  getSiteUrl: () => getAppConfig().siteUrl ?? '',
  postJson,
  readContext: createDrizzleNotificationStore().readNotificationContext,
} satisfies NotificationsDeps)

/** Bound entry point: a submission-created ping after the create commits
 *  (ticket 04 binds it into the submission-content service). */
export function notifySubmissionCreated(facts: SubmissionCreatedFacts) {
  return notificationsService.notifySubmissionCreated(facts)
}

/** Bound entry point: a vote ping after every `saveVote` commits (ticket 03
 *  binds it into the review-write service). */
export function notifyVoteRecorded(facts: VoteRecordedFacts) {
  return notificationsService.notifyVoteRecorded(facts)
}

/** Bound entry point: a decision ping after `finalizeSubmission` commits
 *  (ticket 03 binds it into the review-write service). */
export function notifyDecisionCast(facts: DecisionCastFacts) {
  return notificationsService.notifyDecisionCast(facts)
}

export type {
  DecisionCastFacts,
  DiscordEmbed,
  DiscordEmbedField,
  DiscordWebhookPayload,
  NotificationContext,
  NotificationContextStore,
  NotificationsDeps,
  NotificationsService,
  SubmissionCreatedFacts,
  VoteRecordedFacts,
  WebhookPost,
  WebhookPostResult,
} from './types'