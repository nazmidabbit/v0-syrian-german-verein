"use client"
import React, { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2 } from "lucide-react"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (!email || !password || !confirm) {
      setError("Bitte alle Felder ausfüllen.")
      return
    }
    if (password !== confirm) {
      setError("Passwörter stimmen nicht überein.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: email })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Fehler bei der Registrierung.")
        return
      }
      setSuccess(data.message || "Registrierung erfolgreich!")
      setEmail("")
      setPassword("")
      setConfirm("")
    } catch {
      setError("Serverfehler. Bitte später versuchen.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 pt-20">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center">Registrieren</h1>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-green-800 font-medium">{success}</p>
              <a href="/login" className="inline-block mt-4 text-primary underline">Zum Login</a>
            </div>
          ) : (
            <>
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <Input
                  type="email"
                  placeholder="E-Mail"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="Passwort"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="Passwort bestätigen"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Wird registriert...</>) : "Registrieren"}
                </Button>
                {error && <div className="text-red-500 text-sm text-center">{error}</div>}
              </form>
              <div className="mt-6 text-center">
                Bereits registriert? <a href="/login" className="text-primary underline">Login</a>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
