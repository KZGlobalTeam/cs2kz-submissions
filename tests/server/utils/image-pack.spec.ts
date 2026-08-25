import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'

import {
  IMAGE_PACK_CONCURRENCY,
  toImagePackStream,
  type ImagePackFetcher,
  type ImagePackMap,
} from '~/server/utils/image-pack'

interface FetcherState {
  checkInFlight: number
  fetchInFlight: number
  maxCheckInFlight: number
  maxFetchInFlight: number
}

interface FakeFetcherOptions {
  /** URL → canned image bytes. */
  images: Record<string, Uint8Array>
  failCheck?: (url: string) => boolean
  failFetch?: (url: string) => boolean
  delayMs?: number
}

/** Injected fake transport: serves canned bytes, optionally failing specific
 *  URLs, and records the observed concurrency without ever hitting the wire. */
function makeFetcher(options: FakeFetcherOptions): {
  fetcher: ImagePackFetcher
  state: FetcherState
} {
  const state: FetcherState = {
    checkInFlight: 0,
    fetchInFlight: 0,
    maxCheckInFlight: 0,
    maxFetchInFlight: 0,
  }

  const delay = () =>
    options.delayMs ? new Promise((resolve) => setTimeout(resolve, options.delayMs)) : undefined

  const fetcher: ImagePackFetcher = {
    async check(url) {
      state.checkInFlight += 1
      state.maxCheckInFlight = Math.max(state.maxCheckInFlight, state.checkInFlight)
      try {
        await delay()
        if (options.failCheck?.(url)) {
          throw new Error(`HEAD ${url} failed`)
        }
        if (!(url in options.images)) {
          throw new Error(`HEAD ${url}: unknown image`)
        }
      }
      finally {
        state.checkInFlight -= 1
      }
    },
    async fetch(url) {
      state.fetchInFlight += 1
      state.maxFetchInFlight = Math.max(state.maxFetchInFlight, state.fetchInFlight)
      try {
        await delay()
        if (options.failFetch?.(url)) {
          throw new Error(`GET ${url} failed`)
        }
        const bytes = options.images[url]
        if (!bytes) {
          throw new Error(`GET ${url}: unknown image`)
        }
        return bytes
      }
      finally {
        state.fetchInFlight -= 1
      }
    },
  }

  return { fetcher, state }
}

/** Consumes the archive stream and concatenates it into one byte array. */
async function archiveBytes(
  maps: ImagePackMap[],
  fetcher: ImagePackFetcher,
): Promise<Uint8Array> {
  const stream = await toImagePackStream(maps, fetcher)
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    chunks.push(value)
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

/** Reads the ZIP central directory straight from the raw bytes so the test
 *  can assert entry order and the store (no-deflate) method. */
function centralDirectoryEntries(bytes: Uint8Array): Array<{ name: string, method: number }> {
  const commentLength = bytes[bytes.length - 2]! | (bytes[bytes.length - 1]! << 8)
  const eocdOffset = bytes.length - 22 - commentLength
  expect(String.fromCharCode(bytes[eocdOffset]!, bytes[eocdOffset + 1]!, bytes[eocdOffset + 2]!, bytes[eocdOffset + 3]!))
    .toBe('PK\u0005\u0006')

  const entryCount = bytes[eocdOffset + 10]! | (bytes[eocdOffset + 11]! << 8)
  const cdOffset = bytes[eocdOffset + 16]!
    | (bytes[eocdOffset + 17]! << 8)
    | (bytes[eocdOffset + 18]! << 16)
    | (bytes[eocdOffset + 19]! << 24)

  const entries: Array<{ name: string, method: number }> = []
  let offset = cdOffset
  for (let i = 0; i < entryCount; i += 1) {
    expect(String.fromCharCode(bytes[offset]!, bytes[offset + 1]!, bytes[offset + 2]!, bytes[offset + 3]!))
      .toBe('PK\u0001\u0002')

    const method = bytes[offset + 10]! | (bytes[offset + 11]! << 8)
    const nameLength = bytes[offset + 28]! | (bytes[offset + 29]! << 8)
    const extraLength = bytes[offset + 30]! | (bytes[offset + 31]! << 8)
    const entryCommentLength = bytes[offset + 32]! | (bytes[offset + 33]! << 8)

    let name = ''
    for (let j = 0; j < nameLength; j += 1) {
      name += String.fromCharCode(bytes[offset + 46 + j]!)
    }
    entries.push({ name, method })

    offset += 46 + nameLength + extraLength + entryCommentLength
  }
  return entries
}

function jpegBytes(seed: number): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, seed & 0xff, (seed >> 8) & 0xff, seed + 7])
}

