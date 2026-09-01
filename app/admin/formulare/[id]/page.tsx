"use client"

import React, { useCallback, useEffect, useState, use } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  CheckCircle,
  ListChecks,
  Loader2,
  LogIn,
  Plus,
  Shield,
  Trash2,
} from "lucide-react"
import { BASE_FIELDS, FIELD_TYPES, FIELD_TYPE_LABELS, slugify, type FieldType } from "@/lib/forms"

interface FormMeta {
  id: string
  title: string
  slug: string
  is_active: boolean
  event_id: string | null
  max_participants: number | null
  closes_at: string | null
  waitlist_enabled: boolean
  unique_by_email: boolean
}

interface EventOption {
  id: string
  title: string
  date: string
}

// Frist als <input type="datetime-local"> darstellen (lokale Zeit des Browsers)
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface EditableField {
  fieldKey: string // leer = wird beim Speichern aus dem Label erzeugt
  label: string
  labelAr: string
  fieldType: FieldType
  optionsText: string // eine Option pro Zeile (DE)
  optionsArText: string // eine Option pro Zeile (AR, gleiche Reihenfolge)
  required: boolean
}

const SELECT_CLASSES =
  "border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] text-sm"

const splitLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

export default function AdminFormFieldsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [form, setForm] = useState<FormMeta | null>(null)
  const [fields, setFields] = useState<EditableField[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accessError, setAccessError] = useState("")
  const [actionError, setActionError] = useState("")
  const [saveInfo, setSaveInfo] = useState("")
  const [saving, setSaving] = useState(false)
  const [baseFieldKey, setBaseFieldKey] = useState("")

  // Anmelde-Einstellungen (Veranstaltung, Teilnehmerzahl, Anmeldeschluss)
  const [events, setEvents] = useState<EventOption[]>([])
  const [eventId, setEventId] = useState("")
  const [maxParticipants, setMaxParticipants] = useState("")
  const [closesAt, setClosesAt] = useState("")
  const [waitlistEnabled, setWaitlistEnabled] = useState(false)
  const [uniqueByEmail, setUniqueByEmail] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check")
      if (res.ok) setAuthenticated(true)
    } catch {
      // not authenticated
    } finally {
      setChecking(false)
    }
  }, [])

  const loadForm = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/forms/${id}`)
      if (res.ok) {
        const data = await res.json()
        setForm(data.form)
        setEventId(data.form?.event_id || "")
        setMaxParticipants(data.form?.max_participants ? String(data.form.max_participants) : "")
        setClosesAt(data.form?.closes_at ? toLocalInput(data.form.closes_at) : "")
        setWaitlistEnabled(Boolean(data.form?.waitlist_enabled))
        setUniqueByEmail(Boolean(data.form?.unique_by_email))
        setFields(
          (data.fields || []).map((f: Record<string, unknown>) => ({
            fieldKey: f.field_key as string,
            label: f.label as string,
            labelAr: (f.label_ar as string) || "",
            fieldType: f.field_type as FieldType,
            optionsText: ((f.options as string[]) || []).join("\n"),
            optionsArText: ((f.options_ar as string[]) || []).join("\n"),
            required: f.required as boolean,
          })),
        )
      } else if (res.status === 404) {
        setAccessError("Formular nicht gefunden.")
      } else {
        setAccessError("Keine Berechtigung für Formulare.")
      }
    } catch {
      setAccessError("Fehler beim Laden.")
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events")
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      }
    } catch {
      setEvents([])
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => {
    if (authenticated) {
      loadForm()
      loadEvents()
    }
  }, [authenticated, loadForm, loadEvents])

  const saveSettings = async () => {
    setActionError("")
    setSaveInfo("")
    const max = maxParticipants.trim()
    if (max && (!/^[0-9]+$/.test(max) || Number(max) < 1)) {
      setActionError("Teilnehmerzahl muss eine Zahl ab 1 sein.")
      return
    }
    setSavingSettings(true)
    try {
      const res = await fetch(`/api/admin/forms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventId || null,
          maxParticipants: max ? Number(max) : null,
          closesAt: closesAt ? new Date(closesAt).toISOString() : null,
          waitlistEnabled,
          uniqueByEmail,
        }),
      })
      if (res.ok) {
        setSaveInfo("Anmelde-Einstellungen gespeichert.")
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(`Speichern fehlgeschlagen (${res.status}): ${data.error || "Unbekannter Fehler"}`)
      }
    } catch {
      setActionError("Verbindungsfehler — Speichern fehlgeschlagen.")
    } finally {
      setSavingSettings(false)
    }
  }

  const usedKeys = new Set(fields.map((f) => f.fieldKey).filter(Boolean))
  const availableBaseFields = BASE_FIELDS.filter((bf) => !usedKeys.has(bf.field_key))

  const addBaseField = () => {
    const base = BASE_FIELDS.find((bf) => bf.field_key === baseFieldKey)
    if (!base) return
    setFields((prev) => [
      ...prev,
      {
        fieldKey: base.field_key,
        label: base.label,
        labelAr: base.label_ar,
        fieldType: base.field_type,
        optionsText: "",
        optionsArText: "",
        required: base.required,
      },
    ])
    setBaseFieldKey("")
    setSaveInfo("")
  }

  const addCustomField = () => {
    setFields((prev) => [
      ...prev,
      { fieldKey: "", label: "", labelAr: "", fieldType: "text", optionsText: "", optionsArText: "", required: false },
    ])
    setSaveInfo("")
  }

  const updateField = (index: number, patch: Partial<EditableField>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
    setSaveInfo("")
  }

  const moveField = (index: number, direction: -1 | 1) => {
    setFields((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setSaveInfo("")
  }

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index))
    setSaveInfo("")
  }

  const saveFields = async () => {
    setActionError("")
    setSaveInfo("")

    for (const field of fields) {
      if (!field.label.trim()) {
        setActionError("Jedes Feld braucht ein Label (Deutsch).")
        return
      }
      if (field.fieldType === "select" && splitLines(field.optionsText).length === 0) {
        setActionError(`Auswahlfeld "${field.label}" braucht mindestens eine Option (eine pro Zeile).`)
        return
      }
    }

    // Feldschluessel erzeugen (aus dem Label) und Eindeutigkeit sicherstellen
    const taken = new Set<string>()
    const payload = fields.map((field) => {
      let key = field.fieldKey || slugify(field.label, "_", "feld")
      let candidate = key
      let counter = 2
      while (taken.has(candidate)) {
        candidate = `${key}_${counter++}`
      }
      key = candidate
      taken.add(key)
      return {
        fieldKey: key,
        label: field.label.trim(),
        labelAr: field.labelAr.trim(),
        fieldType: field.fieldType,
        options: field.fieldType === "select" ? splitLines(field.optionsText) : [],
        optionsAr: field.fieldType === "select" ? splitLines(field.optionsArText) : [],
        required: field.required,
      }
    })

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/forms/${id}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: payload }),
      })
      if (res.ok) {
        setSaveInfo("Felder gespeichert.")
        await loadForm()
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(`Speichern fehlgeschlagen (${res.status}): ${data.error || "Unbekannter Fehler"}`)
      }
    } catch {
      setActionError("Verbindungsfehler — Speichern fehlgeschlagen.")
    } finally {
      setSaving(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <LogIn className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Anmeldung erforderlich</h1>
            <p className="text-muted-foreground mb-6">Bitte melden Sie sich im Admin-Bereich an.</p>
            <Button asChild>
              <Link href="/admin">Zum Admin-Login</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (accessError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Kein Zugriff</h1>
            <p className="text-muted-foreground">{accessError}</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <ListChecks className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Felder definieren</h1>
            <p className="text-xl text-muted-foreground">{form?.title}</p>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <Button size="sm" variant="outline" asChild className="gap-1">
                <Link href="/admin/formulare">
                  <ArrowLeft className="h-4 w-4" /> Zurück zu den Formularen
                </Link>
              </Button>
            </div>

            {actionError && (
              <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-6">
                {actionError}
              </p>
            )}
            {saveInfo && (
              <p className="text-sm bg-primary/10 border border-primary/20 text-foreground rounded-lg px-4 py-3 mb-6">
                {saveInfo}
              </p>
            )}

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Anmeldung: Veranstaltung, Teilnehmerzahl, Anmeldeschluss */}
                <div className="bg-muted rounded-xl p-4 mb-8">
                  <h2 className="font-bold mb-1 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Anmeldung (optional)
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Nur ausfüllen, wenn dieses Formular eine Anmeldung zu einer Veranstaltung ist.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="event">Veranstaltung</Label>
                      <select
                        id="event"
                        className={SELECT_CLASSES}
                        value={eventId}
                        onChange={(e) => setEventId(e.target.value)}
                      >
                        <option value="">Keine Verknüpfung</option>
                        {events.map((event) => (
                          <option key={event.id} value={event.id}>{event.title}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Verknüpft: Anmelde-Knopf erscheint bei der Veranstaltung.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="max">Maximale Teilnehmerzahl</Label>
                      <Input
                        id="max"
                        inputMode="numeric"
                        placeholder="leer = unbegrenzt"
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="closes">Anmeldeschluss</Label>
                      <Input
                        id="closes"
                        type="datetime-local"
                        value={closesAt}
                        onChange={(e) => setClosesAt(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">leer = kein Anmeldeschluss</p>
                    </div>

                    <div className="flex flex-col justify-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={waitlistEnabled}
                          onChange={(e) => setWaitlistEnabled(e.target.checked)}
                        />
                        Warteliste, wenn ausgebucht
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={uniqueByEmail}
                          onChange={(e) => setUniqueByEmail(e.target.checked)}
                        />
                        Pro E-Mail nur eine Anmeldung
                      </label>
                    </div>
                  </div>

                  <Button size="sm" className="mt-4" onClick={saveSettings} disabled={savingSettings}>
                    {savingSettings ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Wird gespeichert...</>) : "Anmelde-Einstellungen speichern"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Doppelanmeldungen werden nur erkannt, wenn das Formular ein E-Mail-Feld enthält.
                  </p>
                </div>

                {/* Basisfeld oder eigenes Feld hinzufuegen */}
                <div className="bg-muted rounded-xl p-4 mb-8 flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[220px]">
                    <Label htmlFor="base-field">Basisfeld</Label>
                    <select
                      id="base-field"
                      className={SELECT_CLASSES}
                      value={baseFieldKey}
                      onChange={(e) => setBaseFieldKey(e.target.value)}
                    >
                      <option value="">Bitte auswählen…</option>
                      {availableBaseFields.map((bf) => (
                        <option key={bf.field_key} value={bf.field_key}>
                          {bf.label} ({FIELD_TYPE_LABELS[bf.field_type]})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button size="sm" onClick={addBaseField} disabled={!baseFieldKey} className="gap-1">
                    <Plus className="h-4 w-4" /> Basisfeld hinzufügen
                  </Button>
                  <Button size="sm" variant="outline" onClick={addCustomField} className="gap-1">
                    <Plus className="h-4 w-4" /> Eigenes Feld
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    Noch keine Felder. Fügen Sie Basisfelder (z. B. Vorname, Nachname, Geburtsdatum) oder eigene Felder hinzu.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {fields.map((field, index) => (
                      <div key={index} className="bg-muted rounded-xl p-4">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-xs font-mono text-muted-foreground">
                            {index + 1}. {field.fieldKey || "(Schlüssel wird beim Speichern erzeugt)"}
                          </span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => moveField(index, -1)} disabled={index === 0}>
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => moveField(index, 1)}
                              disabled={index === fields.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => removeField(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <Label htmlFor={`label-${index}`}>Label (Deutsch) *</Label>
                            <Input
                              id={`label-${index}`}
                              maxLength={150}
                              value={field.label}
                              onChange={(e) => updateField(index, { label: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`label-ar-${index}`}>Label (Arabisch)</Label>
                            <Input
                              id={`label-ar-${index}`}
                              dir="rtl"
                              maxLength={150}
                              value={field.labelAr}
                              onChange={(e) => updateField(index, { labelAr: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`type-${index}`}>Feldtyp</Label>
                            <select
                              id={`type-${index}`}
                              className={SELECT_CLASSES}
                              value={field.fieldType}
                              onChange={(e) => updateField(index, { fieldType: e.target.value as FieldType })}
                            >
                              {FIELD_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {FIELD_TYPE_LABELS[type]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end pb-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                checked={field.required}
                                onChange={(e) => updateField(index, { required: e.target.checked })}
                              />
                              Pflichtfeld
                            </label>
                          </div>
                        </div>

                        {field.fieldType === "select" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                            <div>
                              <Label htmlFor={`options-${index}`}>Optionen (Deutsch, eine pro Zeile) *</Label>
                              <Textarea
                                id={`options-${index}`}
                                rows={4}
                                value={field.optionsText}
                                onChange={(e) => updateField(index, { optionsText: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`options-ar-${index}`}>Optionen (Arabisch, gleiche Reihenfolge)</Label>
                              <Textarea
                                id={`options-ar-${index}`}
                                dir="rtl"
                                rows={4}
                                value={field.optionsArText}
                                onChange={(e) => updateField(index, { optionsArText: e.target.value })}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-8 flex items-center gap-3">
                  <Button onClick={saveFields} disabled={saving} className="gap-1">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Felder speichern
                  </Button>
                  {form && !form.is_active && (
                    <p className="text-sm text-muted-foreground">
                      Formular ist noch ein Entwurf — nach dem Speichern in der Übersicht aktivieren.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
