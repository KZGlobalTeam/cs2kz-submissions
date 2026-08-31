import type { ApprovalDecision } from '~/shared/types/submission'

/** Facts the submission-content service hands the notifier after a
 *  successful create — the event facts it already holds (spec §Context
 *  resolution). Everything the service does not hold — the submitting
 *  account's display name and the course count — comes from the notifier's
 *  own post-commit read. */
export interface SubmissionCreatedFacts {
  submissionId: string
  submitterUserId: string
  mapName: string
  workshopUrl: string
  isPort: boolean
}

/** Facts the review-write service hands after every successful vote save —
 *  including a same-approver re-save (a re-ping is the change signal, and
 *  vote pings are deliberately identical). The title's map name and the
 *  approver's display name come from the notifier's post-commit read. */
export interface VoteRecordedFacts {
  submissionId: string
  approverUserId: string
  approvalDecision: ApprovalDecision
  rejectionReason: string | null
}

/** Facts the review-write service hands after a successful finalize — the
 *  decision runs exactly once by construction, so the ping fires exactly
 *  once. The title's map name and the lead's display name come from the
 *  notifier's post-commit read. */
export interface DecisionCastFacts {
  submissionId: string
  leadUserId: string
  status: 'approved' | 'rejected'
  decisionNotes: string | null
}

/** The context the notifier resolves in its own post-commit read — what the
 *  write services don't hold. `mapName` feeds the vote/decision titles (the
 *  create facts already carry it); `submitterDisplayName` and `courseCount`
 *  feed the submission embed; `displayNames` resolves the extra user ids the
 *  vote/decision facts hand over (the approver / the lead approver). */
export interface NotificationContext {
  mapName: string
  submitterDisplayName: string
  courseCount: number
  /** userId → `users.displayName`. */
  displayNames: Record<string, string>
}

/** The notifier's own post-commit context read — deliberately *not* a store
 *  method on a write module. A real adapter binds it to the HTTP database
 *  (`drizzle-store.ts`); the service tests stub it directly. Returns null
 *  when the submission row no longer exists. */
export interface NotificationContextStore {
  readNotificationContext(
    submissionId: string,
    userIds: string[],
  ): Promise<NotificationContext | null>
}

/** Assembles the context read's raw rows into the shape the templates
 *  consume. Pure, so the mapping — display names, the course count, and
 *  the null-submission case — is unit-tested without a database (reviewing
 *  the `resolveFilters` pattern in review-queue/types). */
export function toNotificationContext(
  submissionRow:
    | { mapName: string; submitterDisplayName: string }
    | undefined,
  courseCount: number,
  userRows: { id: string; displayName: string }[],
): NotificationContext | null {
  if (!submissionRow) {
    return null
  }
  const displayNames: Record<string, string> = {}
  for (const user of userRows) {
    displayNames[user.id] = user.displayName
  }
  return {
    mapName: submissionRow.mapName,
    submitterDisplayName: submissionRow.submitterDisplayName,
    courseCount,
    displayNames,
  }
}

/** One Discord webhook embed field — name/value pairs; `value` must be
 *  non-empty (Discord rejects an empty one with a 400). */
export interface DiscordEmbedField {
  name: string
  value: string
  inline: boolean
}

/** One Discord webhook embed. */
export interface DiscordEmbed {
  title: string
  color: number
  url?: string
  fields: DiscordEmbedField[]
}

/** The webhook POST body: the fixed sender name plus one embed. */
export interface DiscordWebhookPayload {
  username: string
  embeds: DiscordEmbed[]
}

/** What the HTTP-post seam returns: an HTTP status and, on a 429, the
 *  Discord retry window in seconds (`retry_after` / `Retry-After`). */
export interface WebhookPostResult {
  status: number
  retryAfterSeconds?: number
}

/** The HTTP-post seam. Production binds global `fetch` (`index.ts`); the
 *  tests stub it and never touch the network — the same injected-seam shape
 *  as sibling services' `runTransaction` / `deleteStorageObjects`. */
export type WebhookPost = (
  url: string,
  payload: DiscordWebhookPayload,
) => Promise<WebhookPostResult>

export interface NotificationsDeps {
  /** The webhook URL, resolved per call like the sibling services resolve
   *  config (`attachmentScope`); unset disables the notifier. */
  getWebhookUrl: () => string | undefined
  /** The site's absolute origin, for the `/submissions/{id}` embed links. */
  getSiteUrl: () => string
  /** The HTTP-post seam (see `WebhookPost`). */
  postJson: WebhookPost
  /** The post-commit context read (see `NotificationContextStore`). */
  readContext: NotificationContextStore['readNotificationContext']
}

export interface NotificationsService {
  notifySubmissionCreated(facts: SubmissionCreatedFacts): Promise<void>
  notifyVoteRecorded(facts: VoteRecordedFacts): Promise<void>
  notifyDecisionCast(facts: DecisionCastFacts): Promise<void>
}