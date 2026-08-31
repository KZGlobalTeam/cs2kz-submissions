import { getAppConfig } from '~/server/utils/config'

import { createDrizzleNotificationStore } from './drizzle-store'
import { createNotificationsService } from './notifications'
import { parseRetryAfterSeconds } from './retry'
import type {
  DecisionCastFacts,
  DiscordWebhookPayload,
  NotificationsDeps,
  SubmissionCreatedFacts,
  VoteRecordedFacts,
  WebhookPostResult,
} from './types'

/** Production HTTP-post binding over global `fetch`. A 429 surfaces the
 *  retry window via `parseRetryAfterSeconds` — the header/body precedence
 *  and the contested-units guard are unit-tested hermetically in
 *  `retry.spec.ts` against a fake response, never against Discord. */
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

  // `Response` structurally satisfies the RetryResponse surface the parser
  // reads. The sender clamps the wait either way, so a misread can only
  // stall (or shorten) the single retry, never throw.
  return { status: 429, retryAfterSeconds: await parseRetryAfterSeconds(response) }
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