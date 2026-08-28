import { createError } from 'h3'

import { canMutateSubmission } from '~/server/utils/submission-mutability'
import type { SubmissionInput } from '~/shared/schemas/submission'
import { assertWorkshopId } from '~/shared/utils/workshop'

import type {
  SubmissionContentDeps,
  SubmissionContentStore,
  SubmissionContentWrite,
  SubmissionMapperWrite,
  SubmissionRow,
} from './types'

/** The content columns written onto the submission row, derived from the
 *  wire shape exactly once — including the 5-column port-authorization
 *  projection, which every content write needs and no store should
 *  re-derive. `assertWorkshopId` is a happy-path derivation (the shared wire
 *  schema already rejects unparseable URLs with a 400 at endpoint parse). */
function toContentWrite(input: SubmissionInput): SubmissionContentWrite {
  // The 5-column port-evidence projection: on a non-port every meta column
  // is null; on a port the columns come from the (schema-mandated)
  // authorization image. Derived once, shared by insert and replace.
  const portImage = input.isPort ? input.portAuthorizationImage : null
  return {
    workshopUrl: input.workshopUrl,
    workshopId: assertWorkshopId(input.workshopUrl),
    mapName: input.mapName,
    notes: input.notes,
    isPort: input.isPort,
    portAuthorizationImageUrl: portImage?.url ?? null,
    portAuthorizationImageMime: portImage?.mime ?? null,
    portAuthorizationImageWidth: portImage?.width ?? null,
    portAuthorizationImageHeight: portImage?.height ?? null,
    portAuthorizationImageSizeBytes: portImage?.sizeBytes ?? null,
    portNotes: input.isPort ? input.portNotes ?? null : null,
  }
}

/** The storage URLs the incoming content references — course images and the
 *  port-authorization image. Used for the replace's stale-image diff and for
 *  both failure compensations. */
function contentImageUrls(input: SubmissionInput): string[] {
  return [
    ...input.courses.map((course) => course.image.url),
    ...(input.isPort && input.portAuthorizationImage
      ? [input.portAuthorizationImage.url]
      : []),
  ]
}

/** One mapper row write: the wire `{ steamId64, displayName }` maps to the
 *  persisted `displayNameSnapshot` exactly once, shared by the submission
 *  and per-course mapper writes. */
function toMapperWrite(mapper: {
  steamId64: string
  displayName: string
}): SubmissionMapperWrite {
  return {
    steamId64: mapper.steamId64,
    displayNameSnapshot: mapper.displayName,
  }
}

/** One content write, shared by insert and replace: the mapper rows and the
 *  course rows — with their per-course mappers — are replaced wholesale, so
 *  added/removed/reordered courses and changed mappers land in one request.
 *  The submission-row insert (insert) and guarded content update (replace)
 *  are the only parts the two paths do not share. */
async function writeContent(
  store: SubmissionContentStore,
  submissionId: string,
  input: SubmissionInput,
): Promise<void> {
  await store.replaceMappers(submissionId, input.mappers.map(toMapperWrite))

  await store.replaceCourses(
    submissionId,
    input.courses.map((course, index) => ({
      orderIndex: index + 1,
      name: course.name,
      imageUrl: course.image.url,
      imageMime: course.image.mime,
      imageWidth: course.image.width,
      imageHeight: course.image.height,
      imageSizeBytes: course.image.sizeBytes,
      mappers: course.mappers.map(toMapperWrite),
    })),
  )
}

interface GuardedWriteOptions {
  notFoundMessage: string
  reviewStartedMessage: string
}

type WriteOutcome<T> = { result: T; removedUrls: string[] }

/** Shared transaction spine for the guarded operations (replace, delete):
 *  re-read the row inside the transaction, map missing *and* non-creator to
 *  the same opaque 404 (no existence leak), run the ADR-0002 mutability gate
 *  inside the transaction when an owner is passed — the lead path passes no
 *  owner and skips the gate entirely — then run the kind-specific write step
 *  and compensate storage after the commit. A throw inside the transaction
 *  discards every row the step wrote — the loser of a race that flips the
 *  status or lands a vote between the write starting and the re-read rolls
 *  back instead of committing. */
async function runGuardedWrite<T>(
  deps: SubmissionContentDeps,
  submissionId: string,
  options: GuardedWriteOptions,
  ownerUserId: string | undefined,
  write: (store: SubmissionContentStore) => Promise<WriteOutcome<T>>,
): Promise<T> {
  let outcome: WriteOutcome<T> | undefined

  await deps.runTransaction(async (store) => {
    const submission = await store.getSubmission(submissionId)
    if (!submission) {
      throw createError({
        statusCode: 404,
        statusMessage: options.notFoundMessage,
      })
    }

    if (ownerUserId) {
      // Opaque 404 for anyone who is not the creator — a non-creator must
      // not learn whether the submission exists.
      if (submission.createdByUserId !== ownerUserId) {
        throw createError({
          statusCode: 404,
          statusMessage: options.notFoundMessage,
        })
      }

      // ADR-0002: the owner may mutate only while the submission is pending
      // with zero votes; the first vote moves it in review and closes the
      // window permanently. Checked inside the transaction so a vote landing
      // mid-request still fails the write.
      const voteCount = await store.countVotes(submissionId)
      if (!canMutateSubmission({ status: submission.status, voteCount })) {
        throw createError({
          statusCode: 409,
          statusMessage: options.reviewStartedMessage,
        })
      }
    }

    outcome = await write(store)
  })

  await deps.deleteStorageObjects(outcome!.removedUrls)
  return outcome!.result
}

