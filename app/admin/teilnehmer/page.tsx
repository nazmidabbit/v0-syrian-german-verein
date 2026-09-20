"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CalendarDays,
  CalendarX,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogIn,
  Pause,
  Play,
  FilterX,
  Presentation,
  QrCode,
  Search,
  Shield,
  UserCheck,
  Users,
  X,
} from "lucide-react"
import {
  detailFields,
  fieldValue,
  FILTER_FIELDS,
  filterOptions,
  highlightFields,
  listValues,
  matchesFilters,
  matchesSearch,
  participantInitials,
  participantName,
  participantNameAr,
  participantNumber,
  participantSharedAt,
  photoField,
  type FilterValues,
  type Participant,
  type ParticipantField,
} from "@/lib/participants"
import { SUBMISSION_STATUS_LABELS, type SubmissionStatus } from "@/lib/forms"
import { ParticipantQrShare } from "@/components/participant-qr-share"
import { ParticipantShareButton } from "@/components/participant-share-button"
import { ParticipantBulkShare } from "@/components/participant-bulk-share"
import type { CardData } from "@/lib/participant-card"

interface FormOption {
  id: string
  title: string
  submission_count: number
}

interface EventInfo {
  title: string
  title_ar: string
  date: string
}

interface FormInfo {
  title: string
  title_ar: string
}

const STATUS_DOT: Record<SubmissionStatus, string> = {
  confirmed: "bg-green-500",
  waitlist: "bg-orange-500",
  cancelled: "bg-muted-foreground",
}

// Wie lange eine Person in der Vollbild-Anzeige stehen bleibt
const SLIDE_MS = 6000

// Inhalt des QR-Codes. Bewusst die konfigurierte Adresse und nicht die des
// Browsers — ein auf localhost erzeugter Ausweis soll am Eingang trotzdem
// auf sygs.de zeigen.
const checkInUrl = (id: string) => {
  const base = process.env.NEXT_PUBLIC_BASE_URL || (typeof window === "undefined" ? "" : window.location.origin)
  return `${base.replace(/\/$/, "")}/admin/einlass?c=${id}`
}

