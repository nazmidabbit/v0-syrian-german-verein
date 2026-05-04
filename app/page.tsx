"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ImageGallery } from "@/components/image-gallery"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, Heart, MapPin, CalendarDays, Vote } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

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

interface ActiveElection {
  id: string
  title: string
  title_ar: string
  ends_at: string
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, isVisible }
}

export default function HomePage() {
  const { t, locale } = useLanguage()
  const [events, setEvents] = useState<Event[]>([])
  const [activeElection, setActiveElection] = useState<ActiveElection | null>(null)

  useEffect(() => {
    fetch("/api/events?limit=5")
      .then((res) => res.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => setEvents([]))

    fetch("/api/elections?active=1")
      .then((res) => res.json())
      .then((data) => setActiveElection((data.elections && data.elections[0]) || null))
      .catch(() => setActiveElection(null))
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === "ar" ? "ar-SA" : "de-DE", {
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
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center min-h-[40vh] py-6 sm:py-10 px-6 bg-gradient-to-b from-white to-primary/5">
          <h1 className="sr-only" dir={locale === "ar" ? "rtl" : undefined}>
            {locale === "ar" ? t.hero.titleAr : t.hero.title}
          </h1>
          <Image
            src={locale === "ar" ? "/Title_ar.png" : "/Title_de.png"}
            alt={locale === "ar" ? t.hero.titleAr : t.hero.title}
            width={900}
            height={600}
            priority
            className="w-full max-w-md sm:max-w-lg md:max-w-xl h-auto drop-shadow-lg mt-6 sm:mt-12"
          />
        </section>

        {/* Active Election Banner */}
        {activeElection && (
          <section className="px-6 py-8 bg-primary/5 border-y border-primary/20">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
                <Vote className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs uppercase tracking-wide font-semibold text-primary/80">
                  {t.election.homeBannerTitle}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-1">
                  {locale === "ar" && activeElection.title_ar
                    ? activeElection.title_ar
                    : activeElection.title}
                </h2>
              </div>
              <Button asChild size="lg" className="gap-2 shrink-0">
                <Link href={`/wahlen/${activeElection.id}`}>
                  {t.election.homeBannerCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        )}

        {/* Latest Events Section */}
        {events.length > 0 && <LatestEvents events={events} t={t} locale={locale} formatDate={formatDate} getTitle={getTitle} getDescription={getDescription} />}

        {/* Welcome Section */}
        <section className="py-20 px-6 bg-background">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {t.welcome.title}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t.welcome.text}
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6 bg-secondary">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
              {t.features.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background p-8 rounded-xl shadow-sm text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">{t.features.community.title}</h3>
                <p className="text-muted-foreground">{t.features.community.text}</p>
              </div>
              <div className="bg-background p-8 rounded-xl shadow-sm text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">{t.features.support.title}</h3>
                <p className="text-muted-foreground">{t.features.support.text}</p>
              </div>
              <div className="bg-background p-8 rounded-xl shadow-sm text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">{t.features.homeland.title}</h3>
                <p className="text-muted-foreground">{t.features.homeland.text}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery Section */}
        <section className="py-20 px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {t.gallery.title}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t.gallery.subtitle}
              </p>
            </div>
            <ImageGallery />
            <p className="text-sm text-muted-foreground text-center mt-4 italic">
              {t.gallery.aiNotice}
            </p>
            <div className="text-center mt-6">
              <Button asChild variant="outline" size="lg">
                <Link href="/galerie">{t.gallery.fullGallery}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t.cta.title}
            </h2>
            <p className="text-lg opacity-90 mb-8">
              {t.cta.text}
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/kontakt">{t.cta.button}</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function LatestEvents({
  events,
  t,
  locale,
  formatDate,
  getTitle,
  getDescription,
}: {
  events: Event[]
  t: any
  locale: string
  formatDate: (d: string) => string
  getTitle: (e: Event) => string
  getDescription: (e: Event) => string
}) {
  const header = useInView(0.2)

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-background to-secondary/30 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Animated Header */}
        <div
          ref={header.ref}
          className={`text-center mb-14 transition-all duration-700 ${header.isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
            }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t.events.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.events.subtitle}
          </p>
        </div>

        {/* Animated Event Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.slice(0, 5).map((event, index) => (
            <AnimatedEventCard
              key={event.id}
              event={event}
              index={index}
              formatDate={formatDate}
              getTitle={getTitle}
              getDescription={getDescription}
            />
          ))}
        </div>

        {/* Animated Button */}
        <div
          className={`text-center mt-12 transition-all duration-700 delay-500 ${header.isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
            }`}
        >
          <Button asChild variant="outline" size="lg" className="rounded-full px-8 hover:scale-105 transition-transform">
            <Link href="/veranstaltungen">{t.events.allEvents}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function AnimatedEventCard({
  event,
  index,
  formatDate,
  getTitle,
  getDescription,
}: {
  event: Event
  index: number
  formatDate: (d: string) => string
  getTitle: (e: Event) => string
  getDescription: (e: Event) => string
}) {
  const card = useInView(0.1)

  return (
    <div
      ref={card.ref}
      className={`group bg-background border border-border rounded-2xl overflow-hidden shadow-sm transition-all duration-700 ${card.isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-12"
        }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {/* Video (Autoplay, dauerhaft) — wenn vorhanden, sonst Bild */}
      {event.video_urls && event.video_urls.length > 0 ? (
        <div className="relative bg-black overflow-hidden">
          <video
            src={event.video_urls[0]}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full max-h-[250px] object-contain bg-black"
          />
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
        </div>
      ) : event.image_urls && event.image_urls.length > 0 ? (
        <div className="relative bg-muted overflow-hidden">
          <div className="flex justify-center transition-transform duration-500 group-hover:scale-105">
            <Image
              src={event.image_urls[0]}
              alt={getTitle(event)}
              width={400}
              height={300}
              className="object-contain max-h-[250px] w-auto"
            />
          </div>
          {event.image_urls.length > 1 && (
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
              {event.image_urls.length} Bilder
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/20 to-transparent" />
        </div>
      ) : null}

      <div className="p-6">
        {/* Date badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full mb-3">
          <CalendarDays className="h-3.5 w-3.5" />
          <time className="text-xs font-semibold">
            {formatDate(event.date)}
          </time>
        </div>

        <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
          {getTitle(event)}
        </h3>
        <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
          {getDescription(event)}
        </p>

        {/* Hover line */}
        <div className="mt-4 h-0.5 bg-primary/20 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500 w-0 group-hover:w-full" />
        </div>
      </div>
    </div>
  )
}
