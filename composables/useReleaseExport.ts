export function useReleaseExport() {
  const exporting = useState<boolean>('release-exporting', () => false)
  const exportOpen = useState<boolean>('release-export-open', () => false)
  const exportJson = useState<string | null>('release-export-json', () => null)
  const exportTitle = useState<string>('release-export-title', () => 'Export JSON')

  async function exportRelease(releaseId: string, name?: string) {
    exporting.value = true
    try {
      const payload = await $fetch(`/api/releases/${releaseId}/export`)
      exportJson.value = JSON.stringify(payload, null, 2)
      exportTitle.value = name ? `Export: ${name}` : 'Export JSON'
      exportOpen.value = true
      return payload
    } finally {
      exporting.value = false
    }
  }

  function closeExport() {
    exportOpen.value = false
    exportJson.value = null
  }

  return {
    exporting,
    exportOpen,
    exportJson,
    exportTitle,
    exportRelease,
    closeExport,
  }
}
