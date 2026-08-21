"use client"

import React, { useCallback, useEffect, useState, use } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, LogIn, Shield, Table2, Trash2 } from "lucide-react"

interface FormMeta {
  id: string
  title: string
  slug: string
}

interface FieldColumn {
  field_key: string
  label: string
  field_type: string
}

interface Submission {
  id: string
  data: Record<string, string | boolean>
  created_at: string
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
              <p className="text-sm text-muted-foreground">{submissions.length} Einsendungen</p>
            </div>

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
                      {fields.map((field) => (
                        <th key={field.field_key} className="text-left font-semibold px-4 py-3 whitespace-nowrap">
                          {field.label}
                        </th>
                      ))}
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="border-t border-border align-top">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {formatDateTime(submission.created_at)}
                        </td>
                        {fields.map((field) => (
                          <td key={field.field_key} className="px-4 py-3 max-w-[300px]">
                            <span className="whitespace-pre-wrap break-words">
                              {formatValue(field, submission.data?.[field.field_key])}
                            </span>
                          </td>
                        ))}
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
