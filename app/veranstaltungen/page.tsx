"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { EventImageGallery } from "@/components/event-image-gallery"
import { ShareButton } from "@/components/share-button"
import { ArrowRight, CalendarDays, ClipboardList } from "lucide-react"

interface Event {
  id: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  date: string
  image_urls: string[]
  video_urls: string[]
  // Aus dem Formular-Baukasten verknuepfte Anmeldung (0 oder 1 aktives)
  registration_forms?: { slug: string; is_active: boolean; closes_at: string | null }[]
}

export default function EventsPage() {
  const { t, locale } = useLanguage()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === "ar" ? "ar-SY-u-nu-latn" : "de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getTitle = (event: Event) =>
    locale === "ar" && event.title_ar ? event.title_ar : event.title

  const getDescription = (event: Event) =>
    locale === "ar" && event.description_ar ? event.description_ar : event.description

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="main" className="flex-1 pt-20">
        <section className="py-16 px-6 bg-gradient-to-b from-white to-primary/10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              {t.events.pageTitle}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t.events.pageSubtitle}
            </p>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-5xl mx-auto">
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">{t.events.loading}</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20">
                <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground">{t.events.noEvents}</p>
              </div>
            ) : (
              <div className="space-y-8">
                {events.map((event) => {
                  const detailPath = `/veranstaltungen/${event.id}`
                  const registration = (event.registration_forms || []).find((f) => f.is_active)
                  const closed = registration?.closes_at
                    ? new Date(registration.closes_at).getTime() < Date.now()
                    : false

                  return (
                    <article
                      key={event.id}
                      className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Bilder-Galerie */}
                      {event.image_urls && event.image_urls.length > 0 && (
                        <EventImageGallery images={event.image_urls} alt={getTitle(event)} />
                      )}
                      {/* Videos */}
                      {event.video_urls && event.video_urls.length > 0 && (
                        <div className="px-6 md:px-8 pt-6 space-y-4">
                          {event.video_urls.map((url, i) => (
                            <video
                              key={i}
                              src={url}
                              controls
                              muted
                              playsInline
                              className="w-full max-h-[500px] rounded-lg bg-black"
                              preload="none"
                            />
                          ))}
                        </div>
                      )}
                      <div className="p-6 md:p-8">
                        <div className="flex items-center gap-2 text-primary mb-3">
                          <CalendarDays className="h-4 w-4" />
                          <time dateTime={event.date} className="text-sm font-medium">
                            {formatDate(event.date)}
                          </time>
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-3">
                          <Link href={detailPath} className="hover:text-primary transition-colors">
                            {getTitle(event)}
                          </Link>
                        </h2>
                        {/* In der Liste nur ein Ausschnitt — der volle Text steht auf der
                            Detailseite. Sonst wird die Liste auf dem Handy kilometerlang. */}
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-6">
                          {getDescription(event)}
                        </p>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                          {/* Anmeldung, sofern ein aktives Formular verknuepft ist */}
                          {registration && (
                            closed ? (
                              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                <ClipboardList className="h-4 w-4" />
                                {t.events.registrationClosed}
                              </span>
                            ) : (
                              <Button asChild className="gap-2">
                                <Link href={`/formulare/${registration.slug}`}>
                                  <ClipboardList className="h-4 w-4" />
                                  {t.events.register}
                                </Link>
                              </Button>
                            )
                          )}
                          <Button asChild variant="outline" size="sm" className="gap-2">
                            <Link href={detailPath}>
                              {t.events.details}
                              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                            </Link>
                          </Button>
                          <ShareButton title={getTitle(event)} text={t.events.shareText} url={detailPath} />
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
