"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { Check, Download, Loader2, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"

// Einzelner Teilnehmerausweis als Bild — zum Weitergeben ueber WhatsApp oder
// zum Speichern. Gezeichnet wird im Browser auf ein Canvas, weil der Browser
// arabische Schrift richtig setzt; serverseitige Bildgeneratoren tun sich
// damit schwer.

const WIDTH = 1080
const HEIGHT = 1350
const GREEN = "#006911" // entspricht --primary aus globals.css
const GREEN_DARK = "#005400"
const INK = "#171717"
const MUTED = "#6b6b6b"

export interface QrShareProps {
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

interface Props extends QrShareProps {
  /** Einsendung und Formular — fuer den Vermerk "Ausweis wurde geteilt" */
  submissionId: string
  formId: string
  sharedAt: string
  onShared: (sharedAt: string) => void
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

async function drawCard(canvas: HTMLCanvasElement, props: QrShareProps) {
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
    QRCode.toDataURL(props.url, { width: 600, margin: 0, errorCorrectionLevel: "H" }).then(loadImage),
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
  if (props.eventTitle) {
    const size = fitText(ctx, props.eventTitle, WIDTH - 160, 30, 500)
    ctx.font = `500 ${size}px Outfit, system-ui, sans-serif`
    ctx.fillText(props.eventTitle, WIDTH / 2, props.eventTitleAr ? 222 : 240)
  }
  if (props.eventTitleAr) {
    ctx.direction = "rtl"
    const size = fitText(ctx, props.eventTitleAr, WIDTH - 160, 28, 500)
    ctx.font = `500 ${size}px Outfit, system-ui, sans-serif`
    ctx.fillText(props.eventTitleAr, WIDTH / 2, props.eventTitle ? 260 : 240)
    ctx.direction = "ltr"
  }

  // Nummer
  if (props.nr) {
    ctx.fillStyle = GREEN
    ctx.font = "700 108px Outfit, system-ui, sans-serif"
    ctx.fillText(`#${props.nr}`, WIDTH / 2, 410)
  }

  // Namen — arabisch zuerst, das ist hier die gelesene Fassung
  let y = props.nr ? 500 : 440
  if (props.nameAr) {
    ctx.fillStyle = INK
    ctx.direction = "rtl"
    const size = fitText(ctx, props.nameAr, WIDTH - 120, 66, 700)
    ctx.font = `700 ${size}px Outfit, system-ui, sans-serif`
    ctx.fillText(props.nameAr, WIDTH / 2, y)
    ctx.direction = "ltr"
    y += 62
  }
  if (props.name) {
    ctx.fillStyle = props.nameAr ? MUTED : INK
    const size = fitText(ctx, props.name, WIDTH - 120, props.nameAr ? 44 : 64, props.nameAr ? 500 : 700)
    ctx.font = `${props.nameAr ? 500 : 700} ${size}px Outfit, system-ui, sans-serif`
    ctx.fillText(props.name, WIDTH / 2, y)
    y += 52
  }

  // Links-nach-rechts-Marke um jeden Eintrag: sonst dreht die Bidi-Regel
  // mehrere arabische Angaben hintereinander um und "Sportart · Ehrung"
  // steht auf einmal verkehrt herum
  const meta = props.meta
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
  if (props.eventDate) {
    ctx.fillStyle = "rgba(255,255,255,.9)"
    ctx.font = "500 28px Outfit, system-ui, sans-serif"
    ctx.fillText(props.eventDate, WIDTH / 2, HEIGHT - 22)
  }
}

export function ParticipantQrShare(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [preview, setPreview] = useState("")
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState("")

  const fileName = `Teilnehmer-${props.nr || props.name || "Ausweis"}.png`.replace(/\s+/g, "-")

  const { submissionId, formId, sharedAt, onShared } = props

  // Vermerken, dass die Person ihren Ausweis hat. Schlaegt das fehl, ist das
  // kein Grund, den Versand selbst als gescheitert zu behandeln.
  const markShared = useCallback(async () => {
    if (sharedAt) return
    try {
      const res = await fetch("/api/admin/participants/qr-shared", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId, id: submissionId, shared: true }),
      })
      if (!res.ok) return
      const data = await res.json()
      onShared(data.sharedAt || new Date().toISOString())
    } catch {
      // Vermerk bleibt offen
    }
  }, [sharedAt, formId, submissionId, onShared])

  // Das Bild wird im Voraus erzeugt: Ein Teilen-Dialog laesst sich nur direkt
  // aus dem Antippen heraus oeffnen, nicht nach einem await.
  useEffect(() => {
    let alive = true
    const canvas = canvasRef.current
    if (!canvas) return

    drawCard(canvas, props)
      .then(
        () =>
          new Promise<void>((resolve) => {
            canvas.toBlob((result) => {
              if (alive && result) {
                setBlob(result)
                setPreview(URL.createObjectURL(result))
              }
              resolve()
            }, "image/png")
          }),
      )
      .catch(() => {
        if (alive) setError("Bild konnte nicht erzeugt werden.")
      })

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.url, props.nr, props.name, props.nameAr])

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const download = useCallback(() => {
    if (!preview) return
    const link = document.createElement("a")
    link.href = preview
    link.download = fileName
    link.click()
    markShared()
  }, [preview, fileName, markShared])

  const share = useCallback(async () => {
    if (!blob) return
    const file = new File([blob], fileName, { type: "image/png" })

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${props.name} — ${props.eventTitle}`,
        })
        markShared()
        return
      } catch (shareError) {
        // Abbruch durch die Person ist kein Fehler und auch kein Versand
        if ((shareError as Error)?.name === "AbortError") return
      }
    }
    download()
  }, [blob, fileName, props.name, props.eventTitle, download, markShared])

  return (
    <div className="border-t border-border pt-4">
      <canvas ref={canvasRef} className="hidden" />

      {error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={`Ausweis von ${props.name}`}
            className="w-full max-w-[260px] mx-auto rounded-xl border border-border shadow-sm"
          />
          {sharedAt && (
            <p className="flex items-center justify-center gap-1.5 text-sm text-green-700 dark:text-green-500 mt-3">
              <Check className="h-4 w-4" />
              Ausweis geteilt am{" "}
              {new Date(sharedAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <Button className="flex-1 gap-2" onClick={share} disabled={!blob}>
              <Share2 className="h-4 w-4" />
              Teilen
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={download}>
              <Download className="h-4 w-4" />
              Speichern
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Ausweis wird erzeugt …</span>
        </div>
      )}
    </div>
  )
}
