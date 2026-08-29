import { createEvent, type H3Event } from 'h3'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'

import { createSubmissionsIndexHandler } from '~/server/api/submissions/index.get'
import type { ReviewQueueRead, ReviewSubmissionRow } from '~/server/services/review-queue/review-queue'
import type { SessionUser } from '~/shared/types/submission'

const OWNER: SessionUser = {
  id: 'u-owner',
  steamId64: '76561198000000000',
  name: 'Owner',
  avatarUrl: null,
  profileUrl: null,
  roles: [],
}

const APPROVER: SessionUser = {
  ...OWNER,
  id: 'u-approver',
  roles: ['approver'],
}

/** Builds a minimal h3 event for a GET request. The handler only reads the
 *  query string (`getQuery` → `event.path`) and talks to the injected auth
 *  spies, so plain request/response stubs suffice — no socket, no network. */
function createTestEvent(path: string): H3Event {
  const req = { url: path, method: 'GET', headers: {} } as IncomingMessage
  const res = {} as ServerResponse
  return createEvent(req, res)
}

/** A handler bound to fresh spy deps per test: the read module (route target
 *  and filter assertions) plus the two auth gates. */
function createHandler() {
  const read = {
    getMinePage: vi.fn<ReviewQueueRead['getMinePage']>(async () => ({
      items: [],
      total: 0,
    })),
    getQueuePage: vi.fn<ReviewQueueRead['getQueuePage']>(async () => ({
      items: [],
      total: 0,
    })),
  } satisfies ReviewQueueRead
  const requireAuth = vi.fn()
  const requireApprover = vi.fn()
  const handler = createSubmissionsIndexHandler({
    read,
    requireAuth,
    requireApprover,
  })
  return { handler, read, requireAuth, requireApprover }
}

describe('the submissions list endpoint adapter', () => {
  describe('parameter validation', () => {
    it('400s an invalid status value before touching auth or the read', async () => {
      const { handler, read, requireAuth, requireApprover } = createHandler()

      await expect(
        handler(createTestEvent('/api/submissions?status=bogus')),
      ).rejects.toMatchObject({ statusCode: 400 })

      expect(requireAuth).not.toHaveBeenCalled()
      expect(requireApprover).not.toHaveBeenCalled()
      expect(read.getMinePage).not.toHaveBeenCalled()
      expect(read.getQueuePage).not.toHaveBeenCalled()
    })

    it('400s an invalid scope value before touching auth or the read', async () => {
      const { handler, read, requireAuth, requireApprover } = createHandler()

      await expect(
        handler(createTestEvent('/api/submissions?scope=everyone')),
      ).rejects.toMatchObject({ statusCode: 400 })

      expect(requireAuth).not.toHaveBeenCalled()
      expect(requireApprover).not.toHaveBeenCalled()
      expect(read.getMinePage).not.toHaveBeenCalled()
      expect(read.getQueuePage).not.toHaveBeenCalled()
    })

    it('passes an absent status through as undefined and routes to the mine scope by default', async () => {
      const { handler, read, requireAuth } = createHandler()
      requireAuth.mockResolvedValue(OWNER)

      const result = await handler(createTestEvent('/api/submissions'))

      // No ?scope= param — the default scope is mine, exactly as today.
      expect(read.getQueuePage).not.toHaveBeenCalled()
      expect(read.getMinePage).toHaveBeenCalledTimes(1)
      const [filters] = read.getMinePage.mock.calls[0]!
      expect(filters).toMatchObject({ ownerId: OWNER.id })
      expect(filters.status).toBeUndefined()
      expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 15 })
    })

    it('parses unvoted only when it is exactly === true, adding the unvoted user then', async () => {
      const { handler, read, requireApprover } = createHandler()
      requireApprover.mockResolvedValue(APPROVER)

      // unvoted=true activates the Unvoted branch with the approver as its user.
      await handler(createTestEvent('/api/submissions?scope=all&unvoted=true'))
      const [withFlag] = read.getQueuePage.mock.calls[0]!
      expect(withFlag).toMatchObject({
        viewerId: APPROVER.id,
        unvoted: { userId: APPROVER.id },
      })

      // unvoted=false (and any other value) is the coarse flag being off —
      // the key must be absent, not sent as undefined: presence is what
      // activates the Unvoted branch of the filters value.
      await handler(createTestEvent('/api/submissions?scope=all&unvoted=false'))
      const [withoutFlag] = read.getQueuePage.mock.calls[1]!
      expect('unvoted' in withoutFlag).toBe(false)
      expect(withoutFlag).toMatchObject({ viewerId: APPROVER.id })
    })
  })

  describe('scope routing and gating', () => {
    it('routes scope=all to getQueuePage with the approver as the viewer identity', async () => {
      const { handler, read, requireAuth, requireApprover } = createHandler()
      requireApprover.mockResolvedValue(APPROVER)

      await handler(createTestEvent('/api/submissions?scope=all'))

      expect(requireApprover).toHaveBeenCalledTimes(1)
      expect(requireAuth).not.toHaveBeenCalled()
      expect(read.getMinePage).not.toHaveBeenCalled()
      expect(read.getQueuePage).toHaveBeenCalledTimes(1)
      expect(read.getQueuePage).toHaveBeenCalledWith(
        { status: undefined, viewerId: APPROVER.id },
        { limit: 15, offset: 0 },
      )
    })

    it('routes scope=mine to getMinePage, auth-gated but not approver-gated', async () => {
      const { handler, read, requireAuth, requireApprover } = createHandler()
      requireAuth.mockResolvedValue(OWNER)

      // Even with unvoted=true the mine scope never reads the flag — the mine
      // filters branch has no Unvoted key at all, and getMinePage is called
      // with the plain owner filters.
      await handler(createTestEvent('/api/submissions?scope=mine&unvoted=true'))

      expect(requireAuth).toHaveBeenCalledTimes(1)
      expect(requireApprover).not.toHaveBeenCalled()
      expect(read.getQueuePage).not.toHaveBeenCalled()
      expect(read.getMinePage).toHaveBeenCalledWith(
        { status: undefined, ownerId: OWNER.id },
        { limit: 15, offset: 0 },
      )
    })

    it('composes the status filter into both delegated reads', async () => {
      const { handler, read, requireApprover } = createHandler()
      requireApprover.mockResolvedValue(APPROVER)

      await handler(createTestEvent('/api/submissions?scope=all&status=approved'))

      expect(read.getQueuePage).toHaveBeenCalledWith(
        { status: 'approved', viewerId: APPROVER.id },
        { limit: 15, offset: 0 },
      )
    })

    it('keeps the PaginatedResult wire shape and delegates parsePagination untouched', async () => {
      const { handler, read, requireApprover } = createHandler()
      const items: ReviewSubmissionRow[] = [{
        id: 's1',
        mapName: 'Map s1',
        workshopId: 42,
        workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=s1',
        status: 'pending',
        createdAt: '2025-01-01T00:00:00.000Z',
        approvedAt: null,
        courseCount: 0,
        mappers: [],
        yesVotes: 0,
        noVotes: 0,
        myVote: null,
      }]
      read.getQueuePage.mockResolvedValue({ items, total: 7 })
      requireApprover.mockResolvedValue(APPROVER)

      const result = await handler(
        createTestEvent('/api/submissions?scope=all&page=2&pageSize=10'),
      )

      expect(result).toEqual({ items, total: 7, page: 2, pageSize: 10 })
      expect(read.getQueuePage).toHaveBeenCalledWith(
        { status: undefined, viewerId: APPROVER.id },
        { limit: 10, offset: 10 },
      )
    })
  })
})