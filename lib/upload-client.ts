export interface UploadResult {
  url: string
  filename: string
  size: number
  type: string
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (data?.error) return data.error
  } catch {
    // Antwort war kein JSON (z. B. 413 von Vercel als Plain-Text)
  }
  if (res.status === 413) return "Datei ist zu groß für den Server"
  return `Server-Fehler (${res.status})`
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const urlRes = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, type: file.type, size: file.size }),
  })

  if (!urlRes.ok) {
    throw new Error(await readError(urlRes))
  }

  const { signedUrl, publicUrl } = await urlRes.json()

  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  })

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "")
    throw new Error(text || `Upload zum Storage fehlgeschlagen (${uploadRes.status})`)
  }

  return {
    url: publicUrl,
    filename: file.name,
    size: file.size,
    type: file.type,
  }
}
