import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import { useReleaseDiscordMessage } from '~/composables/useReleaseDiscordMessage'

/**
 * `useReleaseDiscordMessage` drives the per-release "Discord Message" button
 * on the Releases page. Like the JSON export, its loading state is scoped to
 * exactly the release being fetched, and the URL carries the current route's
 * game segment.
 */

interface RouteContext {
  params: { game?: string }
}

interface PendingFetch {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}

describe('useReleaseDiscordMessage', () => {
  const stateStore = new Map<string, { value: unknown }>()
  let pendingFetches: PendingFetch[]
  let fetchedUrls: string[]
  let routeContext: RouteContext

  beforeEach(() => {
    stateStore.clear()
    pendingFetches = []
    fetchedUrls = []
    routeContext = reactive<RouteContext>({ params: { game: 'cs2' } })
    // Stand in for Nuxt's auto-imported `useState`: keyed, shared state with
    // a plain `{ value }` ref-like shape — enough reactivity for assertions.
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!stateStore.has(key)) {
        stateStore.set(key, { value: init() })
      }
      return stateStore.get(key)!
    })
    // Stand in for Nuxt's auto-imported `useRoute` — a reactive route whose
    // `params.game` is the game segment `useGameRoute` resolves.
    vi.stubGlobal('useRoute', () => routeContext)
    // Stand in for Nuxt's auto-imported `$fetch`: hold the export request
    // open so the "in flight" window is observable, and record the URL.
    vi.stubGlobal(
      '$fetch',
      vi.fn((url: string) => {
        fetchedUrls.push(url)
        return new Promise((resolve, reject) => {
          pendingFetches.push({ resolve, reject })
        })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('flags only the clicked release while its export is in flight', async () => {
    const { discordMessageId, fetchDiscordMessage } = useReleaseDiscordMessage()

    const pending = fetchDiscordMessage('release-a', 'Release A')

    expect(discordMessageId.value).toBe('release-a')

    pendingFetches[0]!.resolve({ message: 'hi' })
    await pending

    expect(discordMessageId.value).toBeNull()
  })

  it('scopes the flag to the latest export when another is started', async () => {
    const { discordMessageId, fetchDiscordMessage } = useReleaseDiscordMessage()

    const first = fetchDiscordMessage('release-a', 'Release A')
    const second = fetchDiscordMessage('release-b', 'Release B')

    expect(discordMessageId.value).toBe('release-b')

    pendingFetches[0]!.resolve({ message: 'hi' })
    pendingFetches[1]!.resolve({ message: 'hi' })
    await Promise.all([first, second])

    expect(discordMessageId.value).toBeNull()
  })

  it('clears the flag when the export fails', async () => {
    const { discordMessageId, fetchDiscordMessage } = useReleaseDiscordMessage()

    const pending = fetchDiscordMessage('release-a', 'Release A')

    expect(discordMessageId.value).toBe('release-a')

    pendingFetches[0]!.reject(new Error('boom'))
    await expect(pending).rejects.toThrow('boom')

    expect(discordMessageId.value).toBeNull()
  })

  it('opens the modal with the fetched message text', async () => {
    const { discordMessage, discordMessageOpen, discordMessageTitle, fetchDiscordMessage } = useReleaseDiscordMessage()

    const pending = fetchDiscordMessage('release-a', 'Release A')
    pendingFetches[0]!.resolve({ message: 'hi' })
    await pending

    expect(discordMessage.value).toBe('hi')
    expect(discordMessageOpen.value).toBe(true)
    expect(discordMessageTitle.value).toBe('Discord message: Release A')
  })

  it('requests the message from the current route’s game segment, reacting to a game switch', async () => {
    const { fetchDiscordMessage } = useReleaseDiscordMessage()

    // The context can still be re-scoped after the composable is bound, like
    // flipping the game switcher before this session's first export.
    routeContext.params.game = 'csgo'
    const pending = fetchDiscordMessage('release-a', 'Release A')
    pendingFetches[0]!.resolve({ message: 'hi' })
    await pending

    expect(fetchedUrls).toEqual(['/api/csgo/releases/release-a/discord-message'])
  })
})