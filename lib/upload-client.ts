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

// Bilder werden vor dem Hochladen verkleinert. Die Webseite liefert sie
// unveraendert aus (images.unoptimized), und jedes Handyfoto mit 5-10 MB ging
// sonst an jeden Besucher — das hat das Egress-Kontingent von Supabase gesprengt.
const MAX_IMAGE_EDGE = 1920
const IMAGE_QUALITY = 0.82
const SHRINKABLE = new Set(["image/jpeg", "image/png", "image/webp"])

// Dateinamen sind UUIDs und werden nie ueberschrieben — der Browser darf sie
// ein Jahr behalten, statt sie bei jedem Seitenaufruf neu zu holen.
const CACHE_SECONDS = "31536000"

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("image"))
    }
    img.src = url
  })
}

// Liefert die verkleinerte Fassung, oder die Originaldatei, wenn sich nichts
// gewinnen laesst (GIFs bleiben unangetastet, sonst waeren sie nicht mehr animiert)
async function shrinkImage(file: File): Promise<File> {
  if (!SHRINKABLE.has(file.type)) return file

  try {
    const img = await loadImage(file)
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // PNG kann transparent sein — WebP behaelt das, JPEG nicht
    const type = file.type === "image/jpeg" ? "image/jpeg" : "image/webp"
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, IMAGE_QUALITY))
    if (!blob || blob.size >= file.size) return file

    const base = file.name.replace(/\.[^.]+$/, "") || "bild"
    return new File([blob], `${base}.${type === "image/jpeg" ? "jpg" : "webp"}`, { type })
  } catch {
    return file
  }
}

export async function uploadFile(original: File): Promise<UploadResult> {
  const file = await shrinkImage(original)

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
    headers: { "Content-Type": file.type, "Cache-Control": `max-age=${CACHE_SECONDS}` },
    body: file,
  })

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "")
    throw new Error(text || `Upload zum Storage fehlgeschlagen (${uploadRes.status})`)
  }

  return {
    url: publicUrl,
    filename: original.name,
    size: file.size,
    type: file.type,
  }
}
