import { createError } from 'h3'

const WORKSHOP_ID_PATTERNS = [
  /[?&]id=(\d+)/i,
  /\/filedetails\/\?id=(\d+)/i,
  /\/sharedfiles\/filedetails\/\?id=(\d+)/i,
  /\/(\d+)(?:\/)?$/i,
]

export function extractWorkshopId(workshopUrl: string): number | null {
  const trimmedUrl = workshopUrl.trim()

  for (const pattern of WORKSHOP_ID_PATTERNS) {
    const match = trimmedUrl.match(pattern)
    if (match) {
      const id = Number(match[1])
      return Number.isSafeInteger(id) ? id : null
    }
  }

  try {
    const parsedUrl = new URL(trimmedUrl)
    const id = parsedUrl.searchParams.get('id')
    if (!id) {
      return null
    }
    const parsedId = Number(id)
    return Number.isSafeInteger(parsedId) ? parsedId : null
  } catch {
    return null
  }
}

export function assertWorkshopId(workshopUrl: string): number {
  const workshopId = extractWorkshopId(workshopUrl)

  if (!workshopId || Number.isNaN(workshopId)) {
    // A happy-path derivation: the shared wire schema's refine already admits
    // only URLs with a numeric `id`, so this only fires for a URL that passed
    // the digit check yet has no usable id — an id overflowing a safe integer,
    // or a falsy 0 that is not a real workshop item. A caller mistake: 400,
    // never a raw-Error 500.
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Steam Workshop URL',
    })
  }

  return workshopId
}
