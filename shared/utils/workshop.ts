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
    throw new Error('Invalid Steam Workshop URL')
  }

  return workshopId
}
