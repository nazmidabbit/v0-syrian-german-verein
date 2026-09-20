"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import jsQR from "jsqr"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CalendarX,
  CameraOff,
  Check,
  CheckCircle2,
  IdCard,
  Loader2,
  LogIn,
  QrCode,
  RotateCcw,
  ScanLine,
  Shield,
  UserCheck,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from "lucide-react"
import {
  listValues,
  participantName,
  participantNameAr,
  participantNumber,
  type Participant,
  type ParticipantField,
} from "@/lib/participants"

interface FormOption {
  id: string
  title: string
  submission_count: number
}

type Outcome = "checkedIn" | "already" | "cancelled" | "unknown" | "unreadable" | "undone"

interface ScanResult {
  outcome: Outcome
  participant: Participant | null
  code: string
  at: number
}

// Derselbe Code darf nicht bei jedem Kamerabild erneut gebucht werden
const RESCAN_BLOCK_MS = 4000

// Wie lange der Farbblitz ueber dem Bild liegt
const FLASH_MS = 900

// Ganzflaechige Rueckmeldung: In einer vollen Halle sieht man Farbe und
// Zeichen aus dem Augenwinkel, den Text erst beim Hinschauen. Gruenes Haekchen
// heisst durch, rotes Kreuz heisst halt.
const FLASH: Record<Outcome, { color: string; icon: React.ElementType }> = {
  checkedIn: { color: "bg-green-600/80", icon: Check },
  already: { color: "bg-amber-500/80", icon: UserCheck },
  cancelled: { color: "bg-red-600/85", icon: X },
  unknown: { color: "bg-red-600/85", icon: X },
  unreadable: { color: "bg-neutral-600/70", icon: QrCode },
  undone: { color: "bg-neutral-600/70", icon: RotateCcw },
}

// Kurzer Ton je Ergebnis — zwei helle Toene heisst durch, ein tiefer Brummer
// heisst halt. Frequenz in Hertz, Dauer in Sekunden.
const TONES: Record<Outcome, { at: number; hz: number; len: number }[]> = {
  checkedIn: [
    { at: 0, hz: 880, len: 0.09 },
    { at: 0.11, hz: 1320, len: 0.13 },
  ],
  already: [{ at: 0, hz: 660, len: 0.22 }],
  cancelled: [
    { at: 0, hz: 220, len: 0.18 },
    { at: 0.22, hz: 180, len: 0.3 },
  ],
  unknown: [
    { at: 0, hz: 220, len: 0.18 },
    { at: 0.22, hz: 180, len: 0.3 },
  ],
  unreadable: [{ at: 0, hz: 440, len: 0.1 }],
  undone: [{ at: 0, hz: 440, len: 0.1 }],
}

const OUTCOME_STYLE: Record<Outcome, { box: string; icon: React.ElementType; title: string; title_ar: string }> = {
  checkedIn: {
    box: "bg-green-600 text-white border-green-700",
    icon: CheckCircle2,
    title: "Eingelassen",
    title_ar: "تم الدخول",
  },
  already: {
    box: "bg-amber-500 text-white border-amber-600",
    icon: UserCheck,
    title: "War schon da",
    title_ar: "سبق أن دخل",
  },
  cancelled: {
    box: "bg-red-600 text-white border-red-700",
    icon: CalendarX,
    title: "Hat abgesagt",
    title_ar: "اعتذر عن الحضور",
  },
  unknown: {
    box: "bg-red-600 text-white border-red-700",
    icon: XCircle,
    title: "Nicht angemeldet",
    title_ar: "غير مسجَّل",
  },
  unreadable: {
    box: "bg-muted text-foreground border-border",
    icon: QrCode,
    title: "Code nicht lesbar",
    title_ar: "الرمز غير مقروء",
  },
  undone: {
    box: "bg-muted text-foreground border-border",
    icon: RotateCcw,
    title: "Check-in zurückgenommen",
    title_ar: "تم إلغاء الدخول",
  },
}

