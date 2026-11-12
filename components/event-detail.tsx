"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { EventImageGallery } from "@/components/event-image-gallery"
import { ShareButton } from "@/components/share-button"
import { useLanguage } from "@/components/language-provider"
import { buildEventIcs, downloadIcs } from "@/lib/ics"
import { SITE_URL } from "@/lib/site"
import { ArrowLeft, CalendarDays, CalendarPlus, ClipboardList, MessageCircle } from "lucide-react"

export interface EventDetailData {
  id: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  date: string
  image_urls: string[] | null
  video_urls: string[] | null
  registration_forms?: { slug: string; is_active: boolean; closes_at: string | null }[] | null
}

// Detailseite einer Veranstaltung. Die Daten kommen vom Server (fuer die
// Vorschau beim Teilen); die Darstellung folgt der gewaehlten Sprache.
export function EventDetail({ event }: { event: EventDetailData }) {
  const { t, locale } = useLanguage()

  const title = locale === "ar" && event.title_ar ? event.title_ar : event.title
  const description = locale === "ar" && event.description_ar ? event.description_ar : event.description
  const images = event.image_urls || []
  const videos = event.video_urls || []
  const path = `/veranstaltungen/${event.id}`
  const absoluteUrl = `${SITE_URL}${path}`

  const formattedDate = new Date(event.date).toLocaleDateString(locale === "ar" ? "ar-SY-u-nu-latn" : "de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const registration = (event.registration_forms || []).find((form) => form.is_active)
  const registrationClosed = registration?.closes_at
    ? new Date(registration.closes_at).getTime() < Date.now()
    : false

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${t.events.shareText} ${title}\n${absoluteUrl}`)}`

  const saveToCalendar = () => {
    const ics = buildEventIcs({
      uid: event.id,
      title,
      description: `${description}\n\n${absoluteUrl}`,
      date: event.date,
      url: absoluteUrl,
    })
    downloadIcs(`${event.title.replace(/[^\w؀-ۿ-]+/g, "-").slice(0, 60) || "veranstaltung"}.ics`, ics)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="main" className="flex-1 pt-20">
        <section className="py-10 px-6 bg-gradient-to-b from-white to-primary/10">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/veranstaltungen"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t.events.backToEvents}
            </Link>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full mb-4">
              <CalendarDays className="h-4 w-4" />
              <time dateTime={event.date} className="text-sm font-semibold">
                {formattedDate}
              </time>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">{title}</h1>
            {locale === "de" && event.title_ar && (
              <p dir="rtl" className="mt-2 text-xl text-muted-foreground">
                {event.title_ar}
              </p>
            )}
            {locale === "ar" && event.title_ar && event.title !== event.title_ar && (
              <p dir="ltr" className="mt-2 text-xl text-muted-foreground">
                {event.title}
              </p>
            )}
          </div>
        </section>

        <section className="py-10 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <article className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
              {images.length > 0 && <EventImageGallery images={images} alt={title} />}

              {videos.length > 0 && (
                <div className="px-6 md:px-8 pt-6 space-y-4">
                  {videos.map((url, i) => (
                    <video
                      key={i}
                      src={url}
                      controls
                      muted
                      playsInline
                      className="w-full max-h-[500px] rounded-lg bg-black"
                      preload="metadata"
                    />
                  ))}
                </div>
              )}

              <div className="p-6 md:p-8">
                <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">{description}</p>

                {registration && (
                  <div className="mt-8">
                    {registrationClosed ? (
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <ClipboardList className="h-4 w-4" />
                        {t.events.registrationClosed}
                      </span>
                    ) : (
                      <Button asChild size="lg" className="gap-2">
                        <Link href={`/formulare/${registration.slug}`}>
                          <ClipboardList className="h-5 w-5" />
                          {t.events.register}
                        </Link>
                      </Button>
                    )}
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center gap-3">
                  <ShareButton title={title} text={t.events.shareText} url={path} />
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={saveToCalendar}>
                    <CalendarPlus className="h-4 w-4" />
                    {t.events.addToCalendar}
                  </Button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
