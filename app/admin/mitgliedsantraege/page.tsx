"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Building2,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  LogIn,
  Shield,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Briefcase,
  GraduationCap,
} from "lucide-react"

interface Application {
  id: string
  first_name: string
  last_name: string
  birth_date: string
  birth_place: string
  email: string
  phone: string
  profession: string
  certificate: string
  street: string
  postal_code: string
  city: string
  membership_type: string | null
  message: string
  status: "pending" | "approved" | "rejected"
  admin_note: string
  member_number: number | null
  photo_url?: string | null
  office?: { id: string; name: string } | null
  processed_at: string | null
  created_at: string
}

const formatMemberNumber = (num: number) => `SYGS-${String(num).padStart(4, "0")}`

const STATUS_LABELS: Record<Application["status"], { label: string; className: string }> = {
  pending: { label: "Offen", className: "bg-amber-100 text-amber-800" },
  approved: { label: "Angenommen", className: "bg-green-100 text-green-800" },
  rejected: { label: "Abgelehnt", className: "bg-red-100 text-red-800" },
}

const TYPE_LABELS: Record<string, string> = {
  monthly: "Monatlich (5 €)",
  yearly: "Jährlich (60 €)",
}

type Filter = "all" | Application["status"]

export default function AdminMembershipPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accessError, setAccessError] = useState("")
  const [filter, setFilter] = useState<Filter>("pending")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState("")
  const [actionInfo, setActionInfo] = useState("")

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

  const loadApplications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/membership")
      if (res.ok) {
        const data = await res.json()
        const apps: Application[] = data.applications || []
        setApplications(apps)
        setNotes(Object.fromEntries(apps.map((a) => [a.id, a.admin_note || ""])))
      } else {
        setAccessError("Keine Berechtigung für Mitgliedsanträge.")
      }
    } catch {
      setAccessError("Fehler beim Laden.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { if (authenticated) loadApplications() }, [authenticated, loadApplications])

  const updateStatus = async (id: string, status: Application["status"]) => {
    if (
      status === "approved" &&
      !window.confirm("Antrag annehmen? Der/die Antragsteller:in erhält automatisch eine Bestätigungs-E-Mail.")
    ) {
      return
    }
    setUpdatingId(id)
    setActionError("")
    setActionInfo("")
    try {
      const res = await fetch(`/api/admin/membership/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, admin_note: notes[id] || "" }),
      })
      if (res.ok) {
        const data = await res.json()
        setApplications((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status,
                  admin_note: notes[id] || "",
                  member_number: data.memberNumber ?? a.member_number,
                  processed_at: data.application?.processed_at || a.processed_at,
                }
              : a,
          ),
        )
        if (status === "approved") {
          const numText = data.memberNumber
            ? ` Mitgliedsnummer: ${formatMemberNumber(data.memberNumber)}.`
            : " Mitgliedsnummer konnte NICHT vergeben werden (Migration membership-member-number.sql ausgeführt?)."
          setActionInfo(
            (data.emailSent
              ? "Antrag angenommen — Bestätigungs-E-Mail wurde versendet."
              : "Antrag angenommen — Bestätigungs-E-Mail konnte NICHT versendet werden (Mail-Konfiguration prüfen).") + numText,
          )
        }
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(`Aktion fehlgeschlagen (${res.status}): ${data.error || "Unbekannter Fehler"}`)
      }
    } catch {
      setActionError("Verbindungsfehler — Aktion fehlgeschlagen.")
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteApplication = async (id: string) => {
    if (!window.confirm("Diesen Antrag endgültig löschen? Dies kann nicht rückgängig gemacht werden.")) return
    setUpdatingId(id)
    setActionError("")
    setActionInfo("")
    try {
      const res = await fetch(`/api/admin/membership/${id}`, { method: "DELETE" })
      if (res.ok) {
        setApplications((prev) => prev.filter((a) => a.id !== id))
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(`Löschen fehlgeschlagen (${res.status}): ${data.error || "Unbekannter Fehler"}`)
      }
    } catch {
      setActionError("Verbindungsfehler — Löschen fehlgeschlagen.")
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = filter === "all" ? applications : applications.filter((a) => a.status === filter)
  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  }

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })

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
            <UserPlus className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Mitgliedsanträge</h1>
            <p className="text-xl text-muted-foreground">Anträge prüfen, annehmen oder ablehnen</p>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-8">
              {(
                [
                  ["pending", "Offen"],
                  ["approved", "Angenommen"],
                  ["rejected", "Abgelehnt"],
                  ["all", "Alle"],
                ] as [Filter, string][]
              ).map(([value, label]) => (
                <Button
                  key={value}
                  variant={filter === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(value)}
                >
                  {label} ({counts[value]})
                </Button>
              ))}
            </div>

            {actionError && (
              <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-6">
                {actionError}
              </p>
            )}
            {actionInfo && (
              <p className="text-sm bg-primary/10 border border-primary/20 text-foreground rounded-lg px-4 py-3 mb-6">
                {actionInfo}
              </p>
            )}

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-20">Keine Anträge in dieser Ansicht.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {filtered.map((app) => {
                  const status = STATUS_LABELS[app.status]
                  return (
                    <div key={app.id} className="bg-muted rounded-xl p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-4">
                          {app.photo_url && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={app.photo_url}
                              alt={`Foto von ${app.first_name} ${app.last_name}`}
                              className="h-14 w-14 rounded-full object-cover border border-border flex-shrink-0"
                            />
                          )}
                          <div>
                            <h2 className="text-xl font-bold text-foreground">
                              {app.first_name} {app.last_name}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              Eingegangen am {formatDate(app.created_at)}
                              {app.membership_type ? ` · ${TYPE_LABELS[app.membership_type] || app.membership_type}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {app.member_number != null && (
                            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
                              {formatMemberNumber(app.member_number)}
                            </span>
                          )}
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-foreground mb-4">
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                          <a href={`mailto:${app.email}`} className="hover:text-primary break-all">{app.email}</a>
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                          {app.phone || "—"}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                          {app.street}, {app.postal_code} {app.city}
                        </p>
                        <p className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-primary flex-shrink-0" />
                          {formatDate(app.birth_date)}
                          {app.birth_place ? ` · ${app.birth_place}` : ""}
                        </p>
                        <p className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                          {app.profession || "—"}
                        </p>
                        <p className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
                          {app.certificate || "—"}
                        </p>
                        <p className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                          {app.office?.name || "—"}
                        </p>
                      </div>

                      {app.message && (
                        <p className="text-sm text-muted-foreground bg-background rounded-lg p-3 mb-4 whitespace-pre-wrap">
                          {app.message}
                        </p>
                      )}

                      <div className="flex flex-col gap-3">
                        <Textarea
                          rows={2}
                          maxLength={2000}
                          placeholder="Interne Notiz (optional)"
                          value={notes[app.id] ?? ""}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [app.id]: e.target.value }))}
                        />
                        <div className="flex flex-wrap gap-2">
                          {app.status !== "approved" && (
                            <Button
                              size="sm"
                              onClick={() => updateStatus(app.id, "approved")}
                              disabled={updatingId === app.id}
                              className="gap-1"
                            >
                              <CheckCircle className="h-4 w-4" /> Annehmen
                            </Button>
                          )}
                          {app.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(app.id, "rejected")}
                              disabled={updatingId === app.id}
                              className="gap-1"
                            >
                              <XCircle className="h-4 w-4" /> Ablehnen
                            </Button>
                          )}
                          {app.status !== "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(app.id, "pending")}
                              disabled={updatingId === app.id}
                            >
                              Zurück auf Offen
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteApplication(app.id)}
                            disabled={updatingId === app.id}
                            className="gap-1 ml-auto"
                          >
                            <Trash2 className="h-4 w-4" /> Löschen
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
