"use client"

import React, { useEffect, useState, useCallback, use } from "react"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Pencil, Plus, X, Loader2, ArrowLeft, Upload, Shield } from "lucide-react"
import { uploadFile } from "@/lib/upload-client"

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

interface Candidate {
  id: string
  name: string
  name_ar: string
  bio: string
  bio_ar: string
  image_url: string
  sort_order: number
}

export default function AdminElectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [election, setElection] = useState<Election | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [canEdit, setCanEdit] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    bio: "",
    bioAr: "",
    imageUrl: "",
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check")
      if (res.ok) {
        const data = await res.json()
        const role = data.user?.role || "viewer"
        const perms: string[] = data.user?.permissions || []
        setCanEdit(role === "admin" || perms.includes("wahlen"))
      }
    } catch { /* ignore */ }
    setAuthChecked(true)
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/elections/${id}`)
      if (res.ok) {
        const data = await res.json()
        setElection(data.election)
        setCandidates(data.candidates || [])
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setForm({ name: "", nameAr: "", bio: "", bioAr: "", imageUrl: "" })
    setEditingId(null)
    setShowForm(false)
    setError("")
  }

  const handleEdit = (c: Candidate) => {
    setForm({
      name: c.name,
      nameAr: c.name_ar,
      bio: c.bio,
      bioAr: c.bio_ar,
      imageUrl: c.image_url,
    })
    setEditingId(c.id)
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
      setForm((prev) => ({ ...prev, imageUrl: data.url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const url = editingId
        ? `/api/elections/${id}/candidates/${editingId}`
        : `/api/elections/${id}/candidates`
      const method = editingId ? "PUT" : "POST"
      const sortOrder = editingId
        ? candidates.find((c) => c.id === editingId)?.sort_order ?? 0
        : candidates.length

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sortOrder }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Fehler beim Speichern.")
      }
      resetForm()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (candidateId: string) => {
    if (!confirm("Kandidat wirklich löschen?")) return
    try {
      const res = await fetch(`/api/elections/${id}/candidates/${candidateId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Fehler beim Löschen.")
        return
      }
      load()
    } catch {
      alert("Verbindungsfehler.")
    }
  }

  if (!authChecked || loading) {
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

  if (!canEdit) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Kein Zugriff</h1>
            <p className="text-muted-foreground">Sie benötigen die Berechtigung &quot;wahlen&quot;.</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!election) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <p className="text-muted-foreground">Wahl nicht gefunden.</p>
        </main>
        <Footer />
      </div>
    )
  }

  const isDraft = election.status === "draft"
  const isClosed = election.status === "closed"

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <section className="py-12 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto">
            <Button asChild variant="ghost" size="sm" className="gap-2 mb-4">
              <Link href="/admin/wahlen">
                <ArrowLeft className="h-4 w-4" />
                Zurück zur Übersicht
              </Link>
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold">{election.title}</h1>
            <p className="text-muted-foreground mt-2">
              Status: <strong>{election.status}</strong> · Kandidaten verwalten
            </p>
            {!isDraft && (
              <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mt-4">
                {isClosed
                  ? "Diese Wahl ist beendet. Kandidaten können nicht mehr bearbeitet werden."
                  : "Diese Wahl läuft. Hinzufügen/Bearbeiten ist möglich, Löschen jedoch nicht."}
              </p>
            )}
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            {!isClosed && !showForm && (
              <div className="mb-8">
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Neuer Kandidat
                </Button>
              </div>
            )}

            {!isClosed && showForm && (
              <div className="bg-secondary p-8 rounded-2xl mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">{editingId ? "Kandidat bearbeiten" : "Neuer Kandidat"}</h2>
                  <Button variant="ghost" size="icon" onClick={resetForm}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name (Deutsch) *</Label>
                      <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div>
                      <Label htmlFor="nameAr">Name (Arabisch)</Label>
                      <Input id="nameAr" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} dir="rtl" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bio">Kurzvorstellung (Deutsch)</Label>
                      <Textarea id="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} />
                    </div>
                    <div>
                      <Label htmlFor="bioAr">Kurzvorstellung (Arabisch)</Label>
                      <Textarea id="bioAr" value={form.bioAr} onChange={(e) => setForm({ ...form, bioAr: e.target.value })} rows={4} dir="rtl" />
                    </div>
                  </div>

                  <div>
                    <Label>Foto</Label>
                    <div className="mt-2 border-2 border-dashed border-border rounded-xl p-6">
                      {form.imageUrl ? (
                        <div className="flex items-center gap-4">
                          <Image src={form.imageUrl} alt="" width={120} height={120} className="rounded-lg object-cover" />
                          <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, imageUrl: "" })}>
                            Entfernen
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <Label htmlFor="cand-image" className="cursor-pointer flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                            <Upload className="h-5 w-5" />
                            Foto hochladen
                          </Label>
                          <Input id="cand-image" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                      )}
                    </div>
                  </div>

                  {error && <p className="text-destructive text-sm">{error}</p>}

                  <div className="flex gap-3">
                    <Button type="submit" disabled={saving || uploading}>
                      {saving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Speichert...</>) : (editingId ? "Speichern" : "Hinzufügen")}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>Abbrechen</Button>
                  </div>
                </form>
              </div>
            )}

            {candidates.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Noch keine Kandidaten.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {candidates.map((c) => (
                  <article key={c.id} className="bg-background border border-border rounded-2xl p-6 shadow-sm">
                    <div className="flex gap-4">
                      {c.image_url ? (
                        <Image src={c.image_url} alt={c.name} width={80} height={80} className="rounded-lg object-cover w-20 h-20" />
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded-lg" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{c.name}</h3>
                        {c.name_ar && <p className="text-sm text-muted-foreground" dir="rtl">{c.name_ar}</p>}
                        {c.bio && <p className="text-sm mt-2 line-clamp-2">{c.bio}</p>}
                      </div>
                    </div>

                    {!isClosed && (
                      <div className="flex gap-2 mt-4 justify-end">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isDraft && (
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </article>
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
