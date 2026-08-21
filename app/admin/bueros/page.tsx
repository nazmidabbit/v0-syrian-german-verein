"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Building2,
  CheckCircle,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  Shield,
  Trash2,
  X,
  XCircle,
} from "lucide-react"

interface Office {
  id: string
  name: string
  name_ar: string
  sort_order: number
  is_active: boolean
  created_at: string
}

interface OfficeForm {
  name: string
  nameAr: string
  sortOrder: string
}

const EMPTY_FORM: OfficeForm = { name: "", nameAr: "", sortOrder: "0" }

export default function AdminOfficesPage() {
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accessError, setAccessError] = useState("")
  const [actionError, setActionError] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<OfficeForm>(EMPTY_FORM)

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

  const loadOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bueros")
      if (res.ok) {
        const data = await res.json()
        setOffices(data.offices || [])
      } else {
        setAccessError("Keine Berechtigung für Büros.")
      }
    } catch {
      setAccessError("Fehler beim Laden.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { if (authenticated) loadOffices() }, [authenticated, loadOffices])

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, sortOrder: String((offices[offices.length - 1]?.sort_order ?? 0) + 1) })
    setShowForm(true)
    setActionError("")
  }

  const startEdit = (office: Office) => {
    setEditingId(office.id)
    setForm({ name: office.name, nameAr: office.name_ar || "", sortOrder: String(office.sort_order) })
    setShowForm(true)
    setActionError("")
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionError("")
    const payload = {
      name: form.name.trim(),
      nameAr: form.nameAr.trim(),
      sortOrder: Math.max(0, Number(form.sortOrder) || 0),
    }
    if (payload.name.length < 2) {
      setActionError("Bitte einen Namen (mind. 2 Zeichen) angeben.")
      return
    }
    setSavingId(editingId || "new")
    try {
      const res = await fetch(editingId ? `/api/admin/bueros/${editingId}` : "/api/admin/bueros", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        await loadOffices()
        cancelForm()
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

  const toggleActive = async (office: Office) => {
    setActionError("")
    setSavingId(office.id)
    try {
      const res = await fetch(`/api/admin/bueros/${office.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !office.is_active }),
      })
      if (res.ok) {
        setOffices((prev) => prev.map((o) => (o.id === office.id ? { ...o, is_active: !o.is_active } : o)))
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

  const deleteOffice = async (office: Office) => {
    if (
      !window.confirm(
        `Büro "${office.name}" endgültig löschen? Bestehende Mitgliedsanträge verlieren die Zuordnung. Tipp: Stattdessen deaktivieren, um es nur im Formular auszublenden.`,
      )
    ) {
      return
    }
    setActionError("")
    setSavingId(office.id)
    try {
      const res = await fetch(`/api/admin/bueros/${office.id}`, { method: "DELETE" })
      if (res.ok) {
        setOffices((prev) => prev.filter((o) => o.id !== office.id))
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
            <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Büros</h1>
            <p className="text-xl text-muted-foreground">
              Arbeitsbüros als Stammdaten verwalten — Auswahl im Mitgliedsantrag
            </p>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <p className="text-sm text-muted-foreground">
                {offices.length} Büros · Inaktive Büros erscheinen nicht im Antragsformular
              </p>
              {!showForm && (
                <Button size="sm" onClick={startCreate} className="gap-1">
                  <Plus className="h-4 w-4" /> Büro anlegen
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
                  {editingId ? "Büro bearbeiten" : "Neues Büro"}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="office-name">Name (Deutsch) *</Label>
                    <Input
                      id="office-name"
                      maxLength={100}
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="office-name-ar">Name (Arabisch)</Label>
                    <Input
                      id="office-name-ar"
                      dir="rtl"
                      maxLength={100}
                      value={form.nameAr}
                      onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="office-sort">Sortierung</Label>
                    <Input
                      id="office-sort"
                      type="number"
                      min={0}
                      max={9999}
                      value={form.sortOrder}
                      onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={savingId !== null} className="gap-1">
                    {savingId !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Speichern
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={cancelForm} className="gap-1">
                    <X className="h-4 w-4" /> Abbrechen
                  </Button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : offices.length === 0 ? (
              <p className="text-center text-muted-foreground py-20">
                Noch keine Büros angelegt. (Migration offices-and-membership-extensions.sql ausgeführt?)
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {offices.map((office) => (
                  <div
                    key={office.id}
                    className={`bg-muted rounded-xl p-4 flex flex-wrap items-center gap-3 ${office.is_active ? "" : "opacity-60"}`}
                  >
                    <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                      {office.sort_order}
                    </span>
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-semibold text-foreground">{office.name}</p>
                      {office.name_ar && (
                        <p className="text-sm text-muted-foreground" dir="rtl">
                          {office.name_ar}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        office.is_active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {office.is_active ? "Aktiv" : "Inaktiv"}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(office)}
                        disabled={savingId === office.id}
                        className="gap-1"
                      >
                        <Pencil className="h-4 w-4" /> Bearbeiten
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(office)}
                        disabled={savingId === office.id}
                        className="gap-1"
                      >
                        {office.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        {office.is_active ? "Deaktivieren" : "Aktivieren"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteOffice(office)}
                        disabled={savingId === office.id}
                        className="gap-1"
                      >
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
