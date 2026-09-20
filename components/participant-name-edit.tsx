"use client"

import React, { useState } from "react"
import { Check, Loader2, Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Participant } from "@/lib/participants"

// Namen eines Teilnehmers berichtigen. Die alte Schreibweise hebt der Server
// auf, damit das Import-Skript die Person weiterhin wiederfindet.

interface Props {
  participant: Participant
  formId: string
  onSaved: (participant: Participant) => void
}

export function ParticipantNameEdit({ participant, formId, onSaved }: Props) {
  const wert = (key: string) => {
    const v = participant.data[key]
    return typeof v === "string" ? v : ""
  }

  const [offen, setOffen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState("")
  const [vorname, setVorname] = useState("")
  const [nachname, setNachname] = useState("")
  const [arabisch, setArabisch] = useState("")

  const oeffnen = () => {
    setVorname(wert("first_name"))
    setNachname(wert("last_name"))
    setArabisch(wert("name_ar"))
    setFehler("")
    setOffen(true)
  }

  const speichern = async () => {
    setBusy(true)
    setFehler("")
    try {
      const res = await fetch("/api/admin/participants/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId,
          id: participant.id,
          first_name: vorname.trim(),
          last_name: nachname.trim(),
          name_ar: arabisch.trim(),
        }),
      })
      if (!res.ok) {
        setFehler("Speichern fehlgeschlagen.")
        return
      }
      const data = await res.json()
      onSaved(data.participant as Participant)
      setOffen(false)
    } catch {
      setFehler("Speichern fehlgeschlagen.")
    } finally {
      setBusy(false)
    }
  }

  if (!offen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={oeffnen}
        className="gap-1.5 h-8 px-2 text-muted-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
        Name ändern
      </Button>
    )
  }

  return (
    <div className="border-t border-border pt-4 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          Vorname
          <Input value={vorname} onChange={(e) => setVorname(e.target.value)} className="mt-1 h-9" />
        </label>
        <label className="text-xs text-muted-foreground">
          Nachname
          <Input
            value={nachname}
            onChange={(e) => setNachname(e.target.value)}
            className="mt-1 h-9"
          />
        </label>
      </div>
      <label className="block text-xs text-muted-foreground">
        Name auf Arabisch · الاسم بالعربية
        <Input
          value={arabisch}
          onChange={(e) => setArabisch(e.target.value)}
          dir="rtl"
          className="mt-1 h-9 text-right"
        />
      </label>

      {fehler && <p className="text-sm text-destructive">{fehler}</p>}

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={speichern} disabled={busy} className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Speichern
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOffen(false)} className="gap-2">
          <X className="h-4 w-4" />
          Abbrechen
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Die bisherige Schreibweise bleibt hinterlegt, damit der Listenabgleich die Person
        weiterhin findet.
      </p>
    </div>
  )
}
