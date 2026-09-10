export function useReleaseExport() {
  // Scoped to the single release being exported, so the Releases page can
  // show a spinner on exactly that row's Export JSON button (mirrors
  // useReleaseImagePack's downloadingId).
  const exportingId = useState<string | null>('release-exporting-id', () => null)
  const exportOpen = useState<boolean>('release-export-open', () => false)
  const exportJson = useState<string | null>('release-export-json', () => null)
  const exportTitle = useState<string>('release-export-title', () => 'Export JSON')

  async function exportRelease(releaseId: string, name?: string) {
    exportingId.value = releaseId
    try {
      const payload = await $fetch(`/api/cs2/releases/${releaseId}/export`)
      exportJson.value = JSON.stringify(payload, null, 2)
      exportTitle.value = name ? `Export: ${name}` : 'Export JSON'
      exportOpen.value = true
      return payload
    } finally {
      exportingId.value = null
    }
  }

  function closeExport() {
    exportOpen.value = false
    exportJson.value = null
  }

  return {
    exportingId,
    exportOpen,
    exportJson,
    exportTitle,
    exportRelease,
    closeExport,
  }
}
