import { useGameRoute } from './useGameRoute'
import { apiGamePath } from '~/shared/utils/games'

/** Drives the per-release "Discord Message" button on the Releases page:
 *  fetches the Release announcement text and opens it in a copy modal.
 *  Mirrors `useReleaseExport` — the loading flag is scoped to the one release
 *  being fetched, so only that row's button spins. Unlike the JSON export,
 *  fetching the announcement never marks the release exported. */
export function useReleaseDiscordMessage() {
  const discordMessageId = useState<string | null>('release-discord-message-id', () => null)
  const discordMessageOpen = useState<boolean>('release-discord-message-open', () => false)
  const discordMessage = useState<string | null>('release-discord-message', () => null)
  const discordMessageTitle = useState<string>('release-discord-message-title', () => 'Discord message')
  const { game } = useGameRoute()

  async function fetchDiscordMessage(releaseId: string, name?: string) {
    discordMessageId.value = releaseId
    try {
      const { message } = await $fetch<{ message: string }>(
        apiGamePath(game.value, `/releases/${releaseId}/discord-message`),
      )
      discordMessage.value = message
      discordMessageTitle.value = name ? `Discord message: ${name}` : 'Discord message'
      discordMessageOpen.value = true
      return message
    } finally {
      discordMessageId.value = null
    }
  }

  function closeDiscordMessage() {
    discordMessageOpen.value = false
    discordMessage.value = null
  }

  return {
    discordMessageId,
    discordMessageOpen,
    discordMessage,
    discordMessageTitle,
    fetchDiscordMessage,
    closeDiscordMessage,
  }
}
