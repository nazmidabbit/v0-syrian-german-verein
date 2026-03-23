"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Loader2, Users, LogIn, Shield, ShieldCheck, Eye, CheckCircle, XCircle } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  is_verified: boolean
  email_verified: boolean
  created_at: string
}

const ROLES = [
  { value: "admin", label: "Admin", description: "Voller Zugriff auf alles", icon: ShieldCheck },
  { value: "editor", label: "Editor", description: "Kann Inhalte erstellen und bearbeiten", icon: Shield },
  { value: "viewer", label: "Betrachter", description: "Kann nur lesen", icon: Eye },
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const [currentUserId, setCurrentUserId] = useState("")

  // Login form
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check")
      if (res.ok) {
        const data = await res.json()
        setAuthenticated(true)
        setIsAdmin(data.user?.role === "admin")
        // Decode token to get user ID
        const cookies = document.cookie.split(";")
        const authCookie = cookies.find((c) => c.trim().startsWith("auth-token="))
        if (authCookie) {
          try {
            const token = authCookie.split("=")[1]
            const decoded = JSON.parse(atob(token))
            setCurrentUserId(decoded.userId)
          } catch { /* ignore */ }
        }
      }
    } catch {
      // not authenticated
    } finally {
      setChecking(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      } else {
        setError("Keine Berechtigung.")
      }
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { if (authenticated && isAdmin) loadUsers() }, [authenticated, isAdmin, loadUsers])

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
        // Re-check to get role
        const checkRes = await fetch("/api/auth/check")
        if (checkRes.ok) {
          const data = await checkRes.json()
          setIsAdmin(data.user?.role === "admin")
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

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId)
    setError("")
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
      } else {
        const data = await res.json()
        setError(data.error || "Fehler beim Ändern.")
      }
    } catch {
      setError("Verbindungsfehler.")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleToggleVerified = async (userId: string, verified: boolean) => {
    setUpdatingId(userId)
    setError("")
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_verified: verified }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_verified: verified } : u))
      } else {
        const data = await res.json()
        setError(data.error || "Fehler beim Ändern.")
      }
    } catch {
      setError("Verbindungsfehler.")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Möchten Sie "${name || "diesen Benutzer"}" wirklich löschen?`)) return
    setUpdatingId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId))
      } else {
        const data = await res.json()
        setError(data.error || "Fehler beim Löschen.")
      }
    } catch {
      setError("Verbindungsfehler.")
    } finally {
      setUpdatingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800"
      case "editor": return "bg-blue-100 text-blue-800"
      default: return "bg-gray-100 text-gray-800"
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
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <LogIn className="h-12 w-12 text-primary mx-auto mb-4" />
              <h1 className="text-3xl font-bold">Admin Login</h1>
              <p className="text-muted-foreground mt-2">
                Melden Sie sich an, um Benutzer zu verwalten.
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Kein Zugriff</h1>
            <p className="text-muted-foreground">Nur Administratoren können Benutzer verwalten.</p>
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
              Benutzer verwalten
            </h1>
            <p className="text-xl text-muted-foreground">
              Berechtigungen und Rollen zuweisen
            </p>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            {/* Rollen-Legende */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {ROLES.map((r) => (
                <div key={r.value} className="bg-muted p-4 rounded-xl flex items-start gap-3">
                  <r.icon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4 text-sm text-center">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 bg-muted rounded-2xl">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Keine Benutzer gefunden.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`bg-muted p-6 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center ${user.id === currentUserId ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-foreground">
                          {user.name || "Kein Name"}
                        </h3>
                        {user.id === currentUserId && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Sie</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getRoleBadgeColor(user.role || "viewer")}`}>
                          {ROLES.find((r) => r.value === (user.role || "viewer"))?.label || "Betrachter"}
                        </span>
                        <span className={`text-xs flex items-center gap-1 ${user.email_verified ? "text-green-600" : "text-orange-500"}`}>
                          {user.email_verified ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {user.email_verified ? "E-Mail bestätigt" : "E-Mail nicht bestätigt"}
                        </span>
                        <span className={`text-xs flex items-center gap-1 ${user.is_verified ? "text-green-600" : "text-orange-500"}`}>
                          {user.is_verified ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {user.is_verified ? "Freigegeben" : "Nicht freigegeben"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Seit {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Rolle ändern */}
                      <select
                        value={user.role || "viewer"}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={updatingId === user.id || user.id === currentUserId}
                        className="text-sm border border-border rounded-lg px-3 py-2 bg-background disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>

                      {/* Verifizierung umschalten */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleVerified(user.id, !user.is_verified)}
                        disabled={updatingId === user.id || user.id === currentUserId}
                        title={user.is_verified ? "Deaktivieren" : "Aktivieren"}
                      >
                        {user.is_verified ? <XCircle className="h-4 w-4 text-orange-500" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                      </Button>

                      {/* Löschen */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user.id, user.name)}
                        disabled={updatingId === user.id || user.id === currentUserId}
                        className="text-destructive hover:text-destructive"
                      >
                        {updatingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
