"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle,
  ClipboardList,
  ExternalLink,
  ListChecks,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  Shield,
  Table2,
  Trash2,
  X,
  XCircle,
} from "lucide-react"

interface FormItem {
  id: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  slug: string
  is_active: boolean
  created_at: string
  field_count: number
  submission_count: number
}

export default function AdminFormsPage() {
  const [forms, setForms] = useState<FormItem[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accessError, setAccessError] = useState("")
  const [actionError, setActionError] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [titleAr, setTitleAr] = useState("")
  const [description, setDescription] = useState("")
  const [descriptionAr, setDescriptionAr] = useState("")

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

  const loadForms = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/forms")
      if (res.ok) {
        const data = await res.json()
        setForms(data.forms || [])
      } else {
        setAccessError("Keine Berechtigung für Formulare.")
      }
    } catch {
      setAccessError("Fehler beim Laden.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { if (authenticated) loadForms() }, [authenticated, loadForms])

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setTitle("")
    setTitleAr("")
    setDescription("")
    setDescriptionAr("")
  }

  const startCreate = () => {
    resetForm()
    setShowForm(true)
    setActionError("")
  }

  const startEdit = (form: FormItem) => {
    setEditingId(form.id)
    setTitle(form.title)
    setTitleAr(form.title_ar || "")
    setDescription(form.description || "")
    setDescriptionAr(form.description_ar || "")
    setShowForm(true)
    setActionError("")
  }

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionError("")
    if (title.trim().length < 2) {
      setActionError("Bitte einen Titel (mind. 2 Zeichen) angeben.")
      return
    }
    setSavingId(editingId || "new")
    try {
      const res = await fetch(editingId ? `/api/admin/forms/${editingId}` : "/api/admin/forms", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          titleAr: titleAr.trim(),
          description: description.trim(),
          descriptionAr: descriptionAr.trim(),
        }),
      })
      if (res.ok) {
        resetForm()
        await loadForms()
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

  const toggleActive = async (form: FormItem) => {
    if (!form.is_active && form.field_count === 0) {
      setActionError("Bitte zuerst Felder definieren, bevor das Formular aktiviert wird.")
      return
    }
    setActionError("")
    setSavingId(form.id)
    try {
      const res = await fetch(`/api/admin/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !form.is_active }),
      })
      if (res.ok) {
        setForms((prev) => prev.map((f) => (f.id === form.id ? { ...f, is_active: !f.is_active } : f)))
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(`Aktion fehlgeschlagen (${res.status}): ${data.error || "Unbekannter Fehler"}`)
      }
    } catch {
      setActionError("Verbindungsfehler — Aktion fehlgeschlagen.")
    } finally {
      setSavingId(null)
    }
  }

  const deleteForm = async (form: FormItem) => {
    if (
      !window.confirm(
        `Formular "${form.title}" endgültig löschen? Alle Felder und ${form.submission_count} Einsendung(en) werden mitgelöscht.`,
      )
    ) {
      return
    }
    setActionError("")
    setSavingId(form.id)
    try {
      const res = await fetch(`/api/admin/forms/${form.id}`, { method: "DELETE" })
      if (res.ok) {
        setForms((prev) => prev.filter((f) => f.id !== form.id))
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(`Löschen fehlgeschlagen (${res.status}): ${data.error || "Unbekannter Fehler"}`)
      }
    } catch {
      setActionError("Verbindungsfehler — Löschen fehlgeschlagen.")
    } finally {
      setSavingId(null)
    }
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
            <ClipboardList className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Formulare</h1>
            <p className="text-xl text-muted-foreground">
              Eigene Formulare erstellen, Felder definieren und Einsendungen ansehen
            </p>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <p className="text-sm text-muted-foreground">
                {forms.length} Formulare · Nur aktive Formulare sind öffentlich erreichbar
              </p>
              {!showForm && (
                <Button size="sm" onClick={startCreate} className="gap-1">
                  <Plus className="h-4 w-4" /> Formular erstellen
                </Button>
              )}
            </div>

            {actionError && (
              <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-6">
                {actionError}
              </p>
            )}

            {showForm && (
              <form onSubmit={saveForm} className="bg-muted rounded-xl p-6 mb-8 flex flex-col gap-4">
                <h2 className="text-lg font-bold text-foreground">
                  {editingId ? "Formular bearbeiten" : "Neues Formular"}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="form-title">Titel (Deutsch) *</Label>
                    <Input id="form-title" maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="form-title-ar">Titel (Arabisch)</Label>
                    <Input id="form-title-ar" dir="rtl" maxLength={150} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="form-desc">Beschreibung (Deutsch)</Label>
                    <Textarea id="form-desc" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="form-desc-ar">Beschreibung (Arabisch)</Label>
                    <Textarea id="form-desc-ar" dir="rtl" rows={3} maxLength={2000} value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {editingId
                    ? "Der öffentliche Link (/formulare/…) bleibt beim Umbenennen unverändert."
                    : "Das Formular wird als Entwurf angelegt. Definieren Sie danach die Felder und aktivieren Sie es."}
                </p>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={savingId !== null} className="gap-1">
                    {savingId !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    {editingId ? "Speichern" : "Erstellen"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={resetForm} className="gap-1">
                    <X className="h-4 w-4" /> Abbrechen
                  </Button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : forms.length === 0 ? (
              <p className="text-center text-muted-foreground py-20">
                Noch keine Formulare angelegt. (Migration forms.sql ausgeführt?)
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {forms.map((form) => (
                  <div key={form.id} className="bg-muted rounded-xl p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{form.title}</h2>
                        {form.title_ar && (
                          <p className="text-sm text-muted-foreground" dir="rtl">
                            {form.title_ar}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Erstellt am {formatDate(form.created_at)} · {form.field_count} Felder ·{" "}
                          {form.submission_count} Einsendungen
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          form.is_active ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {form.is_active ? "Aktiv" : "Entwurf"}
                      </span>
                    </div>

                    {form.is_active && (
                      <p className="text-sm mb-4">
                        <a
                          href={`/formulare/${form.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline inline-flex items-center gap-1"
                        >
                          /formulare/{form.slug} <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(form)}
                        disabled={savingId === form.id}
                        className="gap-1"
                      >
                        <Pencil className="h-4 w-4" /> Bearbeiten
                      </Button>
                      <Button size="sm" variant="outline" asChild className="gap-1">
                        <Link href={`/admin/formulare/${form.id}`}>
                          <ListChecks className="h-4 w-4" /> Felder definieren
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild className="gap-1">
                        <Link href={`/admin/formulare/${form.id}/ergebnisse`}>
                          <Table2 className="h-4 w-4" /> Ergebnisse ({form.submission_count})
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(form)}
                        disabled={savingId === form.id}
                        className="gap-1"
                      >
                        {form.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        {form.is_active ? "Deaktivieren" : "Aktivieren"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteForm(form)}
                        disabled={savingId === form.id}
                        className="gap-1 ml-auto"
                      >
                        <Trash2 className="h-4 w-4" /> Löschen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