export default function AdminEinlassPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accessError, setAccessError] = useState("")

  const [forms, setForms] = useState<FormOption[]>([])
  const [formId, setFormId] = useState("")
  const [fields, setFields] = useState<ParticipantField[]>([])
  const [total, setTotal] = useState(0)
  const [checkedIn, setCheckedIn] = useState(0)

  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [busy, setBusy] = useState(false)
  const [manual, setManual] = useState("")
  const [result, setResult] = useState<ScanResult | null>(null)
  const [history, setHistory] = useState<ScanResult[]>([])
  const [flash, setFlash] = useState<Outcome | null>(null)
  const [muted, setMuted] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef(0)
  // Zuletzt gebuchte Codes mit Zeitstempel — gegen Doppelbuchungen
  const recentRef = useRef<Map<string, number>>(new Map())
  const busyRef = useRef(false)
  const audioRef = useRef<AudioContext | null>(null)
  const mutedRef = useRef(false)
  const flashTimer = useRef(0)

  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  // Ton darf erst nach einer Beruehrung erzeugt werden — der erste Knopfdruck
  // auf der Seite ist sie
  const ensureAudio = useCallback(() => {
    if (audioRef.current) return
    try {
      audioRef.current = new AudioContext()
    } catch {
      // ohne Ton bleiben Farbe und Vibration
    }
  }, [])

  // Ton und Farbblitz gehoeren zusammen: beides sagt dasselbe, einmal fuers
  // Ohr und einmal fuers Auge.
  const signal = useCallback((outcome: Outcome) => {
    setFlash(outcome)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), FLASH_MS)

    if (navigator.vibrate) {
      const abgewiesen = outcome === "unknown" || outcome === "cancelled"
      navigator.vibrate(outcome === "checkedIn" ? 60 : abgewiesen ? [80, 60, 80] : 120)
    }

    const audio = audioRef.current
    if (!audio || mutedRef.current) return
    if (audio.state === "suspended") audio.resume().catch(() => undefined)

    for (const tone of TONES[outcome]) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      const start = audio.currentTime + tone.at
      osc.type = "sine"
      osc.frequency.value = tone.hz
      // Sanft ein- und ausblenden, sonst knackt es
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.18, start + 0.012)
      gain.gain.linearRampToValueAtTime(0, start + tone.len)
      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start(start)
      osc.stop(start + tone.len + 0.03)
    }
  }, [])

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

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
        return
      }
      const data = await res.json()
      const list: FormOption[] = data.forms || []
      setForms(list)
      const preferred = list.find((f) => f.submission_count > 0) || list[0]
      if (preferred) setFormId(preferred.id)
    } catch {
      setAccessError("Fehler beim Laden.")
    }
  }, [])

  const loadCounts = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/participants/${id}`)
      if (!res.ok) return
      const data = await res.json()
      setFields(data.fields || [])
      setTotal(data.counts?.total || 0)
      setCheckedIn(data.counts?.checkedIn || 0)
    } catch {
      // Zahlen sind Beiwerk — der Scan funktioniert auch ohne
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])
  useEffect(() => {
    if (authenticated) loadForms()
  }, [authenticated, loadForms])
  useEffect(() => {
    if (formId) loadCounts(formId)
  }, [formId, loadCounts])

  const submitCode = useCallback(
    async (code: string, action: "checkin" | "undo" = "checkin") => {
      if (!formId || busyRef.current) return
      busyRef.current = true
      setBusy(true)
      try {
        const res = await fetch("/api/admin/participants/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formId, code, action }),
        })
        if (!res.ok) {
          setAccessError("Check-in fehlgeschlagen.")
          return
        }
        const data = await res.json()

        const outcome: Outcome = !data.found
          ? data.reason === "unreadable"
            ? "unreadable"
            : "unknown"
          : action === "undo"
            ? "undone"
            : data.cancelled
              ? "cancelled"
              : data.alreadyCheckedIn
                ? "already"
                : "checkedIn"

        const entry: ScanResult = {
          outcome,
          participant: data.participant || null,
          code,
          at: Date.now(),
        }

        setResult(entry)
        // Zuruecknahmen gehoeren nicht in die Liste der Einlaesse
        if (action !== "undo") setHistory((h) => [entry, ...h].slice(0, 12))

        if (typeof data.checkedIn === "number") setCheckedIn(data.checkedIn)

        signal(outcome)
      } catch {
        setAccessError("Check-in fehlgeschlagen.")
      } finally {
        busyRef.current = false
        setBusy(false)
      }
    },
    [formId, signal],
  )

  // Kamerabilder abtasten. jsQR arbeitet auf Pixeldaten, deshalb der Umweg
  // ueber ein Canvas.
  const scanFrame = useCallback(() => {
    frameRef.current = requestAnimationFrame(scanFrame)

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return

    const width = Math.min(video.videoWidth, 640)
    if (!width) return
    const height = Math.round((video.videoHeight / video.videoWidth) * width)

    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) return

    context.drawImage(video, 0, 0, width, height)
    const image = context.getImageData(0, 0, width, height)
    const found = jsQR(image.data, width, height, { inversionAttempts: "dontInvert" })
    if (!found?.data) return

    const now = Date.now()
    const last = recentRef.current.get(found.data) || 0
    if (now - last < RESCAN_BLOCK_MS) return
    recentRef.current.set(found.data, now)

    submitCode(found.data)
  }, [submitCode])

  const startCamera = useCallback(async () => {
    setCameraError("")
    ensureAudio()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)
      frameRef.current = requestAnimationFrame(scanFrame)
    } catch {
      setCameraError(
        "Kamera nicht verfügbar. Der Zugriff muss erlaubt sein und die Seite über https laufen.",
      )
    }
  }, [scanFrame])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setScanning(false)
  }, [])

  useEffect(() => stopCamera, [stopCamera])

  // Wer den QR-Code mit der Handykamera scannt, landet mit ?c=… hier
  useEffect(() => {
    if (!formId) return
    const code = new URLSearchParams(window.location.search).get("c")
    if (code) {
      submitCode(code)
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [formId, submitCode])

  const onManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = manual.trim()
    if (!code) return
    ensureAudio()
    setManual("")
    submitCode(code)
  }

  const open = useMemo(() => Math.max(0, total - checkedIn), [total, checkedIn])

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

  if (accessError && !formId) {
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

  const style = result ? OUTCOME_STYLE[result.outcome] : null
  const ResultIcon = style?.icon || ScanLine
  const FlashIcon = flash ? FLASH[flash].icon : null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Farbblitz mit Zeichen ueber der ganzen Seite — das Ergebnis eines
          Scans soll man sehen, ohne auf den Bildschirm zu schauen */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[70] pointer-events-none flex items-center justify-center transition-opacity duration-500 ${
          flash ? `${FLASH[flash].color} opacity-100` : "opacity-0"
        }`}
      >
        {FlashIcon && (
          <FlashIcon className="h-[45vmin] w-[45vmin] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,.45)] stroke-[2.5] animate-stage-photo-in" />
        )}
      </div>

      <main className="flex-1 pt-20">
        <section className="px-6 pt-10 pb-6 bg-gradient-to-b from-secondary to-background">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-sm font-medium tracking-wide uppercase text-primary mb-2">
                  Einlass · الدخول
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Einlasskontrolle</h1>
                <p className="text-muted-foreground mt-1">
                  QR-Code scannen oder Teilnehmernummer eingeben.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMuted((m) => !m)}
                  title={muted ? "Ton einschalten" : "Ton ausschalten"}
                  aria-label={muted ? "Ton einschalten" : "Ton ausschalten"}
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link href={`/admin/einlass/ausweise${formId ? `?form=${formId}` : ""}`}>
                    <IdCard className="h-4 w-4" />
                    Ausweise drucken
                  </Link>
                </Button>
              </div>
            </div>

            {forms.length > 1 && (
              <select
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm mb-4"
              >
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} ({f.submission_count})
                  </option>
                ))}
              </select>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Eingecheckt", value: checkedIn, accent: true },
                { label: "Noch offen", value: open },
                { label: "Auf der Liste", value: total },
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
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Ergebnis des letzten Scans — gross genug fuer einen Blick im Gedraenge */}
            {result && style && (
              <div className={`rounded-2xl border-2 p-6 ${style.box}`}>
                <div className="flex items-start gap-4">
                  <ResultIcon className="h-16 w-16 flex-shrink-0 stroke-[2.25]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-bold leading-tight">{style.title}</p>
                    <p className="text-lg opacity-90" dir="rtl">
                      {style.title_ar}
                    </p>

                    {result.participant ? (
                      <div className="mt-4 space-y-1">
                        <p className="text-3xl font-bold leading-tight">
                          {participantNumber(result.participant) && (
                            <span className="opacity-80 tabular-nums">
                              #{participantNumber(result.participant)}{" "}
                            </span>
                          )}
                          {participantName(fields, result.participant)}
                        </p>
                        {participantNameAr(result.participant) && (
                          <p className="text-2xl font-bold" dir="rtl">
                            {participantNameAr(result.participant)}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-2">
                          {listValues(result.participant)
                            .slice(0, 3)
                            .map((f) => (
                              <span
                                key={f.key}
                                className="text-sm bg-black/15 rounded-full px-3 py-1"
                                dir="rtl"
                              >
                                {f.value}
                              </span>
                            ))}
                        </div>
                        {result.outcome === "already" && result.participant.checked_in_at && (
                          <p className="text-sm opacity-90 pt-2">
                            Eingecheckt um{" "}
                            {new Date(result.participant.checked_in_at).toLocaleTimeString("de-DE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-base opacity-90">
                        Dieser Code gehört zu niemandem auf der Teilnehmerliste.
                      </p>
                    )}

                    {result.participant && (result.outcome === "checkedIn" || result.outcome === "already") && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-4 gap-2"
                        disabled={busy}
                        onClick={() => submitCode(result.code, "undo")}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Check-in zurücknehmen
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Kamera */}
            <div className="rounded-2xl border border-border overflow-hidden bg-background">
              <div className="relative aspect-[4/3] bg-black">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  aria-label="Kamerabild der Einlasskontrolle"
                />
                <canvas ref={canvasRef} className="hidden" />

                {!scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/80">
                    <QrCode className="h-16 w-16" />
                    <p className="text-sm px-6 text-center">
                      {cameraError || "Kamera ist aus."}
                    </p>
                  </div>
                )}

                {scanning && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-2/3 aspect-square border-4 border-white/70 rounded-2xl" />
                  </div>
                )}

                {busy && (
                  <div className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>

              <div className="p-4">
                {scanning ? (
                  <Button variant="outline" className="w-full gap-2" onClick={stopCamera}>
                    <CameraOff className="h-4 w-4" />
                    Kamera aus
                  </Button>
                ) : (
                  <Button className="w-full gap-2" onClick={startCamera} disabled={!formId}>
                    <ScanLine className="h-4 w-4" />
                    Scannen starten
                  </Button>
                )}
              </div>
            </div>

            {/* Nummer eintippen, wenn der Code fehlt oder zerknittert ist */}
            <form onSubmit={onManualSubmit} className="flex gap-2">
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Teilnehmernummer, z. B. 42"
                inputMode="numeric"
                className="h-11"
              />
              <Button type="submit" variant="secondary" className="h-11" disabled={busy || !formId}>
                Prüfen
              </Button>
            </form>

            {/* Letzte Scans */}
            {history.length > 0 && (
              <div className="rounded-2xl border border-border overflow-hidden">
                <p className="px-4 py-3 text-sm font-medium bg-muted">Zuletzt gescannt</p>
                <ul className="divide-y divide-border">
                  {history.map((entry) => (
                    <li key={entry.at} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                          entry.outcome === "checkedIn"
                            ? "bg-green-600"
                            : entry.outcome === "already"
                              ? "bg-amber-500"
                              : "bg-red-600"
                        }`}
                      />
                      <span className="flex-1 truncate text-sm">
                        {entry.participant
                          ? `#${participantNumber(entry.participant)} ${participantName(fields, entry.participant)}`
                          : "Unbekannter Code"}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {new Date(entry.at).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
