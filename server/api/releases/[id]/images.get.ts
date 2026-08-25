import { createError, getRouterParam, setResponseHeaders } from 'h3'

import { buildImagePackManifest } from '~/server/services/releases/build-image-pack'
import { toImagePackStream, type ImagePackFetcher } from '~/server/utils/image-pack'
import { requireLeadApprover } from '~/server/utils/permissions'

/** Real transport for course images: Supabase Storage public URLs. */
const httpImageFetcher: ImagePackFetcher = {
  async check(url) {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    if (!response.ok) {
      throw new Error(`HEAD ${url} returned ${response.status}`)
    }
  },
  async fetch(url) {
    const response = await fetch(url, { redirect: 'follow' })
    if (!response.ok) {
      throw new Error(`GET ${url} returned ${response.status}`)
    }
    return new Uint8Array(await response.arrayBuffer())
  },
}

/** RFC 5987 percent-encoding for `filename*` — release names are unvalidated
 *  free text, so the header cannot assume ASCII. */
function encodeRfc5987Filename(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

/** `Content-Disposition: attachment` with an ASCII `filename` fallback and an
 *  RFC 5987 `filename*` carrying the real (possibly non-ASCII) name. */
function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/["\r\n]/g, '').replace(/[^\x20-\x7e]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeRfc5987Filename(filename)}`
}

export default defineEventHandler(async (event) => {
  await requireLeadApprover(event)

  const releaseId = getRouterParam(event, 'id')
  if (!releaseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Release id is required',
    })
  }

  const { releaseName, maps } = await buildImagePackManifest(releaseId)

  // `toImagePackStream` runs the whole pre-flight before it resolves, so a
  // missing/unreachable image surfaces as a clean HTTP error naming the map
  // and course — never as a truncated archive. Only afterwards are the
  // attachment headers written and the body streamed. A failure during
  // streaming aborts the download (the stream errors, and on runtimes where
  // h3 pipes to a Node socket the response is torn down too) instead of
  // emitting a partial ZIP that could be mistaken for a complete one.
  const stream = await toImagePackStream(maps, httpImageFetcher, () => {
    event.node.res.destroy?.()
  })

  setResponseHeaders(event, {
    'Content-Type': 'application/zip',
    'Content-Disposition': contentDispositionAttachment(`${releaseName}.zip`),
  })

  return stream
})