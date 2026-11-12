"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { AlertTriangle, Home, RotateCcw } from "lucide-react"

// Faengt Laufzeitfehler einer Seite ab und bietet einen Neuversuch an.
// Die eigentliche Fehlermeldung landet in der Konsole, nicht beim Besucher.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLanguage()

  useEffect(() => {
    console.error("Seitenfehler:", error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main" className="flex-1 flex items-center justify-center px-6 pt-20">
        <div className="max-w-md text-center py-20">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t.errorPage.title}</h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{t.errorPage.text}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2" onClick={() => reset()}>
              <RotateCcw className="h-5 w-5" />
              {t.errorPage.retry}
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link href="/">
                <Home className="h-5 w-5" />
                {t.errorPage.home}
              </Link>
            </Button>
          </div>
          {error.digest && (
            <p className="mt-6 text-xs text-muted-foreground font-mono">Ref: {error.digest}</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
