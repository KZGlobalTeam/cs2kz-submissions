import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useReleaseExport } from '~/composables/useReleaseExport'

/**
 * `useReleaseExport` drives the per-release "Export JSON" button on the
 * Releases page. The loading state must be scoped to exactly the release
 * being exported: a global boolean would put a spinner on every row's
 * button at once (the bug this spec locks down — the page binds the flag
 * per-row, `exportingId === row.original.id`, mirroring the Download
 * Images / Delete buttons).
 */

interface PendingFetch {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}

describe('useReleaseExport', () => {
  const stateStore = new Map<string, { value: unknown }>()
  let pendingFetches: PendingFetch[]

  beforeEach(() => {
    stateStore.clear()
    pendingFetches = []
    // Stand in for Nuxt's auto-imported `useState`: keyed, shared state with
    // a plain `{ value }` ref-like shape — enough reactivity for assertions.
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!stateStore.has(key)) {
        stateStore.set(key, { value: init() })
      }
      return stateStore.get(key)!
    })
    // Stand in for Nuxt's auto-imported `$fetch`: hold the export request
    // open so the "in flight" window is observable.
    vi.stubGlobal(
      '$fetch',
      vi.fn(
        () =>
          new Promise((resolve, reject) => {
            pendingFetches.push({ resolve, reject })
          }),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('flags only the clicked release while its export is in flight', async () => {
    const { exportingId, exportRelease } = useReleaseExport()

    const pending = exportRelease('release-a', 'Release A')

    expect(exportingId.value).toBe('release-a')

    pendingFetches[0]!.resolve({ maps: [] })
    await pending

    expect(exportingId.value).toBeNull()
  })

  it('scopes the flag to the latest export when another is started', async () => {
    const { exportingId, exportRelease } = useReleaseExport()

    const first = exportRelease('release-a', 'Release A')
    const second = exportRelease('release-b', 'Release B')

    expect(exportingId.value).toBe('release-b')

    pendingFetches[0]!.resolve({ maps: [] })
    pendingFetches[1]!.resolve({ maps: [] })
    await Promise.all([first, second])

    expect(exportingId.value).toBeNull()
  })

  it('clears the flag when the export fails', async () => {
    const { exportingId, exportRelease } = useReleaseExport()

    const pending = exportRelease('release-a', 'Release A')

    expect(exportingId.value).toBe('release-a')

    pendingFetches[0]!.reject(new Error('boom'))
    await expect(pending).rejects.toThrow('boom')

    expect(exportingId.value).toBeNull()
  })
})