// Teilnehmerausweis als Bild — Nummer, Namen und QR-Code auf einer Karte.
//
// Gezeichnet wird auf ein Canvas im Browser, weil der Browser arabische
// Schrift richtig setzt; serverseitige Bildgeneratoren tun sich damit schwer.
// Deshalb laeuft dieses Modul nur im Browser.

import QRCode from "qrcode"

const WIDTH = 1080
const HEIGHT = 1350
const GREEN = "#006911" // entspricht --primary aus globals.css
const GREEN_DARK = "#005400"
const INK = "#171717"
const MUTED = "#6b6b6b"

export interface CardData {
  /** Inhalt des QR-Codes — die Adresse der Einlasskontrolle */
  url: string
  nr: string
  name: string
  nameAr: string
  /** Sportart, Ehrung und Aehnliches, wird als eine Zeile gesetzt */
  meta: string[]
  eventTitle: string
  eventTitleAr: string
  eventDate: string
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
}

// Schriftgroesse so weit verkleinern, bis der Text in die Breite passt —
// arabische Namen sind oft deutlich laenger als die lateinische Fassung
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  weight: number,
): number {
  let size = startSize
  for (;;) {
    ctx.font = `${weight} ${size}px Outfit, system-ui, sans-serif`
    if (ctx.measureText(text).width <= maxWidth || size <= 18) return size
    size -= 2
  }
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export async function drawCard(canvas: HTMLCanvasElement, data: CardData) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  canvas.width = WIDTH
  canvas.height = HEIGHT

  // Erst wenn die Schriften da sind, stimmt die Breitenmessung
  try {
    await document.fonts?.ready
  } catch {
    // ohne Font-API wird mit der Systemschrift gemessen
  }

  // Fehlerkorrektur "H" gleicht bis zu 30 % aus — nur deshalb darf mitten im
  // Code das Vereinslogo liegen, ohne dass er unlesbar wird
  const [logo, qr] = await Promise.all([
    loadImage("/images/logo.png"),
    QRCode.toDataURL(data.url, { width: 600, margin: 0, errorCorrectionLevel: "H" }).then(loadImage),
  ])

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Kopfband
  ctx.fillStyle = GREEN
  ctx.fillRect(0, 0, WIDTH, 280)

  if (logo) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(150, 140, 70, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(logo, 80, 70, 140, 140)
    ctx.restore()
  }

  ctx.textAlign = "left"
  ctx.fillStyle = "#ffffff"
  ctx.font = "700 40px Outfit, system-ui, sans-serif"
  ctx.fillText("Syrische Gemeinschaft", 250, 120)
  ctx.font = "400 34px Outfit, system-ui, sans-serif"
  ctx.fillText("im Saarland", 250, 165)
  ctx.direction = "rtl"
  ctx.textAlign = "right"
  ctx.fillStyle = "rgba(255,255,255,.85)"
  ctx.font = "400 32px Outfit, system-ui, sans-serif"
  ctx.fillText("تجمع السوريين في زارلاند", WIDTH - 60, 165)
  ctx.direction = "ltr"

  // Veranstaltung, zweisprachig
  ctx.textAlign = "center"
  ctx.fillStyle = "rgba(255,255,255,.9)"
  if (data.eventTitle) {
    const size = fitText(ctx, data.eventTitle, WIDTH - 160, 30, 500)
    ctx.font = `500 ${size}px Outfit, system-ui, sans-serif`
    ctx.fillText(data.eventTitle, WIDTH / 2, data.eventTitleAr ? 222 : 240)
  }
  if (data.eventTitleAr) {
    ctx.direction = "rtl"
    const size = fitText(ctx, data.eventTitleAr, WIDTH - 160, 28, 500)
    ctx.font = `500 ${size}px Outfit, system-ui, sans-serif`
    ctx.fillText(data.eventTitleAr, WIDTH / 2, data.eventTitle ? 260 : 240)
    ctx.direction = "ltr"
  }

  // Nummer
  if (data.nr) {
    ctx.fillStyle = GREEN
    ctx.font = "700 108px Outfit, system-ui, sans-serif"
    ctx.fillText(`#${data.nr}`, WIDTH / 2, 410)
  }

  // Namen — arabisch zuerst, das ist hier die gelesene Fassung
  let y = data.nr ? 500 : 440
  if (data.nameAr) {
    ctx.fillStyle = INK
    ctx.direction = "rtl"
    const size = fitText(ctx, data.nameAr, WIDTH - 120, 66, 700)
    ctx.font = `700 ${size}px Outfit, system-ui, sans-serif`
    ctx.fillText(data.nameAr, WIDTH / 2, y)
    ctx.direction = "ltr"
    y += 62
  }
  if (data.name) {
    ctx.fillStyle = data.nameAr ? MUTED : INK
    const size = fitText(ctx, data.name, WIDTH - 120, data.nameAr ? 44 : 64, data.nameAr ? 500 : 700)
    ctx.font = `${data.nameAr ? 500 : 700} ${size}px Outfit, system-ui, sans-serif`
    ctx.fillText(data.name, WIDTH / 2, y)
    y += 52
  }

  // Links-nach-rechts-Marke um jeden Eintrag: sonst dreht die Bidi-Regel
  // mehrere arabische Angaben hintereinander um und "Sportart · Ehrung"
  // steht auf einmal verkehrt herum
  const meta = data.meta
    .filter(Boolean)
    .map((item) => `‎${item}‎`)
    .join("  ·  ")
  if (meta) {
    ctx.fillStyle = MUTED
    const size = fitText(ctx, meta, WIDTH - 140, 32, 400)
    ctx.font = `400 ${size}px Outfit, system-ui, sans-serif`
    ctx.fillText(meta, WIDTH / 2, y)
  }

  // QR-Code mit heller Umrandung, damit er auf jedem Untergrund scharf bleibt.
  // Der Kasten endet ueber der Fusszeile, die wiederum ueber dem Farbbalken
  // liegt — deshalb sind die Werte fest und nicht relativ gerechnet.
  const qrSize = 460
  const qrX = (WIDTH - qrSize) / 2
  const qrY = 674
  ctx.fillStyle = "#ffffff"
  roundedRect(ctx, qrX - 28, qrY - 28, qrSize + 56, qrSize + 56, 32)
  ctx.fill()
  ctx.strokeStyle = "#e4e4e4"
  ctx.lineWidth = 3
  roundedRect(ctx, qrX - 28, qrY - 28, qrSize + 56, qrSize + 56, 32)
  ctx.stroke()
  if (qr) ctx.drawImage(qr, qrX, qrY, qrSize, qrSize)

  // Vereinslogo in der Mitte des Codes. Es verdeckt rund 7 % der Flaeche,
  // die Fehlerkorrektur traegt das.
  if (qr && logo) {
    const badge = Math.round(qrSize * 0.26)
    const cx = WIDTH / 2
    const cy = qrY + qrSize / 2
    ctx.fillStyle = "#ffffff"
    roundedRect(ctx, cx - badge / 2 - 12, cy - badge / 2 - 12, badge + 24, badge + 24, 20)
    ctx.fill()
    ctx.drawImage(logo, cx - badge / 2, cy - badge / 2, badge, badge)
  }

  // Fusszeile zwischen QR-Kasten (endet bei 1162) und Farbbalken (ab 1290)
  ctx.fillStyle = MUTED
  ctx.font = "500 30px Outfit, system-ui, sans-serif"
  ctx.fillText("Bitte am Eingang zeigen", WIDTH / 2, 1215)
  ctx.direction = "rtl"
  ctx.fillText("يرجى إبرازه عند المدخل", WIDTH / 2, 1260)
  ctx.direction = "ltr"

  ctx.fillStyle = GREEN_DARK
  ctx.fillRect(0, HEIGHT - 60, WIDTH, 60)
  if (data.eventDate) {
    ctx.fillStyle = "rgba(255,255,255,.9)"
    ctx.font = "500 28px Outfit, system-ui, sans-serif"
    ctx.fillText(data.eventDate, WIDTH / 2, HEIGHT - 22)
  }
}

