const STEAM_ID64_BASE = BigInt('76561197960265728')
const BIG_INT_TWO = BigInt(2)

export function steamId64ToSteamId(steamId64: string): string {
  const numericId = BigInt(steamId64)
  const accountId = numericId - STEAM_ID64_BASE
  const y = accountId % BIG_INT_TWO
  const z = (accountId - y) / BIG_INT_TWO
  return `STEAM_1:${y}:${z}`
}

export function steamIdToSteamId64(steamId: string): string {
  const match = steamId.match(/^STEAM_[0-5]:([0-1]):(\d+)$/)

  if (!match) {
    throw new Error('Invalid SteamID format')
  }

  const yPart = match[1]
  const zPart = match[2]

  if (!yPart || !zPart) {
    throw new Error('Invalid SteamID capture groups')
  }

  const y = BigInt(yPart)
  const z = BigInt(zPart)
  return (STEAM_ID64_BASE + z * BIG_INT_TWO + y).toString()
}
