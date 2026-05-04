"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Vote, Loader2, ArrowRight } from "lucide-react"

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

export default function ElectionsPage() {
  const { t, locale } = useLanguage()
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/elections")
      .then((res) => res.json())
      .then((data) => setElections(data.elections || []))
      .catch(() => setElections([]))
      .finally(() => setLoading(false))
  }, [])

  const getTitle = (e: Election) => (locale === "ar" && e.title_ar ? e.title_ar : e.title)
  const getDescription = (e: Election) =>
    locale === "ar" && e.description_ar ? e.description_ar : e.description

  const formatDate = (s: string) =>
    new Date(s).toLocaleString(locale === "ar" ? "ar-SA" : "de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const visible = elections.filter((e) => e.status !== "draft")
  const active = visible.filter((e) => e.status === "active")
  const closed = visible.filter((e) => e.status === "closed")

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <section className="py-16 px-6 bg-gradient-to-b from-white to-primary/10">
          <div className="max-w-4xl mx-auto text-center">
            <Vote className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              {t.election.pageTitle}
            </h1>
            <p className="text-xl text-muted-foreground">{t.election.pageSubtitle}</p>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="text-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">{t.election.loading}</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="text-center py-20">
                <Vote className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground">{t.election.noElections}</p>
              </div>
            ) : (
              <div className="space-y-8">
                {active.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4">{t.election.activeNow}</h2>
                    <div className="space-y-4">
                      {active.map((e) => (
                        <ElectionCard
                          key={e.id}
                          election={e}
                          title={getTitle(e)}
                          description={getDescription(e)}
                          formatDate={formatDate}
                          activeBadge={t.election.activeNow}
                          ctaLabel={t.election.vote}
                          highlighted
                        />
                      ))}
                    </div>
                  </div>
                )}

                {closed.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4 mt-12">{t.election.closed}</h2>
                    <div className="space-y-4">
                      {closed.map((e) => (
                        <ElectionCard
                          key={e.id}
                          election={e}
                          title={getTitle(e)}
                          description={getDescription(e)}
                          formatDate={formatDate}
                          activeBadge={t.election.closed}
                          ctaLabel={t.election.results}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function ElectionCard({
  election,
  title,
  description,
  formatDate,
  activeBadge,
  ctaLabel,
  highlighted = false,
}: {
  election: Election
  title: string
  description: string
  formatDate: (s: string) => string
  activeBadge: string
  ctaLabel: string
  highlighted?: boolean
}) {
  return (
    <article
      className={`rounded-2xl p-6 border shadow-sm ${
        highlighted ? "bg-primary/5 border-primary/30" : "bg-background border-border"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span
            className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${
              election.status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {activeBadge}
          </span>
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-2">
            {formatDate(election.starts_at)} → {formatDate(election.ends_at)}
          </p>
          {description && <p className="text-sm text-foreground/80 line-clamp-3">{description}</p>}
        </div>
        <Button asChild className="gap-2 shrink-0">
          <Link href={`/wahlen/${election.id}`}>
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </article>
  )
}
