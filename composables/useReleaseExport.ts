export function useReleaseExport() {
  const exporting = useState<boolean>('release-exporting', () => false)

  async function exportRelease(releaseId: string) {
    exporting.value = true
    try {
      const payload = await $fetch(`/api/releases/${releaseId}/export`)
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `release-${releaseId}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      return payload
    } finally {
      exporting.value = false
    }
  }

  return {
    exporting,
    exportRelease,
  }
}
