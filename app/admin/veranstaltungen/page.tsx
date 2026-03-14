"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Pencil, Plus, X, Loader2, CalendarDays, LogIn, Upload, ImageIcon, ArrowLeft, ArrowRight } from "lucide-react"

interface Event {
  id: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  date: string
  image_urls: string[]
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  // Login form
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  // Event form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "",
    titleAr: "",
    description: "",
    descriptionAr: "",
    date: "",
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

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

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events")
      const data = await res.json()
      setEvents(data.events || [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { if (authenticated) loadEvents() }, [authenticated, loadEvents])

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
    setForm({ title: "", titleAr: "", description: "", descriptionAr: "", date: "" })
    setImageUrls([])
    setEditingId(null)
    setShowForm(false)
    setError("")
  }

  const handleEdit = (event: Event) => {
    setForm({
      title: event.title,
      titleAr: event.title_ar,
      description: event.description,
      descriptionAr: event.description_ar,
      date: event.date.slice(0, 10),
    })
    setImageUrls(event.image_urls || [])
    setEditingId(event.id)
    setShowForm(true)
    setError("")
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError("")

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Upload fehlgeschlagen")
        }

        const data = await res.json()
        setImageUrls((prev) => [...prev, data.url])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const moveImage = (index: number, direction: "left" | "right") => {
    setImageUrls((prev) => {
      const newArr = [...prev]
      const targetIndex = direction === "left" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= newArr.length) return prev
      ;[newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]]
      return newArr
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = editingId ? `/api/events/${editingId}` : "/api/events"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, imageUrls }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Fehler beim Speichern.")
      }

      resetForm()
      loadEvents()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie dieses Event wirklich löschen?")) return
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" })
      if (res.ok) loadEvents()
    } catch { /* ignore */ }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
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
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <LogIn className="h-12 w-12 text-primary mx-auto mb-4" />
              <h1 className="text-3xl font-bold">Admin Login</h1>
              <p className="text-muted-foreground mt-2">
                Melden Sie sich an, um Events zu verwalten.
              </p>
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Veranstaltungen verwalten
            </h1>
            <p className="text-xl text-muted-foreground">
              Erstellen, bearbeiten und löschen Sie Events
            </p>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            {!showForm && (
              <div className="mb-8">
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Neues Event erstellen
                </Button>
              </div>
            )}

            {showForm && (
              <div className="bg-secondary p-8 rounded-2xl mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">
                    {editingId ? "Event bearbeiten" : "Neues Event"}
                  </h2>
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
                      <Label htmlFor="description">Beschreibung (Deutsch) *</Label>
                      <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} required />
                    </div>
                    <div>
                      <Label htmlFor="descriptionAr">Beschreibung (Arabisch)</Label>
                      <Textarea id="descriptionAr" value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} rows={4} dir="rtl" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="date">Datum *</Label>
                    <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="max-w-xs" />
                  </div>

                  {/* Bilder Upload */}
                  <div>
                    <Label>Bilder</Label>
                    <div className="mt-2 border-2 border-dashed border-border rounded-xl p-6">
                      <div className="flex flex-wrap gap-4 mb-4">
                        {imageUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <div className="w-32 h-24 rounded-lg overflow-hidden border border-border">
                              <img src={url} alt={`Bild ${index + 1}`} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="bg-destructive text-white rounded-full p-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="flex justify-center gap-1 mt-1">
                              <button
                                type="button"
                                onClick={() => moveImage(index, "left")}
                                disabled={index === 0}
                                className="bg-muted hover:bg-primary/20 rounded p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </button>
                              <span className="text-xs text-muted-foreground leading-5">{index + 1}</span>
                              <button
                                type="button"
                                onClick={() => moveImage(index, "right")}
                                disabled={index === imageUrls.length - 1}
                                className="bg-muted hover:bg-primary/20 rounded p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {imageUrls.length === 0 && !uploading && (
                          <div className="flex flex-col items-center justify-center w-full py-4 text-muted-foreground">
                            <ImageIcon className="h-10 w-10 mb-2" />
                            <p className="text-sm">Noch keine Bilder hochgeladen</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <Label htmlFor="image-upload" className="sr-only">Bilder hochladen</Label>
                        <Input
                          id="image-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          multiple
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="cursor-pointer"
                        />
                        {uploading && (
                          <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Wird hochgeladen...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {error && <p className="text-destructive text-sm">{error}</p>}

                  <div className="flex gap-3">
                    <Button type="submit" disabled={saving || uploading}>
                      {saving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Wird gespeichert...</>) : editingId ? "Aktualisieren" : "Erstellen"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>Abbrechen</Button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 bg-muted rounded-2xl">
                <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Noch keine Events vorhanden. Erstellen Sie Ihr erstes Event!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="bg-muted p-6 rounded-xl flex flex-col sm:flex-row gap-4 items-start">
                    {event.image_urls && event.image_urls.length > 0 && (
                      <div className="flex gap-2 flex-shrink-0">
                        {event.image_urls.slice(0, 3).map((url, i) => (
                          <img key={i} src={url} alt={event.title} className="w-20 h-16 object-cover rounded-lg" />
                        ))}
                        {event.image_urls.length > 3 && (
                          <div className="w-20 h-16 rounded-lg bg-background flex items-center justify-center text-sm text-muted-foreground font-medium">
                            +{event.image_urls.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-primary font-medium mb-1">{formatDate(event.date)}</p>
                      <h3 className="text-lg font-bold text-foreground mb-1">
                        {event.title}
                        {event.title_ar && (
                          <span className="text-muted-foreground font-normal ms-2" dir="rtl">({event.title_ar})</span>
                        )}
                      </h3>
                      <p className="text-muted-foreground text-sm line-clamp-2">{event.description}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(event)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(event.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
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
