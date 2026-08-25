import { Zip, ZipPassThrough } from 'fflate'
import { createError } from 'h3'

/**
 * One course's contribution to an image pack.
 */
export interface ImagePackCourse {
  /** Raw course order within the map; becomes the file name (`1.jpg`, …). */
  orderIndex: number
  /** Course name — used in error messages only. */
  name: string
  /** Public URL of the course image (1920×1080 JPG on Supabase Storage). */
  imageUrl: string
}

/**
 * One map's folder in an image pack.
 */
export interface ImagePackMap {
  mapName: string
  courses: ImagePackCourse[]
}

/**
 * Injected image transport so the pack-builder stays a pure seam: tests feed
 * canned bytes through a fake, production uses HTTP (see the images handler).
 * Both methods must throw on non-2xx or transport error — the pack-builder
 * turns any such failure into an error naming the offending map and course.
 */
export interface ImagePackFetcher {
  /** Pre-flight check of a course image. */
  check(url: string): Promise<void>
  /** Full download of a course image. */
  fetch(url: string): Promise<Uint8Array>
}

/** Max course images fetched concurrently, both during pre-flight and while
 *  streaming entries. Bounding this keeps peak memory to a few images no
 *  matter how large the release is. */
export const IMAGE_PACK_CONCURRENCY = 8

function imageFetchError(mapName: string, course: ImagePackCourse) {
  return createError({
    statusCode: 502,
    statusMessage: `Failed to fetch course image "${course.name}" for map "${mapName}"`,
  })
}

/** Runs `run` over all items with at most `concurrency` calls in flight. */
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  run: (item: T) => Promise<void>,
): Promise<void> {
  const remaining = [...items]
  const workers = Array.from(
    { length: Math.min(concurrency, remaining.length) },
    async () => {
      for (;;) {
        const item = remaining.shift()
        if (item === undefined) {
          return
        }
        await run(item)
      }
    },
  )
  await Promise.all(workers)
}

/**
 * Assembles the archive as an async iterable of raw ZIP bytes.
 *
 * Phase 1 (pre-flight) HEAD-checks every course image in bounded parallel and
 * throws a clean HTTP error naming the offending map and course before a
 * single byte is produced. Phase 2 streams the images into store-mode ZIP
 * entries (no deflate — course images are already-compressed JPGs), one
 * folder per map named after the map, files named `<orderIndex>.jpg`, in
 * exactly the manifest's order. Fetches stay bounded and entries are pushed
 * in manifest order, so the archive structure is fully deterministic.
 */
export async function* buildImagePack(
  maps: ImagePackMap[],
  fetcher: ImagePackFetcher,
): AsyncGenerator<Uint8Array> {
  const images = maps.flatMap((map) =>
    map.courses.map((course) => ({ mapName: map.mapName, course })),
  )

  if (images.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Release contains no maps to pack',
    })
  }

  await runWithConcurrency(
    images,
    IMAGE_PACK_CONCURRENCY,
    async ({ mapName, course }) => {
      try {
        await fetcher.check(course.imageUrl)
      }
      catch {
        throw imageFetchError(mapName, course)
      }
    },
  )

  const pending: Uint8Array[] = []
  let zipError: unknown = null
  const zip = new Zip((err, chunk) => {
    if (err) {
      zipError = err
    }
    else {
      pending.push(chunk)
    }
  })

  for (let offset = 0; offset < images.length; offset += IMAGE_PACK_CONCURRENCY) {
    const window = images.slice(offset, offset + IMAGE_PACK_CONCURRENCY)
    const downloaded = await Promise.all(
      window.map(async ({ mapName, course }) => ({
        mapName,
        course,
        bytes: await downloadEntry(fetcher, mapName, course),
      })),
    )

    for (const { mapName, course, bytes } of downloaded) {
      const entry = new ZipPassThrough(`${mapName}/${course.orderIndex}.jpg`)
      zip.add(entry)
      entry.push(bytes, true)

      if (zipError) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to assemble image pack',
        })
      }
      yield* pending
      pending.length = 0
    }
  }

  zip.end()
  if (zipError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to assemble image pack',
    })
  }
  yield* pending
}

async function downloadEntry(
  fetcher: ImagePackFetcher,
  mapName: string,
  course: ImagePackCourse,
): Promise<Uint8Array> {
  try {
    return await fetcher.fetch(course.imageUrl)
  }
  catch {
    throw imageFetchError(mapName, course)
  }
}

/**
 * Handler-facing wrapper: eagerly runs the pack-builder up to its first yield
 * (which covers the whole pre-flight phase), so hard failures reject this
 * promise and the handler can reply with a clean HTTP error before any
 * response headers or bytes are written. On success it returns a web
 * `ReadableStream` that yields the archive as it is assembled.
 *
 * A failure *during* streaming (after pre-flight passed) errors the stream —
 * the download aborts rather than surfacing as a truncated archive that
 * could be mistaken for a complete one. `onError` lets the caller also tear
 * down its transport (e.g. destroy the socket on runtimes where h3 pipes the
 * stream itself, where an errored stream would otherwise leave the response
 * hanging or ending cleanly after partial bytes).
 */
export async function toImagePackStream(
  maps: ImagePackMap[],
  fetcher: ImagePackFetcher,
  onError?: (error: unknown) => void,
): Promise<ReadableStream<Uint8Array>> {
  const iterator = buildImagePack(maps, fetcher)[Symbol.asyncIterator]()
  const first = await iterator.next()
  let next: Promise<IteratorResult<Uint8Array>> = Promise.resolve(first)

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await next
        if (done) {
          controller.close()
          return
        }
        controller.enqueue(value)
        next = iterator.next()
      }
      catch (error) {
        onError?.(error)
        throw error
      }
    },
    cancel() {
      void iterator.return?.(undefined)
    },
  })
}