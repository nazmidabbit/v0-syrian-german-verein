"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

function VerifyContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Kein Bestätigungstoken gefunden.")
      return
    }

    fetch(`/api/verify?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setStatus("error")
          setMessage(data.error)
        } else {
          setStatus("success")
          setMessage(data.message)
        }
      })
      .catch(() => {
        setStatus("error")
        setMessage("Verbindungsfehler. Bitte versuchen Sie es später erneut.")
      })
  }, [token])

  return (
    <div className="text-center max-w-md">
      {status === "loading" && (
        <>
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">E-Mail wird bestätigt...</h1>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">E-Mail bestätigt!</h1>
          <p className="text-muted-foreground">{message}</p>
          <p className="text-muted-foreground mt-4">
            Ihr Konto muss noch vom Administrator freigegeben werden. Sie werden benachrichtigt, sobald Ihr Zugang aktiviert ist.
          </p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Fehler</h1>
          <p className="text-muted-foreground">{message}</p>
        </>
      )}
    </div>
  )
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 pt-20">
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
          <VerifyContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
