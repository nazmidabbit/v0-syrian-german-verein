"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { CalendarDays, Home, SearchX } from "lucide-react"

// Zweisprachige 404-Seite im Erscheinungsbild der uebrigen Seiten —
// statt der nackten Standardmeldung von Next.
export default function NotFound() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main" className="flex-1 flex items-center justify-center px-6 pt-20">
        <div className="max-w-md text-center py-20">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <SearchX className="h-10 w-10 text-primary" />
          </div>
          <p className="text-sm font-semibold text-primary tracking-widest mb-2">404</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t.notFound.title}</h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{t.notFound.text}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link href="/">
                <Home className="h-5 w-5" />
                {t.notFound.home}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link href="/veranstaltungen">
                <CalendarDays className="h-5 w-5" />
                {t.notFound.events}
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
