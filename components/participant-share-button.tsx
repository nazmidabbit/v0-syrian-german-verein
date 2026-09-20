"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Check, Loader2, Share2 } from "lucide-react"
import {
  cardFileName,
  markQrShared,
  renderCard,
  shareImage,
  type CardData,
} from "@/lib/participant-card"

// Ausweis direkt aus der Teilnehmerliste weitergeben, ohne den Umweg ueber
// die Detailansicht. Beim Verteilen von ueber hundert Ausweisen zaehlt jeder
// gesparte Griff.

interface Props {
  card: CardData
  submissionId: string
  formId: string
  sharedAt: string
  onShared: (sharedAt: string) => void
}

// Wie lange die Bestaetigung nach dem Teilen stehen bleibt
const CONFIRM_MS = 2500

export function ParticipantShareButton({ card, submissionId, formId, sharedAt, onShared }: Props) {
  const [busy, setBusy] = useState(false)
  // Kurze Bestaetigung nach dem Teilen. Danach wieder das Teilen-Zeichen —
  // dass jemand seinen Ausweis hat, steht schon am QR-Zeichen der Kachel,
  // und der Knopf bleibt ein Knopf.
  const [justShared, setJustShared] = useState(false)
  const blobRef = useRef<Blob | null>(null)
  const pendingRef = useRef<Promise<Blob | null> | null>(null)
  const confirmTimer = useRef(0)

  useEffect(() => () => window.clearTimeout(confirmTimer.current), [])

  // Das Bild schon beim Antippen erzeugen, nicht erst beim Loslassen: Das
  // Teilen-Menue laesst sich nur direkt aus der Geste heraus oeffnen, und so
  // ist das Bild meist fertig, bevor der Finger wieder hochgeht.
  const prepare = useCallback(() => {
    if (blobRef.current || pendingRef.current) return pendingRef.current
    pendingRef.current = renderCard(card).then((blob) => {
      blobRef.current = blob
      return blob
    })
    return pendingRef.current
  }, [card])

  const onClick = useCallback(
    async (event: React.MouseEvent) => {
      // Die Kachel darunter oeffnet die Detailansicht — die soll hier nicht auf
      event.stopPropagation()
      if (busy) return

      setBusy(true)
      try {
        const blob = blobRef.current || (await prepare())
        if (!blob) return

        const outcome = await shareImage(
          blob,
          cardFileName(card),
          `${card.name} — ${card.eventTitle}`,
        )
        if (outcome === "aborted") return

        setJustShared(true)
        window.clearTimeout(confirmTimer.current)
        confirmTimer.current = window.setTimeout(() => setJustShared(false), CONFIRM_MS)

        if (!sharedAt) {
          const at = await markQrShared(formId, submissionId)
          if (at) onShared(at)
        }
      } finally {
        setBusy(false)
      }
    },
    [busy, prepare, card, sharedAt, formId, submissionId, onShared],
  )

  return (
    <button
      type="button"
      onPointerDown={prepare}
      onFocus={prepare}
      onClick={onClick}
      disabled={busy}
      title={sharedAt ? "Ausweis erneut teilen" : "Ausweis teilen"}
      aria-label={sharedAt ? "Ausweis erneut teilen" : "Ausweis teilen"}
      className="rounded-full bg-background/90 backdrop-blur-sm text-foreground p-2 shadow hover:bg-background hover:text-primary transition-colors disabled:opacity-70"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : justShared ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
    </button>
  )
}
