"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogIn,
  Pause,
  Play,
  Presentation,
  Search,
  Shield,
  UserCheck,
  Users,
  X,
} from "lucide-react"
import {
  detailFields,
  fieldValue,
  highlightFields,
  matchesSearch,
  participantInitials,
  participantName,
  photoField,
  type Participant,
  type ParticipantField,
} from "@/lib/participants"
import { SUBMISSION_STATUS_LABELS, type SubmissionStatus } from "@/lib/forms"

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

interface Counts {
  total: number
  confirmed: number
  waitlist: number
  cancelled: number
  checkedIn: number
  withPhoto: number
}

const STATUS_DOT: Record<SubmissionStatus, string> = {
  confirmed: "bg-green-500",
  waitlist: "bg-orange-500",
  cancelled: "bg-muted-foreground",
}

// Wie lange eine Person in der Vollbild-Anzeige stehen bleibt
const SLIDE_MS = 6000

export default function AdminParticipantsPage() {
  const [forms, setForms] = useState<FormOption[]>([])
  const [formId, setFormId] = useState("")
  const [event, setEvent] = useState<EventInfo | null>(null)
  const [fields, setFields] = useState<ParticipantField[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)

  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(true)
  const [accessError, setAccessError] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"" | SubmissionStatus>("confirmed")
  const [detailOf, setDetailOf] = useState<Participant | null>(null)

  // Vollbild-Anzeige
  const [showing, setShowing] = useState(false)
  const [slide, setSlide] = useState(0)
  const [playing, setPlaying] = useState(true)
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
      setFields(data.fields || [])
      setParticipants(data.participants || [])
      setCounts(data.counts || null)
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
        .filter((p) => matchesSearch(fields, p, search)),
    [participants, statusFilter, search, fields],
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

  const photoUrl = (p: Participant) => {
    if (!photo) return ""
    const value = p.data[photo.field_key]
    return typeof value === "string" && value.startsWith("http") ? value : ""
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })

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

            {counts && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Angemeldet", value: counts.confirmed, accent: true },
                  { label: "Warteliste", value: counts.waitlist },
                  { label: "Eingecheckt", value: counts.checkedIn },
                  { label: "Mit Foto", value: counts.withPhoto },
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
            </div>

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
                  return (
                    <button
                      key={p.id}
                      onClick={() => setDetailOf(p)}
                      className="group text-left bg-background border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all"
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
                        {p.checked_in_at && (
                          <span className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1.5 shadow">
                            <UserCheck className="h-4 w-4" />
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${STATUS_DOT[p.status]}`} />
                          <h2 className="font-bold text-foreground truncate">{name}</h2>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {highlights
                            .map((f) => ({ f, v: fieldValue(p, f.field_key) }))
                            .filter((x) => x.v)
                            .slice(0, 3)
                            .map(({ f, v }) => (
                              <span
                                key={f.field_key}
                                className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full truncate max-w-[12rem]"
                              >
                                {v}
                              </span>
                            ))}
                        </div>
                      </div>
                    </button>
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
                    {participantName(fields, detailOf)}
                  </h2>
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

            <dl className="px-6 pb-6 flex flex-col gap-3">
              {[...highlights, ...details]
                .map((f) => ({ f, v: fieldValue(detailOf, f.field_key) }))
                .filter((x) => x.v)
                .map(({ f, v }) => (
                  <div key={f.field_key} className="border-t border-border pt-3">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {f.label}
                    </dt>
                    <dd className="text-foreground whitespace-pre-line break-words mt-0.5">{v}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </div>
      )}

      {/* Vollbild-Anzeige: nur Foto, Name und Kurzangaben */}
      <div
        ref={stageRef}
        className={`${showing ? "fixed inset-0 z-[60] flex" : "hidden"} bg-neutral-950 text-white`}
      >
        {showing && current && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
              {photoUrl(current) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={current.id}
                  src={photoUrl(current)}
                  alt=""
                  className="h-[38vh] w-[38vh] rounded-full object-cover border-4 border-white/15 shadow-2xl mb-10"
                />
              ) : (
                <div className="h-[38vh] w-[38vh] rounded-full bg-white/10 flex items-center justify-center mb-10">
                  <span className="text-7xl font-bold text-white/50">
                    {participantInitials(participantName(fields, current))}
                  </span>
                </div>
              )}

              <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-balance">
                {participantName(fields, current)}
              </h2>

              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {highlights
                  .map((f) => ({ f, v: fieldValue(current, f.field_key) }))
                  .filter((x) => x.v)
                  .slice(0, 2)
                  .map(({ f, v }) => (
                    <span
                      key={f.field_key}
                      className="text-xl md:text-2xl text-white/70 border border-white/20 rounded-full px-5 py-1.5"
                    >
                      {v}
                    </span>
                  ))}
              </div>
            </div>

            {/* Fortschritt und Steuerung */}
            <div className="px-8 pb-8 flex items-center justify-between gap-6">
              <span className="text-white/50 tabular-nums text-lg">
                {slide + 1} / {total}
              </span>

              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/60 transition-all duration-500"
                  style={{ width: `${((slide + 1) / total) * 100}%` }}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSlide((i) => (i - 1 + total) % total)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Zurück"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label={playing ? "Pause" : "Weiter"}
                >
                  {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </button>
                <button
                  onClick={() => setSlide((i) => (i + 1) % total)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Weiter"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <button
                  onClick={stopShow}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors ml-2"
                  aria-label="Beenden"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
