"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Pencil, Plus, X, Loader2, Newspaper, LogIn, ImageIcon, Video, LinkIcon, Shield } from "lucide-react"
import { uploadFile } from "@/lib/upload-client"

interface NewsItem {
  id: string
  title: string
  title_ar: string
  content: string
  content_ar: string
  image_url: string
  video_urls: string[]
  link: string
  published_at: string
}

export default function AdminNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [checking, setChecking] = useState(true)

  // Login form
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  // News form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "",
    titleAr: "",
    content: "",
    contentAr: "",
    link: "",
  })
  const [imageUrl, setImageUrl] = useState("")
  const [videoUrls, setVideoUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const canEdit = userRole === "admin" || userPermissions.includes("nachrichten")

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

  const loadNews = useCallback(async () => {
    try {
      const res = await fetch("/api/news")
      const data = await res.json()
      setNews(data.news || [])
    } catch {
      setNews([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { if (authenticated) loadNews() }, [authenticated, loadNews])

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
          const checkData = await checkRes.json()
          setUserRole(checkData.user?.role || "viewer")
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
    setForm({ title: "", titleAr: "", content: "", contentAr: "", link: "" })
    setImageUrl("")
    setVideoUrls([])
    setEditingId(null)
    setShowForm(false)
    setError("")
  }

  const handleEdit = (item: NewsItem) => {
    setForm({
      title: item.title,
      titleAr: item.title_ar,
      content: item.content,
      contentAr: item.content_ar,
      link: item.link || "",
    })
    setImageUrl(item.image_url || "")
    setVideoUrls(item.video_urls || [])
    setEditingId(item.id)
    setShowForm(true)
    setError("")
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError("")

    try {
      const data = await uploadFile(file)
      setImageUrl(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingVideo(true)
    setError("")

    try {
      for (const file of Array.from(files)) {
        const data = await uploadFile(file)
        setVideoUrls((prev) => [...prev, data.url])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video-Upload fehlgeschlagen")
    } finally {
      setUploadingVideo(false)
      e.target.value = ""
    }
  }

  const removeVideo = (index: number) => {
    setVideoUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = editingId ? `/api/news/${editingId}` : "/api/news"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, imageUrl, videoUrls }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Fehler beim Speichern.")
      }

      resetForm()
      loadNews()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diese Nachricht wirklich löschen?")) return
    try {
      const res = await fetch(`/api/news/${id}`, { method: "DELETE" })
      if (res.ok) loadNews()
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
                Melden Sie sich an, um Nachrichten zu verwalten.
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

  if (!canEdit) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Kein Zugriff</h1>
            <p className="text-muted-foreground">Sie benötigen die Rolle &quot;Editor&quot; oder &quot;Admin&quot;, um diese Seite zu betreten.</p>
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
              Nachrichten verwalten
            </h1>
            <p className="text-xl text-muted-foreground">
              Erstellen, bearbeiten und löschen Sie Nachrichten
            </p>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            {!canEdit && (
              <div className="mb-8 bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center gap-3">
                <Shield className="h-5 w-5 text-orange-500" />
                <p className="text-sm text-orange-700">Sie haben nur Leserechte. Zum Bearbeiten benötigen Sie die Rolle &quot;Editor&quot; oder &quot;Admin&quot;.</p>
              </div>
            )}

            {canEdit && !showForm && (
              <div className="mb-8">
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Neue Nachricht erstellen
                </Button>
              </div>
            )}

            {canEdit && showForm && (
              <div className="bg-secondary p-8 rounded-2xl mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">
                    {editingId ? "Nachricht bearbeiten" : "Neue Nachricht"}
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
                      <Label htmlFor="content">Inhalt (Deutsch) *</Label>
                      <Textarea id="content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} required />
                    </div>
                    <div>
                      <Label htmlFor="contentAr">Inhalt (Arabisch)</Label>
                      <Textarea id="contentAr" value={form.contentAr} onChange={(e) => setForm({ ...form, contentAr: e.target.value })} rows={6} dir="rtl" />
                    </div>
                  </div>

                  {/* Link */}
                  <div>
                    <Label htmlFor="link" className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Link (optional)
                    </Label>
                    <Input
                      id="link"
                      type="url"
                      placeholder="https://..."
                      value={form.link}
                      onChange={(e) => setForm({ ...form, link: e.target.value })}
                      className="max-w-lg"
                    />
                  </div>

                  {/* Bild Upload */}
                  <div>
                    <Label>Bild</Label>
                    <div className="mt-2 border-2 border-dashed border-border rounded-xl p-6">
                      {imageUrl ? (
                        <div className="relative group inline-block">
                          <div className="w-48 h-32 rounded-lg overflow-hidden border border-border">
                            <img src={imageUrl} alt="Vorschau" className="w-full h-full object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setImageUrl("")}
                            className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                          <ImageIcon className="h-10 w-10 mb-2" />
                          <p className="text-sm">Noch kein Bild hochgeladen</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-4">
                        <Input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
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

                  {/* Videos Upload */}
                  <div>
                    <Label>Videos</Label>
                    <div className="mt-2 border-2 border-dashed border-border rounded-xl p-6">
                      <div className="flex flex-wrap gap-4 mb-4">
                        {videoUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <div className="w-48 h-32 rounded-lg overflow-hidden border border-border bg-black">
                              <video src={url} className="w-full h-full object-cover" muted />
                            </div>
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => removeVideo(index)}
                                className="bg-destructive text-white rounded-full p-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-1">Video {index + 1}</p>
                          </div>
                        ))}

                        {videoUrls.length === 0 && !uploadingVideo && (
                          <div className="flex flex-col items-center justify-center w-full py-4 text-muted-foreground">
                            <Video className="h-10 w-10 mb-2" />
                            <p className="text-sm">Noch keine Videos hochgeladen</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          multiple
                          onChange={handleVideoUpload}
                          disabled={uploadingVideo}
                          className="cursor-pointer"
                        />
                        {uploadingVideo && (
                          <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Video wird hochgeladen...</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Erlaubt: MP4, WebM, MOV (max. 100MB)</p>
                    </div>
                  </div>

                  {error && <p className="text-destructive text-sm">{error}</p>}

                  <div className="flex gap-3">
                    <Button type="submit" disabled={saving || uploading || uploadingVideo}>
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
            ) : news.length === 0 ? (
              <div className="text-center py-12 bg-muted rounded-2xl">
                <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Noch keine Nachrichten vorhanden. Erstellen Sie Ihre erste Nachricht!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {news.map((item) => (
                  <div key={item.id} className="bg-muted p-6 rounded-xl flex flex-col sm:flex-row gap-4 items-start">
                    {item.image_url && (
                      <div className="flex-shrink-0">
                        <img src={item.image_url} alt={item.title} className="w-20 h-16 object-cover rounded-lg" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-primary font-medium mb-1">{formatDate(item.published_at)}</p>
                      <h3 className="text-lg font-bold text-foreground mb-1">
                        {item.title}
                        {item.title_ar && (
                          <span className="text-muted-foreground font-normal ms-2" dir="rtl">({item.title_ar})</span>
                        )}
                      </h3>
                      <p className="text-muted-foreground text-sm line-clamp-2">{item.content}</p>
                      <div className="flex gap-3 mt-1">
                        {item.video_urls && item.video_urls.length > 0 && (
                          <span className="text-xs text-primary flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            {item.video_urls.length} Video{item.video_urls.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {item.link && (
                          <span className="text-xs text-primary flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            Link
                          </span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