// Karte ohne sichtbares Canvas erzeugen — fuer den Teilen-Knopf in der Liste,
// der keine Vorschau braucht
export async function renderCard(data: CardData): Promise<Blob | null> {
  const canvas = document.createElement("canvas")
  await drawCard(canvas, data)
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"))
}

export function cardFileName(data: Pick<CardData, "nr" | "name">): string {
  return `Teilnehmer-${data.nr || data.name || "Ausweis"}.png`.replace(/\s+/g, "-")
}

export type ShareOutcome = "shared" | "saved" | "aborted"

// Erst das Teilen-Menue des Geraets, sonst herunterladen. Ein Abbruch durch
// die Person ist kein Fehler und auch kein Versand.
export async function shareImage(
  blob: Blob,
  fileName: string,
  title: string,
): Promise<ShareOutcome> {
  const file = new File([blob], fileName, { type: "image/png" })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return "shared"
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return "aborted"
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  // Erst freigeben, wenn der Browser den Download angestossen hat
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return "saved"
}

// Vermerken, dass die Person ihren Ausweis hat.
//
// Heikel ist der Zeitpunkt: Sobald WhatsApp in den Vordergrund kommt, friert
// der Browser die Seite ein und bricht laufende Anfragen ab. Deshalb
// "keepalive" — damit stellt der Browser die Anfrage auch dann noch zu, wenn
// die Seite schon im Hintergrund liegt. Klappt es trotzdem nicht, wird beim
// Zurueckkommen nachgeholt.
async function send(formId: string, id: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/participants/qr-shared", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formId, id, shared: true }),
      keepalive: true,
    })
    return res.ok
  } catch {
    return false
  }
}

// Vermerke, die noch nicht beim Server angekommen sind
const offen = new Map<string, string>()
let lauscht = false

function nachholen() {
  if (document.visibilityState !== "visible" || offen.size === 0) return
  for (const [id, formId] of [...offen]) {
    send(formId, id).then((ok) => {
      if (ok) offen.delete(id)
    })
  }
}

export function markQrShared(formId: string, id: string) {
  if (!lauscht) {
    document.addEventListener("visibilitychange", nachholen)
    lauscht = true
  }
  send(formId, id).then((ok) => {
    if (!ok) offen.set(id, formId)
  })
}
