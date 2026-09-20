"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Check, Download, Loader2, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  cardFileName,
  drawCard,
  markQrShared,
  shareImage,
  type CardData,
} from "@/lib/participant-card"

// Ausweis mit Vorschau — steht in der Detailansicht eines Teilnehmers.
// Fuer den schnellen Weg ohne Vorschau gibt es den Knopf in der Liste
// (components/participant-share-button.tsx).

interface Props extends CardData {
  /** Einsendung und Formular — fuer den Vermerk "Ausweis wurde geteilt" */
  submissionId: string
  formId: string
  sharedAt: string
  onShared: (sharedAt: string) => void
}

export function ParticipantQrShare(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [preview, setPreview] = useState("")
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState("")

  const { submissionId, formId, sharedAt, onShared } = props
  const fileName = cardFileName(props)

  // Sofort markieren, nicht erst wenn der Server geantwortet hat: Die Antwort
  // kann ausbleiben, weil die Seite hinter WhatsApp einfriert. Der Vermerk
  // selbst wird notfalls spaeter nachgereicht.
  const remember = useCallback(() => {
    if (sharedAt) return
    onShared(new Date().toISOString())
    markQrShared(formId, submissionId)
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
    remember()
  }, [preview, fileName, remember])

  const share = useCallback(async () => {
    if (!blob) return
    const outcome = await shareImage(blob, fileName, `${props.name} — ${props.eventTitle}`)
    if (outcome !== "aborted") remember()
  }, [blob, fileName, props.name, props.eventTitle, remember])

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
              Eingeladen am{" "}
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
