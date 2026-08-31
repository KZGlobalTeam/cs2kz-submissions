import {
  decisionCastPayload,
  submissionCreatedPayload,
  voteRecordedPayload,
} from './payloads'
import type {
  DecisionCastFacts,
  DiscordWebhookPayload,
  NotificationsDeps,
  NotificationsService,
  SubmissionCreatedFacts,
  VoteRecordedFacts,
} from './types'

/** How long a 429 retry may wait at most. Discord webhook rate-limits reset
 *  in well under a minute — and `retry_after` has a long-standing
 *  seconds-vs-milliseconds doc dispute — so a runaway value must not stall a
 *  serverless request well beyond the send budget. */
const MAX_RETRY_WAIT_MS = 60_000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** One webhook POST, best-effort: a 2xx is done, a 429 honours
 *  `Retry-After` for exactly one retry then logs and drops, any other
 *  non-2xx logs and drops, and a network error logs and swallows — the
 *  caller never sees a notification failure (spec §Implementation
 *  Decisions: fire-and-forget after commit). */
async function sendBestEffort(
  post: NotificationsDeps['postJson'],
  url: string,
  payload: DiscordWebhookPayload,
): Promise<void> {
  try {
    const first = await post(url, payload)
    if (first.status >= 200 && first.status < 300) {
      return
    }

    if (first.status === 429) {
      const waitMs = Math.min(
        Math.max((first.retryAfterSeconds ?? 1) * 1000, 0),
        MAX_RETRY_WAIT_MS,
      )
      await sleep(waitMs)

      const second = await post(url, payload)
      if (second.status >= 200 && second.status < 300) {
        return
      }
      console.error(
        `[notifications] webhook ${second.status} after one retry — dropping message`,
      )
      return
    }

    console.error(
      `[notifications] webhook rejected with ${first.status} — dropping message`,
    )
  }
  catch (err) {
    // A thrown fetch (network failure, DNS, or a stub) is logged and
    // swallowed — never propagated to the write caller.
    console.error('[notifications] webhook post failed — dropping message', err)
  }
}

/** Binds the notifications module to concrete deps: the webhook URL and site
 *  origin config (per call, like the sibling modules' `attachmentScope`), the
 *  HTTP-post seam, and the post-commit context read. Production wiring lives
 *  in `./index.ts`; the tests bind stubs. */
export function createNotificationsService(
  deps: NotificationsDeps,
): NotificationsService {
  /** The absolute submission link every embed carries; omitted when the
   *  site origin is unset, because Discord validates `embed.url` and a
   *  relative path would risk the whole message being rejected. */
  const submissionUrl = (submissionId: string): string | undefined => {
    const origin = deps.getSiteUrl().replace(/\/+$/, '')
    return origin ? `${origin}/submissions/${submissionId}` : undefined
  }

  /** The shared emit spine for all three events: resolve the webhook URL
   *  (unset ⇒ the disabled no-op with a single log line, before any read),
   *  build the payload — which runs the notifier's own post-commit context
   *  read — then send best-effort. Every failure on the way is logged and
   *  swallowed; the write caller never sees it. */
  async function emit(
    build: () => Promise<DiscordWebhookPayload>,
  ): Promise<void> {
    const webhookUrl = deps.getWebhookUrl()
    if (!webhookUrl) {
      console.log(
        '[notifications] webhook URL not configured — notifications disabled',
      )
      return
    }

    let payload: DiscordWebhookPayload
    try {
      payload = await build()
    }
    catch (err) {
      // The context-read failures — a submission row gone, a DB hiccup —
      // funnel through here too: log and drop, never throw.
      console.error('[notifications] dropping notification:', err)
      return
    }

    await sendBestEffort(deps.postJson, webhookUrl, payload)
  }

  /** Runs the post-commit context read for one event; a null result — the
   *  submission row vanished between the write's commit and this read
   *  (e.g. a lead delete) — fails the build, and `emit` drops the message. */
  async function readRequiredContext(
    submissionId: string,
    userIds: string[],
  ) {
    const context = await deps.readContext(submissionId, userIds)
    if (!context) {
      throw new Error('submission not found in the post-commit context read')
    }
    return context
  }

  return {
    async notifySubmissionCreated(facts: SubmissionCreatedFacts) {
      await emit(async () => {
        // The create facts carry no submitter display name and no course
        // count; the read resolves them on its own post-commit query — no
        // store-contract changes in the write modules.
        const context = await readRequiredContext(facts.submissionId, [])
        return submissionCreatedPayload(
          facts,
          context,
          submissionUrl(facts.submissionId),
        )
      })
    },

    async notifyVoteRecorded(facts: VoteRecordedFacts) {
      await emit(async () => {
        const context = await readRequiredContext(facts.submissionId, [
          facts.approverUserId,
        ])
        return voteRecordedPayload(
          facts,
          {
            mapName: context.mapName,
            approverDisplayName:
              context.displayNames[facts.approverUserId] ?? 'Unknown',
          },
          submissionUrl(facts.submissionId),
        )
      })
    },

    async notifyDecisionCast(facts: DecisionCastFacts) {
      await emit(async () => {
        const context = await readRequiredContext(facts.submissionId, [
          facts.leadUserId,
        ])
        return decisionCastPayload(
          facts,
          {
            mapName: context.mapName,
            leadDisplayName:
              context.displayNames[facts.leadUserId] ?? 'Unknown',
          },
          submissionUrl(facts.submissionId),
        )
      })
    },
  }
}