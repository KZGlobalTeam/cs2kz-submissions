import { describe, expect, it } from 'vitest'

import {
  assessRejectionAttachments,
  computeAttachmentReplacement,
  isRejectionAttachmentKey,
  isUrlUnderPrefix,
  objectKeyFromStorageUrl,
} from '~/server/utils/attachment-rules'
import type { RejectionAttachment } from '~/shared/types/attachment'

const BASE = 'https://project.supabase.co/storage/v1/object/public/submissions/'
const PREFIX = 'rejection-attachments/'

function attachment(url: string): RejectionAttachment {
  return {
    url,
    mime: 'image/png',
    width: 64,
    height: 32,
    sizeBytes: 1024,
  }
}

const validUrl = `${BASE}${PREFIX}abc.png`

describe('assessRejectionAttachments', () => {
  it('accepts attachments on a rejection with a written reason', () => {
    const verdict = assessRejectionAttachments({
      isRejection: true,
      reason: 'The blocker is broken',
      attachments: [attachment(validUrl)],
      publicBaseUrl: BASE,
      allowedPrefix: PREFIX,
    })

    expect(verdict.ok).toBe(true)
    if (verdict.ok) {
      expect(verdict.attachments).toEqual([attachment(validUrl)])
    }
  })

  it('rejects attachments on an approval decision', () => {
    const verdict = assessRejectionAttachments({
      isRejection: false,
      reason: null,
      attachments: [attachment(validUrl)],
      publicBaseUrl: BASE,
      allowedPrefix: PREFIX,
    })

    expect(verdict).toEqual({ ok: false, reason: 'attachments-not-allowed' })
  })

  it('requires a written reason when a rejection carries attachments', () => {
    const verdict = assessRejectionAttachments({
      isRejection: true,
      reason: '   ',
      attachments: [attachment(validUrl)],
      publicBaseUrl: BASE,
      allowedPrefix: PREFIX,
    })

    expect(verdict).toEqual({ ok: false, reason: 'reason-required' })
  })

  it('does not require a reason for an empty attachment list', () => {
    const verdict = assessRejectionAttachments({
      isRejection: true,
      reason: null,
      attachments: [],
      publicBaseUrl: BASE,
      allowedPrefix: PREFIX,
    })

    expect(verdict.ok).toBe(true)
  })

  it('rejects URLs outside the configured storage prefix', () => {
    const verdict = assessRejectionAttachments({
      isRejection: true,
      reason: 'glitch',
      attachments: [attachment(`${BASE}port-images/evil.png`)],
      publicBaseUrl: BASE,
      allowedPrefix: PREFIX,
    })

    expect(verdict).toEqual({ ok: false, reason: 'url-outside-prefix' })
  })

  it('rejects URLs on a different bucket entirely', () => {
    const verdict = assessRejectionAttachments({
      isRejection: true,
      reason: 'glitch',
      attachments: [attachment('https://other.supabase.co/storage/v1/object/public/x/rejection-attachments/a.png')],
      publicBaseUrl: BASE,
      allowedPrefix: PREFIX,
    })

    expect(verdict).toEqual({ ok: false, reason: 'url-outside-prefix' })
  })

  it('rejects duplicate attachment URLs', () => {
    const verdict = assessRejectionAttachments({
      isRejection: true,
      reason: 'glitch',
      attachments: [attachment(validUrl), attachment(validUrl)],
      publicBaseUrl: BASE,
      allowedPrefix: PREFIX,
    })

    expect(verdict).toEqual({ ok: false, reason: 'duplicate-url' })
  })
})

describe('computeAttachmentReplacement', () => {
  const stored = [
    attachment(`${validUrl}a`),
    attachment(`${validUrl}b`),
  ]
  const incoming = [
    attachment(`${validUrl}b`),
    attachment(`${validUrl}c`),
  ]

  it('splits the incoming list into added and kept, stored leftovers into removed', () => {
    const result = computeAttachmentReplacement(stored, incoming)

    expect(result.added.map((a) => a.url)).toEqual([`${validUrl}c`])
    expect(result.kept.map((a) => a.url)).toEqual([`${validUrl}b`])
    expect(result.removed.map((a) => a.url)).toEqual([`${validUrl}a`])
  })

  it('removes everything when the incoming list is empty', () => {
    const result = computeAttachmentReplacement(stored, [])

    expect(result.removed).toEqual(stored)
    expect(result.added).toEqual([])
  })

  it('adds everything when there is nothing stored', () => {
    const result = computeAttachmentReplacement([], incoming)

    expect(result.added).toEqual(incoming)
    expect(result.removed).toEqual([])
  })
})

describe('storage URL helpers', () => {
  it('checks whether a URL lives under the storage prefix', () => {
    expect(isUrlUnderPrefix(validUrl, BASE, PREFIX)).toBe(true)
    expect(isUrlUnderPrefix(`${BASE}port-images/x.png`, BASE, PREFIX)).toBe(false)
    expect(isUrlUnderPrefix('https://evil.com/rejection-attachments/x.png', BASE, PREFIX)).toBe(false)
  })

  it('extracts the object key from a public storage URL', () => {
    expect(objectKeyFromStorageUrl(validUrl, BASE)).toBe(`${PREFIX}abc.png`)
    expect(objectKeyFromStorageUrl('https://evil.com/x.png', BASE)).toBeNull()
  })

  it('recognises only app-generated rejection-attachment keys', () => {
    expect(isRejectionAttachmentKey(`${PREFIX}3a6a29d0-0445-484d-9152-3131ffc8209b.png`)).toBe(true)
    expect(isRejectionAttachmentKey(`${PREFIX}3a6a29d0-0445-484d-9152-3131ffc8209b.jpg`)).toBe(true)
    expect(isRejectionAttachmentKey(`${PREFIX}abc.png`)).toBe(false)
    expect(isRejectionAttachmentKey(`${PREFIX}../course-images/steal.jpg`)).toBe(false)
    expect(isRejectionAttachmentKey('course-images/x.png')).toBe(false)
    expect(isRejectionAttachmentKey(`${PREFIX}3a6a29d0.gif`)).toBe(false)
  })
})