export default function AdminParticipantsPage() {
  const [forms, setForms] = useState<FormOption[]>([])
  const [formId, setFormId] = useState("")
  const [event, setEvent] = useState<EventInfo | null>(null)
  const [form, setForm] = useState<FormInfo | null>(null)
  const [fields, setFields] = useState<ParticipantField[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])

  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(true)
  const [accessError, setAccessError] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"" | SubmissionStatus>("confirmed")
  // Wer hat seinen Ausweis noch nicht bekommen? Die Frage stellt sich beim
  // Verteilen staendig, deshalb ein eigener Schalter statt einer Suche.
  const [onlyUnshared, setOnlyUnshared] = useState(false)
  // Auswahlfilter je Feld: {sportart: "Fußball · كرة القدم", …}
  const [fieldFilters, setFieldFilters] = useState<FilterValues>({})
  const [detailOf, setDetailOf] = useState<Participant | null>(null)

  // Vollbild-Anzeige
  const [showing, setShowing] = useState(false)
  const [slide, setSlide] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [controlsVisible, setControlsVisible] = useState(true)
  const stageRef = useRef<HTMLDivElement | null>(null)

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check")
      if (res.ok) setAuthenticated(true)
    } catch {
      // nicht angemeldet
    } finally {
      setChecking(false)
    }
  }, [])

  const loadForms = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/participants")
      if (!res.ok) {
        setAccessError("Keine Berechtigung für Teilnehmer.")
        setLoading(false)
        return
      }
      const data = await res.json()
      const list: FormOption[] = data.forms || []
      setForms(list)
      // Vorauswahl: das jüngste Formular, das überhaupt Anmeldungen hat
      const preferred = list.find((f) => f.submission_count > 0) || list[0]
      if (preferred) setFormId(preferred.id)
      else setLoading(false)
    } catch {
      setAccessError("Fehler beim Laden.")
      setLoading(false)
    }
  }, [])

  const loadParticipants = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/participants/${id}`)
      if (!res.ok) {
        setAccessError("Teilnehmer konnten nicht geladen werden.")
        return
      }
      const data = await res.json()
      setEvent(data.event)
      setForm(data.form)
      setFields(data.fields || [])
      setParticipants(data.participants || [])
      setAccessError("")
    } catch {
      setAccessError("Fehler beim Laden.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { if (authenticated) loadForms() }, [authenticated, loadForms])
  useEffect(() => { if (formId) loadParticipants(formId) }, [formId, loadParticipants])

  const photo = useMemo(() => photoField(fields), [fields])
  const highlights = useMemo(() => highlightFields(fields), [fields])
  const details = useMemo(() => detailFields(fields), [fields])

  const visible = useMemo(
    () =>
      participants
        .filter((p) => (statusFilter ? p.status === statusFilter : true))
        .filter((p) => (onlyUnshared ? !participantSharedAt(p) : true))
        .filter((p) => matchesFilters(p, fieldFilters))
        .filter((p) => matchesSearch(fields, p, search)),
    [participants, statusFilter, onlyUnshared, fieldFilters, search, fields],
  )

  const activeFilters = useMemo(
    () =>
      Object.values(fieldFilters).filter(Boolean).length +
      (search ? 1 : 0) +
      (onlyUnshared ? 1 : 0),
    [fieldFilters, search, onlyUnshared],
  )

  const resetFilters = useCallback(() => {
    setFieldFilters({})
    setSearch("")
    setOnlyUnshared(false)
  }, [])

  // Alle Zahlen aus der Liste abgeleitet statt mitgezaehlt — so koennen sie
  // nach einer Absage oder einem Versand gar nicht erst auseinanderlaufen
  const stats = useMemo(
    () => ({
      total: participants.length,
      confirmed: participants.filter((p) => p.status === "confirmed").length,
      waitlist: participants.filter((p) => p.status === "waitlist").length,
      cancelled: participants.filter((p) => p.status === "cancelled").length,
      checkedIn: participants.filter((p) => p.checked_in_at).length,
      qrShared: participants.filter((p) => participantSharedAt(p)).length,
    }),
    [participants],
  )

  // Nach dem Teilen sofort sichtbar machen, ohne die ganze Liste neu zu laden
  const markManyShared = useCallback((ids: string[], sharedAt = new Date().toISOString()) => {
    const treffer = new Set(ids)
    const apply = (p: Participant) =>
      treffer.has(p.id) && !participantSharedAt(p)
        ? { ...p, data: { ...p.data, qr_geteilt_am: sharedAt } }
        : p

    setParticipants((list) => list.map(apply))
    setDetailOf((current) => (current ? apply(current) : current))
  }, [])

  const markShared = useCallback(
    (id: string, sharedAt: string) => markManyShared([id], sharedAt),
    [markManyShared],
  )

  // Absagen und Wiederanmelden. Die Person bleibt mit ihrer Nummer stehen —
  // sonst muesste man gedruckte Ausweise nachziehen. Endgueltiges Loeschen
  // gibt es weiterhin nur auf der Ergebnisseite.
  const [statusBusy, setStatusBusy] = useState("")
  const setParticipantStatus = useCallback(
    async (p: Participant, status: SubmissionStatus) => {
      setStatusBusy(p.id)
      try {
        const res = await fetch("/api/admin/participants/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formId, id: p.id, status }),
        })
        if (!res.ok) {
          setAccessError("Status konnte nicht geändert werden.")
          return
        }
        const { participant } = await res.json()
        const apply = (current: Participant) =>
          current.id === participant.id ? (participant as Participant) : current
        setParticipants((list) => list.map(apply))
        setDetailOf((current) => (current ? apply(current) : current))
      } catch {
        setAccessError("Status konnte nicht geändert werden.")
      } finally {
        setStatusBusy("")
      }
    },
    [formId],
  )

  // Vollbild zeigt nur bestätigte Anmeldungen — Wartelisten und Stornos
  // gehören nicht auf eine Leinwand
  const stageList = useMemo(
    () => participants.filter((p) => p.status === "confirmed"),
    [participants],
  )

  const total = stageList.length

  const startShow = async () => {
    if (total === 0) return
    setSlide(0)
    setPlaying(true)
    setShowing(true)
    try {
      await stageRef.current?.requestFullscreen?.()
    } catch {
      // Ohne Vollbild läuft die Anzeige trotzdem
    }
  }

  const stopShow = useCallback(() => {
    setShowing(false)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined)
  }, [])

  // Automatisch weiterblättern; respektiert die Systemeinstellung
  // "Bewegung reduzieren"
  useEffect(() => {
    if (!showing || !playing || total === 0) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const timer = window.setInterval(
      () => setSlide((i) => (i + 1) % total),
      reduced ? SLIDE_MS * 2 : SLIDE_MS,
    )
    return () => window.clearInterval(timer)
  }, [showing, playing, total])

  // Steuerung per Tastatur, damit am Beamer keine Maus nötig ist
  useEffect(() => {
    if (!showing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopShow()
      if (e.key === "ArrowRight") setSlide((i) => (i + 1) % total)
      if (e.key === "ArrowLeft") setSlide((i) => (i - 1 + total) % total)
      if (e.key === " ") {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setShowing(false)
    }
    window.addEventListener("keydown", onKey)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("fullscreenchange", onFullscreenChange)
    }
  }, [showing, total, stopShow])

  // Steuerung nach Ruhe ausblenden — am Beamer soll nur die Person zu sehen sein
  useEffect(() => {
    if (!showing) return
    let timer = 0
    const wake = () => {
      setControlsVisible(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setControlsVisible(false), 3000)
    }
    wake()
    window.addEventListener("mousemove", wake)
    window.addEventListener("keydown", wake)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("mousemove", wake)
      window.removeEventListener("keydown", wake)
    }
  }, [showing])

  const photoUrl = (p: Participant) => {
    if (!photo) return ""
    const value = p.data[photo.field_key]
    return typeof value === "string" && value.startsWith("http") ? value : ""
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })

  // Ueberschrift des Ausweises. Bei manchen Veranstaltungen ist nur eine
  // Sprache gepflegt — dann nimmt der Ausweis den Titel des Formulars, der
  // in aller Regel beide traegt.
  const titel =
    event?.title && event?.title_ar
      ? { de: event.title, ar: event.title_ar }
      : form?.title && form?.title_ar
        ? { de: form.title, ar: form.title_ar }
        : { de: event?.title || form?.title || "", ar: event?.title_ar || form?.title_ar || "" }

  // Angaben fuer den Ausweis — in der Liste und in der Detailansicht dieselben
  const cardOf = (p: Participant): CardData => ({
    url: checkInUrl(p.id),
    nr: participantNumber(p),
    name: participantName(fields, p),
    nameAr: participantNameAr(p),
    meta: [fieldValue(p, "sportart"), fieldValue(p, "ehrung_ar")],
    eventTitle: titel.de,
    eventTitleAr: titel.ar,
    eventDate: event ? formatDate(event.date) : "",
  })

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
              <a href="/admin">Zum Admin-Login</a>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (accessError && participants.length === 0 && !loading) {
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

  const current = stageList[slide]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        {/* Kopfbereich mit Zahlen */}
        <section className="px-6 pt-12 pb-8 bg-gradient-to-b from-secondary to-background">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-sm font-medium tracking-wide uppercase text-primary mb-2">
                  Teilnehmer
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  {event ? event.title : "Angemeldete Teilnehmer"}
                </h1>
                {event && (
                  <p className="text-muted-foreground mt-1 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(event.date)}
                  </p>
                )}
              </div>

              <Button size="lg" onClick={startShow} disabled={total === 0} className="gap-2">
                <Presentation className="h-5 w-5" />
                Vollbild-Anzeige
              </Button>
            </div>

            {!loading && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Angemeldet", value: stats.confirmed, accent: true },
                  { label: "QR geteilt", value: `${stats.qrShared}/${stats.total}` },
                  { label: "Eingecheckt", value: stats.checkedIn },
                  { label: stats.cancelled > 0 ? "Abgesagt" : "Warteliste", value: stats.cancelled > 0 ? stats.cancelled : stats.waitlist },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-xl border p-4 ${
                      stat.accent ? "bg-primary/5 border-primary/20" : "bg-background border-border"
                    }`}
                  >
                    <p
                      className={`text-3xl font-bold tabular-nums ${
                        stat.accent ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {stat.value}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mt-1">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Suche und Filter */}
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center gap-3 mb-8">
              {forms.length > 1 && (
                <select
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {forms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title} ({f.submission_count})
                    </option>
                  ))}
                </select>
              )}

              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, Sportart, Verein …"
                  className="pl-9 h-10"
                />
              </div>

              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {([
                  ["confirmed", "Angemeldet"],
                  ["cancelled", "Abgesagt"],
                  ["waitlist", "Warteliste"],
                  ["", "Alle"],
                ] as const).map(([value, label]) => (
                  <button
                    key={label}
                    onClick={() => setStatusFilter(value as "" | SubmissionStatus)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      statusFilter === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Button
                variant={onlyUnshared ? "default" : "outline"}
                onClick={() => setOnlyUnshared((v) => !v)}
                className="h-10 gap-2"
              >
                <QrCode className="h-4 w-4" />
                Ohne Ausweis
              </Button>
            </div>

            {/* Auswahlfilter — nur Felder, die auch gefüllt sind */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {FILTER_FIELDS.map((field) => {
                const options = filterOptions(participants, field.key)
                if (options.length < 2) return null
                return (
                  <select
                    key={field.key}
                    value={fieldFilters[field.key] || ""}
                    onChange={(e) =>
                      setFieldFilters((f) => ({ ...f, [field.key]: e.target.value }))
                    }
                    aria-label={field.label}
                    className={`h-9 max-w-[16rem] rounded-lg border px-2 text-sm ${
                      fieldFilters[field.key]
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-input bg-background text-muted-foreground"
                    }`}
                  >
                    <option value="">
                      {field.label} · {field.label_ar}
                    </option>
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value} ({option.count})
                      </option>
                    ))}
                  </select>
                )
              })}

              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 h-9">
                  <FilterX className="h-4 w-4" />
                  Zurücksetzen
                </Button>
              )}
            </div>

            {/* Trefferzahl und Sammelaktion */}
            {!loading && (
              <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
                <p className="text-sm text-muted-foreground">
                  {visible.length === participants.length
                    ? `${participants.length} Teilnehmer`
                    : `${visible.length} von ${participants.length} Teilnehmern`}
                </p>

                <ParticipantBulkShare
                  entries={visible.map((p) => ({ id: p.id, card: cardOf(p) }))}
                  formId={formId}
                  onShared={markManyShared}
                />
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : visible.length === 0 ? (
              <div className="text-center py-24 bg-muted rounded-2xl">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {search ? "Niemand gefunden." : "Noch keine Anmeldungen."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {visible.map((p) => {
                  const name = participantName(fields, p)
                  const url = photoUrl(p)
                  const nr = participantNumber(p)
                  const nameAr = participantNameAr(p)
                  // Formularfelder und Angaben aus den Ehrungslisten in einer Reihe
                  const chips = [
                    ...highlights.map((f) => ({ key: f.field_key, value: fieldValue(p, f.field_key) })),
                    ...listValues(p).map((f) => ({ key: f.key, value: f.value })),
                  ]
                    .filter((c) => c.value)
                    .slice(0, 3)
                  return (
                    <div
                      key={p.id}
                      className="group relative bg-background border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all"
                    >
                      {/* Teilen liegt neben der Kachel, nicht darin — ein Knopf
                          im Knopf waere ungueltiges HTML */}
                      <div className="absolute top-3 left-3 z-10">
                        <ParticipantShareButton
                          card={cardOf(p)}
                          submissionId={p.id}
                          formId={formId}
                          sharedAt={participantSharedAt(p)}
                          onShared={(at) => markShared(p.id, at)}
                        />
                      </div>

                      <button
                        onClick={() => setDetailOf(p)}
                        className="block w-full text-left"
                      >
                        <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                          {url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={url}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-4xl font-bold text-muted-foreground/40">
                                {participantInitials(name)}
                              </span>
                            </div>
                          )}
                          <div className="absolute top-3 right-3 flex gap-1.5">
                            {participantSharedAt(p) && (
                              <span
                                className="bg-green-600 text-white rounded-full p-1.5 shadow"
                                title={`Ausweis verschickt am ${formatDate(participantSharedAt(p))}`}
                              >
                                <CheckCheck className="h-4 w-4" />
                              </span>
                            )}
                            {p.checked_in_at && (
                              <span className="bg-primary text-primary-foreground rounded-full p-1.5 shadow" title="Eingecheckt">
                                <UserCheck className="h-4 w-4" />
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${STATUS_DOT[p.status]}`} />
                            {nr && (
                              <span className="text-xs font-bold tabular-nums text-muted-foreground flex-shrink-0">
                                #{nr}
                              </span>
                            )}
                            <h2 className="font-bold text-foreground truncate">{name}</h2>
                          </div>
                          {nameAr && (
                            <p className="text-sm text-muted-foreground truncate" dir="rtl">
                              {nameAr}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {chips.map((chip) => (
                              <span
                                key={chip.key}
                                className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full truncate max-w-[12rem]"
                              >
                                {chip.value}
                              </span>
                            ))}
                          </div>

                          {participantSharedAt(p) && (
                            <p className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-500 mt-2">
                              <CheckCheck className="h-3.5 w-3.5 flex-shrink-0" />
                              {/* Datum vor dem arabischen Text: sonst tauscht
                                  die Bidi-Regel beide, weil die Ziffern zum
                                  arabischen Lauf gezogen werden */}
                              <span className="truncate">
                                Ausweis verschickt · {formatDate(participantSharedAt(p))} ·{" "}
                                تم الإرسال
                              </span>
                            </p>
                          )}
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Detailansicht — hier stehen auch Kontaktdaten */}
      {detailOf && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setDetailOf(null)}
        >
          <div
            className="bg-background rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-6 pb-4">
              <div className="flex items-center gap-4 min-w-0">
                {photoUrl(detailOf) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photoUrl(detailOf)}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover border border-border flex-shrink-0"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-muted-foreground">
                      {participantInitials(participantName(fields, detailOf))}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-xl font-bold truncate">
                    {participantNumber(detailOf) && (
                      <span className="text-muted-foreground tabular-nums">
                        #{participantNumber(detailOf)}{" "}
                      </span>
                    )}
                    {participantName(fields, detailOf)}
                  </h2>
                  {participantNameAr(detailOf) && (
                    <p className="font-bold truncate" dir="rtl">
                      {participantNameAr(detailOf)}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {SUBMISSION_STATUS_LABELS[detailOf.status]}
                    {detailOf.checked_in_at ? " · eingecheckt" : ""}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDetailOf(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <dl className="px-6 flex flex-col gap-3">
              {[
                ...[...highlights, ...details]
                  .map((f) => ({ key: f.field_key, label: f.label, value: fieldValue(detailOf, f.field_key) }))
                  .filter((x) => x.value),
                ...listValues(detailOf).map((f) => ({
                  key: f.key,
                  label: `${f.label} · ${f.label_ar}`,
                  value: f.value,
                })),
              ].map((entry) => (
                <div key={entry.key} className="border-t border-border pt-3">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {entry.label}
                  </dt>
                  <dd className="text-foreground whitespace-pre-line break-words mt-0.5">
                    {entry.value}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Absage. Die Nummer bleibt stehen, damit gedruckte Ausweise und
                die Reihenfolge auf der Bühne gültig bleiben. */}
            <div className="px-6 pt-4">
              {detailOf.status === "cancelled" ? (
                <div className="border-t border-border pt-4 flex flex-wrap items-center gap-3">
                  <p className="text-sm text-muted-foreground flex-1 min-w-[12rem]">
                    Hat abgesagt · اعتذر عن الحضور — bleibt mit Nummer{" "}
                    {participantNumber(detailOf) || "—"} in der Liste.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={statusBusy === detailOf.id}
                    onClick={() => setParticipantStatus(detailOf, "confirmed")}
                    className="gap-2"
                  >
                    {statusBusy === detailOf.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                    Wieder anmelden
                  </Button>
                </div>
              ) : (
                <div className="border-t border-border pt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={statusBusy === detailOf.id}
                    onClick={() => setParticipantStatus(detailOf, "cancelled")}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    {statusBusy === detailOf.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarX className="h-4 w-4" />
                    )}
                    Hat abgesagt
                  </Button>
                </div>
              )}
            </div>

            {/* Ausweis als Bild — zum Weiterschicken an die Person selbst */}
            <div className="px-6 pb-6 pt-4">
              <ParticipantQrShare
                submissionId={detailOf.id}
                formId={formId}
                sharedAt={participantSharedAt(detailOf)}
                onShared={(at) => markShared(detailOf.id, at)}
                {...cardOf(detailOf)}
              />
            </div>
          </div>
        </div>
      )}

      {/*
        Vollbild-Anzeige fuer den Beamer, in Ebenen aufgebaut:
        1. das eigene Foto stark unscharf als Farbgrund
        2. Verlaeufe darueber, damit Text auf jedem Bild lesbar bleibt
        3. Vereinsgruen als Lichtschimmer
        4. Inhalt (Foto, Name, Kurzangaben)
        5. Rahmen: Logo, Veranstaltung, Fortschritt, Steuerung
        Kontaktdaten und Anschrift erscheinen hier bewusst nie.
      */}
      <div
        ref={stageRef}
        className={`${showing ? "fixed inset-0 z-[60]" : "hidden"} overflow-hidden bg-neutral-950 text-white`}
      >
        {showing && current && (
          <>
            {/* Ebene 1 — Farbgrund aus dem Foto der Person */}
            {photoUrl(current) && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={`bg-${current.id}`}
                src={photoUrl(current)}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover scale-125 blur-3xl opacity-35"
              />
            )}

            {/* Ebene 2 — Verlaeufe fuer Lesbarkeit */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,.75)_70%,rgba(10,10,10,.95)_100%)]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-neutral-950/85 via-transparent to-neutral-950/95"
            />

            {/* Ebene 3 — Vereinsgruen als Lichtschimmer */}
            <div
              aria-hidden="true"
              className="absolute -top-1/4 left-1/2 -translate-x-1/2 h-[70vh] w-[70vh] rounded-full bg-primary/20 blur-[120px] animate-glow-pulse"
            />

            {/* Ebene 5a — Kopfzeile mit Logo */}
            <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-6 px-10 py-7">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/logo.png"
                  alt=""
                  className="h-14 w-14 rounded-full object-cover ring-1 ring-white/20 shadow-lg"
                />
                <div className="leading-tight">
                  <p className="font-semibold text-lg">Syrische Gemeinschaft</p>
                  <p className="text-white/50 text-sm">im Saarland · تجمع السوريين في زارلاند</p>
                </div>
              </div>

              {event && (
                <div className="text-right leading-tight hidden sm:block">
                  <p className="font-semibold text-lg max-w-[28rem] truncate">{event.title}</p>
                  <p className="text-white/50 text-sm">{formatDate(event.date)}</p>
                </div>
              )}
            </div>

            {/* Ebene 4 — die Person */}
            <div className="relative h-full flex flex-col items-center justify-center px-8 text-center">
              <div key={current.id} className="animate-stage-photo-in relative mb-10">
                <div
                  aria-hidden="true"
                  className="absolute -inset-6 rounded-full bg-primary/25 blur-2xl"
                />
                {photoUrl(current) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photoUrl(current)}
                    alt=""
                    className="relative h-[36vh] w-[36vh] rounded-full object-cover ring-4 ring-white/25 shadow-2xl"
                  />
                ) : (
                  <div className="relative h-[36vh] w-[36vh] rounded-full bg-white/10 ring-4 ring-white/15 flex items-center justify-center">
                    <span className="text-7xl font-bold text-white/50">
                      {participantInitials(participantName(fields, current))}
                    </span>
                  </div>
                )}
              </div>

              <div key={`text-${current.id}`} className="animate-stage-in">
                {participantNameAr(current) && (
                  <h2
                    className="text-5xl md:text-6xl font-bold tracking-tight text-balance drop-shadow-lg mb-3"
                    dir="rtl"
                  >
                    {participantNameAr(current)}
                  </h2>
                )}
                <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-balance drop-shadow-lg">
                  {participantName(fields, current)}
                </h2>

                <div className="flex flex-wrap justify-center gap-3 mt-7">
                  {[
                    ...highlights.map((f) => ({
                      key: f.field_key,
                      value: fieldValue(current, f.field_key),
                    })),
                    ...listValues(current).map((f) => ({ key: f.key, value: f.value })),
                  ]
                    .filter((chip) => chip.value)
                    .slice(0, 3)
                    .map((chip) => (
                      <span
                        key={chip.key}
                        className="text-xl md:text-2xl text-white/85 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-6 py-2"
                      >
                        {chip.value}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            {/* Ebene 5b — Fortschritt und Steuerung */}
            <div className="absolute bottom-0 inset-x-0 px-10 pb-8 flex items-center justify-between gap-6">
              <span className="text-white/60 tabular-nums text-lg font-medium">
                {slide + 1} / {total}
              </span>

              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${((slide + 1) / total) * 100}%` }}
                />
              </div>

              {/* Verschwindet nach kurzer Ruhe, damit das Bild frei bleibt */}
              <div
                className={`flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full p-1 transition-opacity duration-500 ${
                  controlsVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                <button
                  onClick={() => setSlide((i) => (i - 1 + total) % total)}
                  className="p-2.5 rounded-full hover:bg-white/15 transition-colors"
                  aria-label="Zurück"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setPlaying((prev) => !prev)}
                  className="p-2.5 rounded-full hover:bg-white/15 transition-colors"
                  aria-label={playing ? "Pause" : "Weiter"}
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                <button
                  onClick={() => setSlide((i) => (i + 1) % total)}
                  className="p-2.5 rounded-full hover:bg-white/15 transition-colors"
                  aria-label="Weiter"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  onClick={stopShow}
                  className="p-2.5 rounded-full hover:bg-white/15 transition-colors"
                  aria-label="Beenden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
