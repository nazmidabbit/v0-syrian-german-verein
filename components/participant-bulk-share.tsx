"use client"

import React, { useCallback, useState } from "react"
import { Loader2, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cardFileName, markManyQrShared, renderCard, type CardData } from "@/lib/participant-card"

// Alle gerade angezeigten Ausweise auf einmal weitergeben — etwa die eines
// Vereins an dessen Trainer. Einzeln bleibt der Knopf auf jeder Kachel.

// Mehr als das nimmt weder das Teilen-Menue noch WhatsApp in einem Rutsch an
const MAX = 30

interface Eintrag {
  id: string
  card: CardData
}

interface Props {
  entries: Eintrag[]
  formId: string
  /** Wird fuer jeden tatsaechlich weitergegebenen Ausweis aufgerufen */
  onShared: (ids: string[]) => void
}

export function ParticipantBulkShare({ entries, formId, onShared }: Props) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(0)
  const [hinweis, setHinweis] = useState("")

  const zuViele = entries.length > MAX

  const run = useCallback(async () => {
    if (busy || entries.length === 0 || zuViele) return
    setBusy(true)
    setDone(0)
    setHinweis("")

    try {
      const files: File[] = []
      const ids: string[] = []

      for (const entry of entries) {
        const blob = await renderCard(entry.card)
        if (blob) {
          files.push(new File([blob], cardFileName(entry.card), { type: "image/png" }))
          ids.push(entry.id)
        }
        setDone((n) => n + 1)
      }

      if (files.length === 0) {
        setHinweis("Es liess sich kein Ausweis erzeugen.")
        return
      }

      if (navigator.canShare?.({ files })) {
        try {
          await navigator.share({ files, title: `${files.length} Teilnehmerausweise` })
          onShared(ids)
          if (!(await markManyQrShared(formId, ids))) {
            setHinweis("Geteilt, aber noch nicht gespeichert — wird beim nächsten Laden nachgereicht.")
          }
          return
        } catch (error) {
          if ((error as Error)?.name === "AbortError") return
        }
      }

      // Kein Teilen-Menue fuer mehrere Dateien: einzeln speichern. Der Browser
      // fragt dabei einmal, ob er mehrere Dateien laden darf.
      for (const file of files) {
        const url = URL.createObjectURL(file)
        const link = document.createElement("a")
        link.href = url
        link.download = file.name
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
        await new Promise((r) => setTimeout(r, 120))
      }
      onShared(ids)
      const gesichert = await markManyQrShared(formId, ids)
      setHinweis(
        gesichert
          ? `${files.length} Ausweise gespeichert.`
          : `${files.length} Ausweise gespeichert, der Vermerk aber noch nicht — wird beim nächsten Laden nachgereicht.`,
      )
    } finally {
      setBusy(false)
    }
  }, [busy, entries, zuViele, formId, onShared])

  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={run} disabled={busy || zuViele} className="gap-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        {busy ? `Ausweis ${done} von ${entries.length} …` : `${entries.length} Ausweise teilen`}
      </Button>

      {zuViele && (
        <span className="text-sm text-muted-foreground">
          Mehr als {MAX} auf einmal nimmt WhatsApp nicht an — bitte weiter eingrenzen.
        </span>
      )}
      {hinweis && <span className="text-sm text-muted-foreground">{hinweis}</span>}
    </div>
  )
}
