import { afterEach, describe, expect, it, vi } from 'vitest'

import { EMBED_COLOR } from '~/server/services/notifications/payloads'
import { createNotificationsService } from '~/server/services/notifications/notifications'
import type {
  DecisionCastFacts,
  DiscordWebhookPayload,
  NotificationContext,
  NotificationsDeps,
  SubmissionCreatedFacts,
  VoteRecordedFacts,
  WebhookPostResult,
} from '~/server/services/notifications/types'

const SUBMISSION_ID = '11111111-1111-4111-8111-111111111111'
const APPROVER_ID = '33333333-3333-4333-8333-333333333333'
const LEAD_ID = '44444444-4444-4444-8444-444444444444'
const WEBHOOK_URL = 'https://discord.com/api/webhooks/123/secret'

function createdFacts(): SubmissionCreatedFacts {
  return {
    submissionId: SUBMISSION_ID,
    submitterUserId: '22222222-2222-4222-8222-222222222222',
    mapName: 'The Spike Rush',
    workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1234567',
    isPort: false,
  }
}

function voteFacts(): VoteRecordedFacts {
  return {
    submissionId: SUBMISSION_ID,
    approverUserId: APPROVER_ID,
    approvalDecision: 'yes',
    rejectionReason: null,
  }
}

function decisionFacts(): DecisionCastFacts {
  return {
    submissionId: SUBMISSION_ID,
    leadUserId: LEAD_ID,
    status: 'approved',
    decisionNotes: null,
  }
}

function defaultContext(): NotificationContext {
  return {
    mapName: 'The Spike Rush',
    submitterDisplayName: 'Alice Submitter',
    courseCount: 3,
    displayNames: {
      [APPROVER_ID]: 'Bob Approver',
      [LEAD_ID]: 'Cara Lead',
    },
  }
}

interface FakeOptions {
  webhookUrl?: string
  siteUrl?: string
  context?: NotificationContext | null
  readError?: Error
  postResults?: WebhookPostResult[]
  postError?: Error
}

/** Stub deps with recording arrays: the posts the seam made, the context
 *  reads (facts → userIds), and every console line. Defaults mirror the
 *  disabled/absent config: no webhook URL, no context row. */
