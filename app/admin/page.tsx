"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarDays, Newspaper, Users, ImageIcon, Mail, LogIn, Loader2, Shield } from "lucide-react"

interface AdminLink {
  title: string
  description: string
  href: string
  icon: React.ElementType
  page: string
}

const adminLinks: AdminLink[] = [
  {
    title: "Veranstaltungen",
    description: "Events erstellen, bearbeiten und löschen",
    href: "/admin/veranstaltungen",
    icon: CalendarDays,
    page: "veranstaltungen",
  },
  {
    title: "Nachrichten",
    description: "Nachrichten erstellen, bearbeiten und löschen",
    href: "/admin/nachrichten",
    icon: Newspaper,
    page: "nachrichten",
  },
  {
    title: "Bilder",
    description: "Galerie-Bilder verwalten",
    href: "/admin/bilder",
    icon: ImageIcon,
    page: "bilder",
  },
  {
    title: "Mailbox",
    description: "Eingegangene E-Mails lesen",
    href: "/admin/mailbox",
    icon: Mail,
    page: "mailbox",
  },
  {
    title: "Benutzer",
    description: "Benutzer und Berechtigungen verwalten",
    href: "/admin/benutzer",
    icon: Users,
    page: "benutzer",
  },
]

export default function AdminDashboardPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [userName, setUserName] = useState("")
  const [checking, setChecking] = useState(true)

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [userPermissions, setUserPermissions] = useState<string[]>([])

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check")
      if (res.ok) {
        const data = await res.json()
        setAuthenticated(true)
        setUserRole(data.user?.role || "viewer")
        setUserPermissions(data.user?.permissions || [])
        setUserName(data.user?.name || data.user?.email || "")
      }
    } catch {
      // not authenticated
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])

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
          setUserName(checkData.user?.name || checkData.user?.email || "")
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

  const canAccess = (page: string) => {
    if (userRole === "admin") return true
    if (page === "benutzer") return false
    return userPermissions.includes(page)
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Administrator"
      case "editor": return "Editor"
      default: return "Betrachter"
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

  const hasAnyAccess = userRole === "admin" || userPermissions.length > 0

  if (authenticated && !hasAnyAccess) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Kein Zugriff</h1>
            <p className="text-muted-foreground">Sie benötigen die Rolle &quot;Editor&quot; oder &quot;Admin&quot;, um den Admin-Bereich zu betreten.</p>
          </div>
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
                Melden Sie sich an, um den Admin-Bereich zu nutzen.
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
              Admin-Bereich
            </h1>
            <p className="text-xl text-muted-foreground">
              Willkommen, {userName}
            </p>
            <span className="inline-block mt-2 text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
              {getRoleLabel(userRole)}
            </span>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminLinks.map((link) => {
                const hasAccess = canAccess(link.page)
                return (
                  <div key={link.href} className="relative">
                    {hasAccess ? (
                      <Link
                        href={link.href}
                        className="block bg-muted p-6 rounded-xl hover:shadow-md hover:bg-muted/80 transition-all group"
                      >
                        <link.icon className="h-10 w-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                        <h2 className="text-lg font-bold text-foreground mb-1">{link.title}</h2>
                        <p className="text-sm text-muted-foreground">{link.description}</p>
                      </Link>
                    ) : (
                      <div className="block bg-muted p-6 rounded-xl opacity-50 cursor-not-allowed">
                        <link.icon className="h-10 w-10 text-muted-foreground mb-4" />
                        <h2 className="text-lg font-bold text-foreground mb-1">{link.title}</h2>
                        <p className="text-sm text-muted-foreground">{link.description}</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-orange-500">
                          <Shield className="h-3 w-3" />
                          Keine Berechtigung
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
