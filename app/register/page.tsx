import React, { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email || !password || !confirm) {
      setError("Bitte alle Felder ausfüllen.")
      return
    }
    if (password !== confirm) {
      setError("Passwörter stimmen nicht überein.")
      return
    }
    // Demo: Immer Fehler
    setError("Registrierung nicht implementiert.")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20 px-6 max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">Registrieren</h1>
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
          <Button type="submit" className="w-full">Registrieren</Button>
          {error && <div className="text-red-500 mt-2">{error}</div>}
        </form>
        <div className="mt-6 text-center">
          Bereits registriert? <a href="/login" className="text-primary underline">Login</a>
        </div>
      </main>
      <Footer />
    </div>
  )
}