function createFakeDeps(options: FakeOptions = {}) {
  const posts: Array<{ url: string; payload: DiscordWebhookPayload }> = []
  const contextReads: Array<{ submissionId: string; userIds: string[] }> = []
  const logLines: unknown[][] = []
  const errorLines: unknown[][] = []

  vi.spyOn(console, 'log').mockImplementation((...args) => {
    logLines.push(args)
  })
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    errorLines.push(args)
  })

  const deps: NotificationsDeps = {
    getWebhookUrl: () => options.webhookUrl,
    getSiteUrl: () => options.siteUrl ?? 'https://example.com',
    postJson: async (url, payload) => {
      posts.push({ url, payload })
      if (options.postError) {
        throw options.postError
      }
      const [next, ...rest] = options.postResults ?? []
      options.postResults = rest
      return next ?? { status: 204 }
    },
    readContext: async (submissionId, userIds) => {
      contextReads.push({ submissionId, userIds })
      if (options.readError) {
        throw options.readError
      }
      return options.context ?? null
    },
  }

  return { deps, posts, contextReads, logLines, errorLines }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('createNotificationsService', () => {
  it('is a no-op with a single log line when the webhook URL is unset, before any read or post', async () => {
    // The config resolves an absent URL to '' (falsy) — both disabled forms
    // behave identically.
    for (const webhookUrl of [undefined, '']) {
      const { deps, posts, contextReads, logLines, errorLines } = createFakeDeps(
        { webhookUrl, context: defaultContext() },
      )
      const service = createNotificationsService(deps)

      await expect(service.notifyVoteRecorded(voteFacts())).resolves.toBeUndefined()

      expect(posts).toEqual([])
      expect(contextReads).toEqual([])
      expect(logLines).toHaveLength(1)
      expect(String(logLines[0]![0])).toContain('[notifications]')
      expect(errorLines).toEqual([])
    }
  })

  it('posts the submission embed once on success, resolving the submitter name and course count from the context read', async () => {
    const { deps, posts, contextReads, logLines, errorLines } = createFakeDeps({
      webhookUrl: WEBHOOK_URL,
      context: defaultContext(),
    })
    const service = createNotificationsService(deps)

    await service.notifySubmissionCreated(createdFacts())

    expect(contextReads).toEqual([{ submissionId: SUBMISSION_ID, userIds: [] }])
    expect(posts).toHaveLength(1)
    expect(posts[0]!.url).toBe(WEBHOOK_URL)
    expect(posts[0]!.payload.username).toBe('CS2KZ Submissions')
    expect(posts[0]!.payload.embeds[0]).toMatchObject({
      title: 'Submission: The Spike Rush',
      color: EMBED_COLOR.blue,
    })
    expect(posts[0]!.payload.embeds[0]!.fields).toContainEqual({
      name: 'Submitter',
      value: 'Alice Submitter',
      inline: false,
    })
    expect(posts[0]!.payload.embeds[0]!.fields).toContainEqual({
      name: 'Courses',
      value: '3',
      inline: false,
    })
    expect(logLines).toEqual([])
    expect(errorLines).toEqual([])
  })

  it('resolves the approver display name from the vote facts and links to /submissions/{id}', async () => {
    const { deps, posts, contextReads } = createFakeDeps({
      webhookUrl: WEBHOOK_URL,
      context: defaultContext(),
    })
    const service = createNotificationsService(deps)

    await service.notifyVoteRecorded(voteFacts())

    expect(contextReads).toEqual([
      { submissionId: SUBMISSION_ID, userIds: [APPROVER_ID] },
    ])
    expect(posts[0]!.payload.embeds[0]!.fields).toContainEqual({
      name: 'Approver',
      value: 'Bob Approver',
      inline: false,
    })
    expect(posts[0]!.payload.embeds[0]!.url).toBe(
      `https://example.com/submissions/${SUBMISSION_ID}`,
    )
  })

  it('resolves the lead approver display name from the decision facts', async () => {
    const { deps, posts, contextReads } = createFakeDeps({
      webhookUrl: WEBHOOK_URL,
      context: defaultContext(),
    })
    const service = createNotificationsService(deps)

    await service.notifyDecisionCast(decisionFacts())

    expect(contextReads).toEqual([
      { submissionId: SUBMISSION_ID, userIds: [LEAD_ID] },
    ])
    expect(posts[0]!.payload.embeds[0]!.fields).toContainEqual({
      name: 'Lead approver',
      value: 'Cara Lead',
      inline: false,
    })
  })

  it('strips the trailing slash from the site origin when composing the link', async () => {
    const { deps, posts } = createFakeDeps({
      webhookUrl: WEBHOOK_URL,
      siteUrl: 'https://example.com/',
      context: defaultContext(),
    })
    const service = createNotificationsService(deps)

    await service.notifySubmissionCreated(createdFacts())

    expect(posts[0]!.payload.embeds[0]!.url).toBe(
      `https://example.com/submissions/${SUBMISSION_ID}`,
    )
  })

  it('omits the embed link when the site origin is unset, rather than risking a relative URL Discord rejects', async () => {
    const { deps, posts } = createFakeDeps({
      webhookUrl: WEBHOOK_URL,
      siteUrl: '',
      context: defaultContext(),
    })
    const service = createNotificationsService(deps)

    await service.notifySubmissionCreated(createdFacts())

    expect(posts).toHaveLength(1)
    expect(posts[0]!.payload.embeds[0]!.url).toBeUndefined()
  })

  it('honours Retry-After on a 429 with exactly one retry, then sends successfully', async () => {
    vi.useFakeTimers()
    const { deps, posts, errorLines } = createFakeDeps({
      webhookUrl: WEBHOOK_URL,
      context: defaultContext(),
      postResults: [
        { status: 429, retryAfterSeconds: 0.5 },
        { status: 204 },
      ],
    })
    const service = createNotificationsService(deps)

    const pending = service.notifyVoteRecorded(voteFacts())
    await vi.advanceTimersByTimeAsync(0)
    expect(posts).toHaveLength(1)

    // The retry waits out the half-second before the second attempt.
    await vi.advanceTimersByTimeAsync(499)
    expect(posts).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    await pending

    expect(posts).toHaveLength(2)
    expect(posts[0]!.url).toBe(WEBHOOK_URL)
    expect(posts[1]).toEqual(posts[0])
    expect(errorLines).toEqual([])
  })

  it('drops the message after one retry when the retried 429 (or failure) persists', async () => {
    const { deps, posts, logLines, errorLines } = createFakeDeps({
      webhookUrl: WEBHOOK_URL,
      context: defaultContext(),
      postResults: [
        { status: 429, retryAfterSeconds: 0 },
        { status: 429, retryAfterSeconds: 0 },
      ],
    })
    const service = createNotificationsService(deps)

    await expect(service.notifyVoteRecorded(voteFacts())).resolves.toBeUndefined()

    // Exactly one retry — the second 429 ends the attempt.
    expect(posts).toHaveLength(2)
    expect(errorLines).toHaveLength(1)
    expect(String(errorLines[0]![0])).toContain('429')
    expect(logLines).toEqual([])
  })

  it('clamps the 429 retry wait to the cap so a runaway Retry-After cannot stall the send', async () => {
    vi.useFakeTimers()
    const { deps, posts } = createFakeDeps({
      webhookUrl: WEBHOOK_URL,
      context: defaultContext(),
      postResults: [
        { status: 429, retryAfterSeconds: 9999 },
        { status: 204 },
      ],
    })
    const service = createNotificationsService(deps)

    const pending = service.notifyDecisionCast(decisionFacts())
    await vi.advanceTimersByTimeAsync(60_000)
    await pending

    expect(posts).toHaveLength(2)
  })

  it('logs and drops a non-2xx response without retrying', async () => {
    const { deps, posts, errorLines } = createFakeDeps({
      webhookUrl: WEBHOOK_URL,
      context: defaultContext(),
      postResults: [{ status: 500 }],
    })
    const service = createNotificationsService(deps)

    await expect(service.notifyVoteRecorded(voteFacts())).resolves.toBeUndefined()

    expect(posts).toHaveLength(1)
    expect(errorLines).toHaveLength(1)
    expect(String(errorLines[0]![0])).toContain('500')
  })

  it('swallows a network/post failure without ever throwing to the caller', async () => {
    const { deps, posts, errorLines } = createFakeDeps({
      webhookUrl: WEBHOOK_URL,
      context: defaultContext(),
      postError: new Error('network unreachable'),
    })
    const service = createNotificationsService(deps)

    await expect(service.notifyVoteRecorded(voteFacts())).resolves.toBeUndefined()

    expect(posts).toHaveLength(1)
    expect(errorLines).toHaveLength(1)
    expect(String(errorLines[0]![1])).toContain('network unreachable')
  })

  it('drops the notification when the post-commit context read finds no submission row', async () => {
    const { deps, posts, errorLines } = createFakeDeps({
      webhookUrl: WEBHOOK_URL,
      context: null,
    })
    const service = createNotificationsService(deps)

    await expect(service.notifyVoteRecorded(voteFacts())).resolves.toBeUndefined()

    expect(posts).toEqual([])
    expect(errorLines).toHaveLength(1)
    expect(String(errorLines[0]![1])).toContain('submission not found')
  })

  it('drops the notification when the context read itself fails — a DB hiccup never reaches the caller', async () => {
    const { deps, posts, errorLines } = createFakeDeps({
      webhookUrl: WEBHOOK_URL,
      readError: new Error('database is down'),
    })
    const service = createNotificationsService(deps)

    await expect(service.notifyVoteRecorded(voteFacts())).resolves.toBeUndefined()

    expect(posts).toEqual([])
    expect(errorLines).toHaveLength(1)
    expect(String(errorLines[0]![1])).toContain('database is down')
  })
})