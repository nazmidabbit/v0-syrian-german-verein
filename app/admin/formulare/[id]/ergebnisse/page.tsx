"use client"

import React, { useCallback, useEffect, useState, use } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Loader2, LogIn, Shield, Table2, Trash2, UserCheck } from "lucide-react"
import { SUBMISSION_STATUS_LABELS, SUBMISSION_STATUSES, type SubmissionStatus } from "@/lib/forms"

interface FormMeta {
  id: string
  title: string
  slug: string
  max_participants: number | null
  closes_at: string | null
}

interface Counts {
  total: number
  confirmed: number
  waitlist: number
  cancelled: number
  checkedIn: number
}

const STATUS_CLASSES: Record<SubmissionStatus, string> = {
  confirmed: "bg-green-100 text-green-700",
  waitlist: "bg-orange-100 text-orange-700",
  cancelled: "bg-muted text-muted-foreground",
}

// Excel im deutschen Gebietsschema erwartet Semikolon als Trennzeichen
const CSV_SEPARATOR = ";"
const csvCell = (value: string) => '"' + value.replace(/"/g, '""') + '"'

interface FieldColumn {
  field_key: string
  label: string
  field_type: string
}

interface Submission {
  id: string
  data: Record<string, string | boolean>
  created_at: string
  status: SubmissionStatus
  checked_in_at: string | null
  email: string
}

export default function AdminFormSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [form, setForm] = useState<FormMeta | null>(null)
  const [fields, setFields] = useState<FieldColumn[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accessError, setAccessError] = useState("")
  const [actionError, setActionError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [counts, setCounts] = useState<Counts | null>(null)
  const [statusFilter, setStatusFilter] = useState("")

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

  const loadSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/forms/${id}/submissions`)
      if (res.ok) {
        const data = await res.json()
        setForm(data.form)
        setFields(data.fields || [])
        setSubmissions(data.submissions || [])
        setCounts(data.counts || null)
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

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { if (authenticated) loadSubmissions() }, [authenticated, loadSubmissions])

  const deleteSubmission = async (sid: string) => {
    if (!window.confirm("Diese Einsendung endgültig löschen?")) return
    setActionError("")
    setDeletingId(sid)
    try {
      const res = await fetch(`/api/admin/forms/${id}/submissions/${sid}`, { method: "DELETE" })
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== sid))
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(`Löschen fehlgeschlagen (${res.status}): ${data.error || "Unbekannter Fehler"}`)
      }
    } catch {
      setActionError("Verbindungsfehler — Löschen fehlgeschlagen.")
    } finally {
      setDeletingId(null)
    }
  }

  // Status setzen oder Check-in umschalten
  const updateSubmission = async (sid: string, payload: Record<string, unknown>) => {
    setActionError("")
    setSavingId(sid)
    try {
      const res = await fetch(`/api/admin/forms/${id}/submissions/${sid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        await loadSubmissions()
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(`Speichern fehlgeschlagen (${res.status}): ${data.error || "Unbekannter Fehler"}`)
      }
    } catch {
      setActionError("Verbindungsfehler — Speichern fehlgeschlagen.")
    } finally {
      setSavingId(null)
    }
  }

  const formatValue = (field: FieldColumn, value: string | boolean | undefined) => {
    if (field.field_type === "checkbox") return value === true ? "Ja" : "Nein"
    return typeof value === "string" && value ? value : "—"
  }

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const visibleSubmissions = statusFilter
    ? submissions.filter((s) => s.status === statusFilter)
    : submissions

  // Teilnehmerliste als CSV — mit BOM, damit Excel die Umlaute richtig liest
  const exportCsv = () => {
    const header = ["Eingegangen", "Status", "Check-in", ...fields.map((f) => f.label)]
    const rows = visibleSubmissions.map((submission) => [
      formatDateTime(submission.created_at),
      SUBMISSION_STATUS_LABELS[submission.status],
      submission.checked_in_at ? formatDateTime(submission.checked_in_at) : "",
      ...fields.map((field) => {
        const value = formatValue(field, submission.data?.[field.field_key])
        return value === "—" ? "" : value
      }),
    ])

    const csv = [header, ...rows].map((row) => row.map(csvCell).join(CSV_SEPARATOR)).join("\r\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${form?.slug || "einsendungen"}.csv`
    link.click()
    URL.revokeObjectURL(url)
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
          <div className="max-w-5xl mx-auto text-center">
            <Table2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Ergebnisse</h1>
            <p className="text-xl text-muted-foreground">{form?.title}</p>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <Button size="sm" variant="outline" asChild className="gap-1">
                <Link href="/admin/formulare">
                  <ArrowLeft className="h-4 w-4" /> Zurück zu den Formularen
                </Link>
              </Button>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Alle Status</option>
                  {SUBMISSION_STATUSES.map((value) => (
                    <option key={value} value={value}>{SUBMISSION_STATUS_LABELS[value]}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportCsv}
                  disabled={visibleSubmissions.length === 0}
                  className="gap-1"
                >
                  <Download className="h-4 w-4" /> CSV exportieren
                </Button>
              </div>
            </div>

            {/* Teilnehmerzahlen auf einen Blick */}
            {counts && counts.total > 0 && (
              <div className="flex flex-wrap gap-3 mb-6 text-sm">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                  {counts.confirmed} angemeldet
                  {form?.max_participants ? ` von ${form.max_participants}` : ""}
                </span>
                {counts.waitlist > 0 && (
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">
                    {counts.waitlist} auf Warteliste
                  </span>
                )}
                {counts.cancelled > 0 && (
                  <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full font-medium">
                    {counts.cancelled} storniert
                  </span>
                )}
                {counts.checkedIn > 0 && (
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                    {counts.checkedIn} eingecheckt
                  </span>
                )}
              </div>
            )}

            {actionError && (
              <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-6">
                {actionError}
              </p>
            )}

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : submissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-20">Noch keine Einsendungen.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">Eingegangen</th>
                      <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">Status</th>
                      <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">Check-in</th>
                      {fields.map((field) => (
                        <th key={field.field_key} className="text-left font-semibold px-4 py-3 whitespace-nowrap">
                          {field.label}
                        </th>
                      ))}
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSubmissions.map((submission) => (
                      <tr key={submission.id} className="border-t border-border align-top">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {formatDateTime(submission.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={submission.status}
                            onChange={(e) => updateSubmission(submission.id, { status: e.target.value })}
                            disabled={savingId === submission.id}
                            className={`h-8 rounded-md border-0 px-2 text-xs font-medium ${STATUS_CLASSES[submission.status]}`}
                          >
                            {SUBMISSION_STATUSES.map((value) => (
                              <option key={value} value={value}>{SUBMISSION_STATUS_LABELS[value]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant={submission.checked_in_at ? "default" : "outline"}
                            onClick={() =>
                              updateSubmission(submission.id, { checkedIn: !submission.checked_in_at })
                            }
                            disabled={savingId === submission.id}
                            className="gap-1"
                            title={submission.checked_in_at ? "Check-in zurücknehmen" : "Jetzt einchecken"}
                          >
                            <UserCheck className="h-4 w-4" />
                            {submission.checked_in_at ? formatDateTime(submission.checked_in_at) : "Einchecken"}
                          </Button>
                        </td>
                        {fields.map((field) => {
                          const value = submission.data?.[field.field_key]
                          return (
                            <td key={field.field_key} className="px-4 py-3 max-w-[300px]">
                              {field.field_type === "photo" && typeof value === "string" && value ? (
                                <a href={value} target="_blank" rel="noopener noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={value}
                                    alt=""
                                    className="h-14 w-14 rounded-lg object-cover border border-border"
                                  />
                                </a>
                              ) : (
                                <span className="whitespace-pre-wrap break-words">
                                  {formatValue(field, value)}
                                </span>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteSubmission(submission.id)}
                            disabled={deletingId === submission.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