/** Best-effort orphan compensation for a failed replace: delete the body's
 *  upload URLs that no persisted row still references. The reference read
 *  runs on a fresh transaction after the failed write rolled back, so
 *  carried-over pre-filled-edit URLs — which the (rolled-back) state still
 *  references — are excluded and only the failed write's own new uploads are
 *  removed. A read or storage hiccup must never fail or mask the original
 *  error. */
async function compensateOrphanedUploads(
  deps: SubmissionContentDeps,
  submissionId: string,
  bodyUrls: string[],
): Promise<void> {
  let referenced: string[] = []
  try {
    referenced = await deps.runTransaction((store) =>
      store.listSubmissionImageUrls(submissionId),
    )
  }
  catch (err) {
    console.error(
      'Skipping orphan compensation: could not read referenced image URLs',
      err,
    )
  }

  try {
    await deps.deleteStorageObjects(
      bodyUrls.filter((url) => !referenced.includes(url)),
    )
  }
  catch (err) {
    console.error('Skipping orphan compensation: storage cleanup failed', err)
  }
}

export interface SubmissionContentService {
  createSubmission(
    createdByUserId: string,
    input: SubmissionInput,
  ): Promise<SubmissionRow>
  updateSubmission(
    submissionId: string,
    ownerUserId: string,
    input: SubmissionInput,
  ): Promise<{ id: string }>
  deleteSubmission(
    submissionId: string,
    ownerUserId?: string,
  ): Promise<{ id: string }>
}

/** Binds the submission-content spine to a concrete store/transaction and
 *  storage implementation. Production wiring lives in `./index.ts`; the
 *  tests bind the in-memory fake. */
export function createSubmissionContentService(
  deps: SubmissionContentDeps,
): SubmissionContentService {
  return {
    async createSubmission(createdByUserId, input) {
      const content = toContentWrite(input)
      const bodyUrls = contentImageUrls(input)

      try {
        return await deps.runTransaction(async (store) => {
          const submission = await store.createSubmission(
            createdByUserId,
            content,
          )
          await writeContent(store, submission.id, input)
          return submission
        })
      }
      catch (err) {
        // A throw rolled the fresh row (and its children) back, so nothing
        // persists yet: every upload URL the body referenced is orphaned
        // (none are referenced). Best-effort, like post-commit cleanup —
        // never fail the caller.
        await deps.deleteStorageObjects(bodyUrls)
        throw err
      }
    },

    async updateSubmission(submissionId, ownerUserId, input) {
      const content = toContentWrite(input)
      const bodyUrls = contentImageUrls(input)

      try {
        return await runGuardedWrite(
          deps,
          submissionId,
          {
            notFoundMessage: 'Submission not found',
            reviewStartedMessage: 'Review has started',
          },
          ownerUserId,
          async (store) => {
            // The URLs the current (pre-edit) content references, so any the
            // saved content no longer references are removed from storage
            // after the commit.
            const oldUrls = await store.listSubmissionImageUrls(submissionId)

            const updated = await store.updateSubmissionContent(
              submissionId,
              content,
            )
            if (!updated) {
              // Belt-and-braces: the in-transaction re-read already verified
              // the row and its vote count, so a zero-row guarded update
              // means the submission moved between the re-read and the
              // write. A clear conflict instead of an empty 200 — and the
              // throw rolls the whole write back.
              throw createError({
                statusCode: 409,
                statusMessage: 'Review has started',
              })
            }

            await writeContent(store, submissionId, input)

            return {
              result: { id: submissionId },
              removedUrls: oldUrls.filter((url) => !bodyUrls.includes(url)),
            }
          },
        )
      }
      catch (err) {
        // A failed replace leaves the pre-edit state in place: compensate
        // only the body's uploads that no persisted row still references
        // (carried-over pre-filled-edit URLs are still referenced by the
        // rolled-back state and are excluded). Post-commit stale cleanup
        // still ran on success above.
        await compensateOrphanedUploads(deps, submissionId, bodyUrls)
        throw err
      }
    },

    async deleteSubmission(submissionId, ownerUserId) {
      return runGuardedWrite(
        deps,
        submissionId,
        {
          notFoundMessage: 'Submission not found',
          reviewStartedMessage: 'Review has started',
        },
        ownerUserId,
        async (store) => {
          // Collect the stored URLs — course images, the
          // port-authorization image, and any vote/decision attachment
          // objects — before the delete cascades them away.
          const [imageUrls, attachmentUrls] = await Promise.all([
            store.listSubmissionImageUrls(submissionId),
            store.listSubmissionAttachmentUrls(submissionId),
          ])

          await store.deleteSubmissionRow(submissionId)

          return {
            result: { id: submissionId },
            removedUrls: [...imageUrls, ...attachmentUrls],
          }
        },
      )
    },
  }
}