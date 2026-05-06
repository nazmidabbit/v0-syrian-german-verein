"use client"

import React, { useEffect, useState, useCallback, use } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, Shield, CheckCircle2, XCircle, Mail, Calendar, Vote } from "lucide-react"

interface UserDetail {
  id: string
  name: string
  email: string
  role: string
  is_verified: boolean
  email_verified: boolean
  permissions: string[]
  created_at: string
}

interface VoteEntry {
  id: string
  createdAt: string
  election: { id: string; title: string; title_ar: string; status: string } | null
  candidate: { id: string; name: string; name_ar: string } | null
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  editor: "Editor",
  viewer: "Betrachter",
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<UserDetail | null>(null)
  const [votes, setVotes] = useState<VoteEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check")
      if (res.ok) {
        const data = await res.json()
        setIsAdmin(data.user?.role === "admin")
      }
    } catch { /* ignore */ }
    setAuthChecked(true)
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`)
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setVotes(data.votes || [])
      } else {
        setNotFound(true)
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { if (isAdmin) load() }, [isAdmin, load])

  const formatDate = (s: string) =>
    new Date(s).toLocaleString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  if (!authChecked || (isAdmin && loading)) {
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Kein Zugriff</h1>
            <p className="text-muted-foreground">Nur Administratoren k&ouml;nnen Benutzer einsehen.</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (notFound || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <Button asChild variant="ghost" size="sm" className="mb-4">
              <Link href="/admin/benutzer"><ArrowLeft className="h-4 w-4 mr-2" />Zur&uuml;ck</Link>
            </Button>
            <p className="text-muted-foreground">Benutzer nicht gefunden.</p>
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
        <section className="py-12 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto">
            <Button asChild variant="ghost" size="sm" className="gap-2 mb-4">
              <Link href="/admin/benutzer">
                <ArrowLeft className="h-4 w-4" />
                Zur&uuml;ck zur &Uuml;bersicht
              </Link>
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold">{user.name || user.email}</h1>
            <p className="text-muted-foreground mt-1">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                <Shield className="h-3.5 w-3.5" />
                {ROLE_LABEL[user.role] || user.role}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${user.is_verified ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                {user.is_verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                {user.is_verified ? "Freigeschaltet" : "Nicht freigeschaltet"}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${user.email_verified ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                <Mail className="h-3.5 w-3.5" />
                {user.email_verified ? "E-Mail best&auml;tigt" : "E-Mail nicht best&auml;tigt"}
              </span>
            </div>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-background border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Konto-Informationen
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Registriert am</dt>
                  <dd className="font-medium">{formatDate(user.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Berechtigungen</dt>
                  <dd className="font-medium">
                    {user.role === "admin"
                      ? "Alle (Admin)"
                      : user.permissions.length > 0
                        ? user.permissions.join(", ")
                        : <span className="text-muted-foreground">Keine</span>}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-background border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Vote className="h-5 w-5 text-primary" />
                Abgegebene Stimmen
                <span className="text-sm font-normal text-muted-foreground">({votes.length})</span>
              </h2>

              {votes.length === 0 ? (
                <p className="text-muted-foreground text-sm">Bisher keine Stimmen abgegeben.</p>
              ) : (
                <ul className="space-y-3">
                  {votes.map((v) => (
                    <li key={v.id} className="flex items-start justify-between gap-4 p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">
                          {v.election ? v.election.title : "Wahl gelöscht"}
                          {v.election && (
                            <span className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full ${v.election.status === "active" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                              {v.election.status === "active" ? "Laufend" : "Beendet"}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          F&uuml;r: <strong>{v.candidate ? v.candidate.name : "Kandidat gelöscht"}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(v.createdAt)}</p>
                      </div>
                      {v.election && (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/wahlen/${v.election.id}`}>Wahl ansehen</Link>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
