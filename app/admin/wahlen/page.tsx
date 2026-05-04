"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Pencil, Plus, X, Loader2, LogIn, Shield, Vote, Settings } from "lucide-react"

interface Election {
  id: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  starts_at: string
  ends_at: string
  status: "draft" | "active" | "closed"
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    draft: "bg-gray-200 text-gray-700",
    active: "bg-green-100 text-green-700",
    closed: "bg-blue-100 text-blue-700",
  }
  const labels: Record<string, string> = {
    draft: "Entwurf",
    active: "Laufend",
    closed: "Beendet",
  }
  return { className: map[status] || map.draft, label: labels[status] || status }
}

export default function AdminElectionsPage() {
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [checking, setChecking] = useState(true)

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "",
    titleAr: "",
    description: "",
    descriptionAr: "",
    startsAt: "",
    endsAt: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const canEdit = userRole === "admin" || userPermissions.includes("wahlen")

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check")
      if (res.ok) {
        const data = await res.json()
        setAuthenticated(true)
        setUserRole(data.user?.role || "viewer")
        setUserPermissions(data.user?.permissions || [])
      }
    } catch {
      // not authenticated
    } finally {
      setChecking(false)
    }
  }, [])

  const loadElections = useCallback(async () => {
    try {
      const res = await fetch("/api/elections")
      const data = await res.json()
      setElections(data.elections || [])
    } catch {
      setElections([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { if (authenticated) loadElections() }, [authenticated, loadElections])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      if (res.ok) {
        setAuthenticated(true)
        const checkRes = await fetch("/api/auth/check")
        if (checkRes.ok) {
          const data = await checkRes.json()
          setUserRole(data.user?.role || "viewer")
          setUserPermissions(data.user?.permissions || [])
        }
      } else {
        const data = await res.json()
        setLoginError(data.error || "Login fehlgeschlagen.")
      }
    } catch {
      setLoginError("Verbindungsfehler.")
    } finally {
      setLoginLoading(false)
    }
  }

  const resetForm = () => {
    setForm({ title: "", titleAr: "", description: "", descriptionAr: "", startsAt: "", endsAt: "" })
    setEditingId(null)
    setShowForm(false)
    setError("")
  }

  const handleEdit = (election: Election) => {
    setForm({
      title: election.title,
      titleAr: election.title_ar,
      description: election.description,
      descriptionAr: election.description_ar,
      startsAt: election.starts_at.slice(0, 16),
      endsAt: election.ends_at.slice(0, 16),
    })
    setEditingId(election.id)
    setShowForm(true)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = editingId ? `/api/elections/${editingId}` : "/api/elections"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Fehler beim Speichern.")
      }

      resetForm()
      loadElections()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diese Wahl wirklich löschen? Alle Kandidaten und Stimmen werden ebenfalls gelöscht.")) return
    try {
      const res = await fetch(`/api/elections/${id}`, { method: "DELETE" })
      if (res.ok) loadElections()
    } catch { /* ignore */ }
  }

  const handleStatusChange = async (id: string, newStatus: "active" | "closed") => {
    const messages: Record<string, string> = {
      active: "Möchten Sie diese Wahl jetzt starten? Danach können keine Kandidaten mehr hinzugefügt werden.",
      closed: "Möchten Sie diese Wahl wirklich beenden? Das Ergebnis wird dann öffentlich.",
    }
    if (!confirm(messages[newStatus])) return

    try {
      const res = await fetch(`/api/elections/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Fehler.")
        return
      }
      loadElections()
    } catch {
      alert("Verbindungsfehler.")
    }
  }

  const formatDate = (s: string) =>
    new Date(s).toLocaleString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
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
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <LogIn className="h-12 w-12 text-primary mx-auto mb-4" />
              <h1 className="text-3xl font-bold">Admin Login</h1>
              <p className="text-muted-foreground mt-2">Melden Sie sich an, um Wahlen zu verwalten.</p>
            </div>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Passwort</Label>
                <Input id="password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loginLoading} className="w-full">
                {loginLoading ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Wird angemeldet...</>) : "Anmelden"}
              </Button>
              {loginError && <p className="text-destructive text-sm text-center">{loginError}</p>}
            </form>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Kein Zugriff</h1>
            <p className="text-muted-foreground">Sie benötigen die Berechtigung &quot;wahlen&quot;, um diese Seite zu betreten.</p>
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
            <Vote className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Wahlen verwalten</h1>
            <p className="text-xl text-muted-foreground">Erstellen, starten und beenden Sie Wahlen.</p>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            {!showForm && (
              <div className="mb-8">
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Neue Wahl anlegen
                </Button>
              </div>
            )}

            {showForm && (
              <div className="bg-secondary p-8 rounded-2xl mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">{editingId ? "Wahl bearbeiten" : "Neue Wahl"}</h2>
                  <Button variant="ghost" size="icon" onClick={resetForm}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Titel (Deutsch) *</Label>
                      <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    </div>
                    <div>
                      <Label htmlFor="titleAr">Titel (Arabisch)</Label>
                      <Input id="titleAr" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} dir="rtl" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="description">Beschreibung (Deutsch)</Label>
                      <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
                    </div>
                    <div>
                      <Label htmlFor="descriptionAr">Beschreibung (Arabisch)</Label>
                      <Textarea id="descriptionAr" value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} rows={4} dir="rtl" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startsAt">Beginnt am *</Label>
                      <Input id="startsAt" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required />
                    </div>
                    <div>
                      <Label htmlFor="endsAt">Endet am *</Label>
                      <Input id="endsAt" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} required />
                    </div>
                  </div>

                  {error && <p className="text-destructive text-sm">{error}</p>}

                  <div className="flex gap-3">
                    <Button type="submit" disabled={saving}>
                      {saving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Speichert...</>) : (editingId ? "Speichern" : "Anlegen")}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>Abbrechen</Button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              </div>
            ) : elections.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Noch keine Wahlen angelegt.</p>
            ) : (
              <div className="space-y-4">
                {elections.map((election) => {
                  const badge = statusBadge(election.status)
                  return (
                    <article key={election.id} className="bg-background border border-border rounded-2xl p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold">{election.title}</h3>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}>
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {formatDate(election.starts_at)} → {formatDate(election.ends_at)}
                          </p>
                          {election.description && (
                            <p className="text-sm text-foreground/80 line-clamp-2">{election.description}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline" className="gap-1">
                            <Link href={`/admin/wahlen/${election.id}`}>
                              <Settings className="h-4 w-4" />
                              Kandidaten
                            </Link>
                          </Button>

                          {election.status === "draft" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleEdit(election)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" onClick={() => handleStatusChange(election.id, "active")}>
                                Starten
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(election.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {election.status === "active" && (
                            <Button size="sm" variant="destructive" onClick={() => handleStatusChange(election.id, "closed")}>
                              Beenden
                            </Button>
                          )}

                          {election.status === "closed" && (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/wahlen/${election.id}`}>Ergebnis</Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </article>
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