describe('buildImagePack (via toImagePackStream)', () => {
  it('packs one store-mode folder per map, files named by raw course order, in manifest order', async () => {
    const a1 = jpegBytes(1)
    const a3 = jpegBytes(2)
    const b2 = jpegBytes(3)

    // Manifest order is deliberately NOT alphabetical: the archive must
    // follow the manifest, not be sorted.
    const maps: ImagePackMap[] = [
      {
        mapName: 'zzz_late',
        courses: [{ orderIndex: 3, name: 'Bonus', imageUrl: 'https://bucket/zzz/bonus.jpg' }],
      },
      {
        mapName: 'aaa_early',
        courses: [
          { orderIndex: 1, name: 'Main', imageUrl: 'https://bucket/aaa/main.jpg' },
          { orderIndex: 2, name: 'Side', imageUrl: 'https://bucket/aaa/side.jpg' },
        ],
      },
    ]
    const { fetcher } = makeFetcher({
      images: {
        'https://bucket/zzz/bonus.jpg': b2,
        'https://bucket/aaa/main.jpg': a1,
        'https://bucket/aaa/side.jpg': a3,
      },
    })

    const bytes = await archiveBytes(maps, fetcher)

    // Folder = map name, file = raw orderIndex + ".jpg", order = manifest order.
    const entries = centralDirectoryEntries(bytes)
    expect(entries.map((entry) => entry.name)).toEqual([
      'zzz_late/3.jpg',
      'aaa_early/1.jpg',
      'aaa_early/2.jpg',
    ])
    // Store mode: every entry uses method 0, never deflate.
    expect(entries.every((entry) => entry.method === 0)).toBe(true)

    // The archive parses back with matching, byte-for-byte content.
    const files = unzipSync(bytes)
    expect(Object.keys(files)).toEqual(['zzz_late/3.jpg', 'aaa_early/1.jpg', 'aaa_early/2.jpg'])
    expect(files['zzz_late/3.jpg']!).toEqual(b2)
    expect(files['aaa_early/1.jpg']!).toEqual(a1)
    expect(files['aaa_early/2.jpg']!).toEqual(a3)
  })

  it('throws a 400 with a clear message for an empty manifest', async () => {
    const { fetcher } = makeFetcher({ images: {} })

    await expect(toImagePackStream([], fetcher)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Release contains no maps to pack',
    })
  })

  it('rejects with an error naming the map and course when pre-flight fails, before producing any bytes', async () => {
    const url = 'https://bucket/aaa/main.jpg'
    const { fetcher } = makeFetcher({
      images: { url: jpegBytes(1) },
      failCheck: (candidate) => candidate === url,
    })

    await expect(toImagePackStream(
      [
        {
          mapName: 'aaa_early',
          courses: [{ orderIndex: 1, name: 'Main', imageUrl: url }],
        },
      ],
      fetcher,
    )).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'Failed to fetch course image "Main" for map "aaa_early"',
    })
  })

  it('rejects with an error naming the map and course when a download fails after pre-flight passed', async () => {
    const url = 'https://bucket/aaa/main.jpg'
    const { fetcher } = makeFetcher({
      images: { url: jpegBytes(1) },
      failFetch: (candidate) => candidate === url,
    })

    await expect(toImagePackStream(
      [
        {
          mapName: 'aaa_early',
          courses: [{ orderIndex: 1, name: 'Main', imageUrl: url }],
        },
      ],
      fetcher,
    )).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'Failed to fetch course image "Main" for map "aaa_early"',
    })
  })

  it('bounds concurrent image requests to IMAGE_PACK_CONCURRENCY', async () => {
    const maps: ImagePackMap[] = Array.from({ length: 3 }, (_, mapIndex) => ({
      mapName: `map_${mapIndex}_${'x'.repeat(20)}`,
      courses: Array.from({ length: 7 }, (_, courseIndex) => ({
        orderIndex: courseIndex + 1,
        name: `course_${courseIndex}`,
        imageUrl: `https://bucket/map_${mapIndex}/c${courseIndex}.jpg`,
      })),
    }))
    const images: Record<string, Uint8Array> = {}
    for (const map of maps) {
      for (const course of map.courses) {
        images[course.imageUrl] = jpegBytes(course.orderIndex)
      }
    }
    const { fetcher, state } = makeFetcher({ images, delayMs: 5 })

    await archiveBytes(maps, fetcher)

    expect(state.maxCheckInFlight).toBeLessThanOrEqual(IMAGE_PACK_CONCURRENCY)
    expect(state.maxFetchInFlight).toBeLessThanOrEqual(IMAGE_PACK_CONCURRENCY)
    expect(state.maxCheckInFlight).toBeGreaterThan(1)
    expect(state.maxFetchInFlight).toBeGreaterThan(1)
  })
})