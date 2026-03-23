"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

interface Event {
  id: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  date: string
  image_urls: string[]
  video_urls: string[]
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
    return date.toLocaleDateString(locale === "ar" ? "ar-SA" : "de-DE", {
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

      <main className="flex-1 pt-20">
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
                {events.map((event) => (
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
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full max-h-[500px] rounded-lg bg-black"
                            preload="metadata"
                          />
                        ))}
                      </div>
                    )}
                    <div className="p-6 md:p-8">
                      <div className="flex items-center gap-2 text-primary mb-3">
                        <CalendarDays className="h-4 w-4" />
                        <time className="text-sm font-medium">
                          {formatDate(event.date)}
                        </time>
                      </div>
                      <h2 className="text-2xl font-bold text-foreground mb-3">
                        {getTitle(event)}
                      </h2>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                        {getDescription(event)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function EventImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [current, setCurrent] = useState(0)

  if (images.length === 1) {
    return (
      <div className="relative w-full flex justify-center bg-muted">
        <Image src={images[0]} alt={alt} width={800} height={600} className="object-contain max-h-[500px] w-auto" />
      </div>
    )
  }

  return (
    <div className="relative group bg-muted flex justify-center">
      <Image src={images[current]} alt={`${alt} ${current + 1}`} width={800} height={600} className="object-contain max-h-[500px] w-auto" />

      {/* Navigation */}
      <button
        onClick={() => setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/50"}`}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
        {current + 1} / {images.length}
      </div>
    </div>
  )
}
