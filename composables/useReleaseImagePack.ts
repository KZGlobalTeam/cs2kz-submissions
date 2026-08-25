/**
 * Download the release's image pack: a server-assembled ZIP of every course
 * image (one folder per map, files named by course order). The server does
 * all the work — the client only saves the returned archive — and failures
 * surface as a toast carrying the server's reason (which names the offending
 * map and course) instead of a truncated file.
 *
 * The client fetches the archive into a Blob (rather than navigating the page
 * straight at the endpoint) so a non-2xx response can be caught and shown as
 * a toast without leaving the page; the server still sends
 * `Content-Disposition: attachment` for any non-JS client.
 */
export function useReleaseImagePack() {
  const downloadingId = useState<string | null>(
    'release-image-pack-downloading',
    () => null,
  )
  const toast = useToast()

  async function downloadImages(releaseId: string, releaseName: string) {
    downloadingId.value = releaseId
    try {
      const response = await fetch(`/api/releases/${releaseId}/images`)

      if (!response.ok) {
        toast.add({ color: 'error', title: await readErrorMessage(response) })
        return
      }

      const blob = await response.blob()
      saveAsDownload(blob, `${releaseName}.zip`)
    }
    catch {
      toast.add({ color: 'error', title: 'Failed to download image pack' })
    }
    finally {
      downloadingId.value = null
    }
  }

  return { downloadingId, downloadImages }
}

/** Pulls the human-readable message out of a Nitro/h3 error response; the
 *  body shape is `{ statusCode, statusMessage, message }`. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json()
    const statusMessage = (payload as { statusMessage?: unknown }).statusMessage
    if (typeof statusMessage === 'string' && statusMessage.length > 0) {
      return statusMessage
    }
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }
  catch {
    // Fall through to the generic message below.
  }
  return 'Failed to download image pack'
}

/** Saves a Blob to disk via a temporary download link. */
function saveAsDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoke on the next tick so the browser can finish the save.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}