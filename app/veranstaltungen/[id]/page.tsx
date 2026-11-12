import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { SITE_NAME } from "@/lib/site"
import { EventDetail, type EventDetailData } from "@/components/event-detail"

// Eigene Seite je Veranstaltung mit Vorschau beim Teilen (Open Graph):
// Wer den Link in WhatsApp oder Telegram schickt, sieht Titel, Datum und Bild.
// Immer frisch aus der Datenbank, damit Aenderungen aus dem Admin sofort gelten.
export const dynamic = "force-dynamic"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// cache(): Metadaten und Seite fragen dieselbe Veranstaltung nur einmal ab
const loadEvent = cache(async (id: string): Promise<EventDetailData | null> => {
  if (!UUID.test(id)) return null
  const supabase = getSupabase()

  // Verknuepftes Anmeldeformular mitladen; ohne event-registration.sql
  // gibt es die Verknuepfung nicht — dann ohne sie laden.
  const withForms = await supabase
    .from("events")
    .select("*, registration_forms:forms!forms_event_id_fkey(slug, is_active, closes_at)")
    .eq("id", id)
    .maybeSingle()
  if (!withForms.error) return (withForms.data as EventDetailData | null) ?? null

  const plain = await supabase.from("events").select("*").eq("id", id).maybeSingle()
  return (plain.data as EventDetailData | null) ?? null
})

function snippet(text: string, max = 160): string {
  const clean = (text || "").replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trimEnd()}…`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const event = await loadEvent(id)
  if (!event) {
    return { title: "Veranstaltung nicht gefunden", robots: { index: false, follow: false } }
  }

  const path = `/veranstaltungen/${event.id}`
  const ogTitle = event.title_ar ? `${event.title} · ${event.title_ar}` : event.title
  const description = `${formatDate(event.date)} · ${snippet(event.description)}`
  const image = event.image_urls?.[0] || "/images/logo.png"
  const hasOwnImage = image !== "/images/logo.png"

  return {
    title: event.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: `${ogTitle} | ${SITE_NAME}`,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "de_DE",
      images: [{ url: image, alt: event.title }],
    },
    twitter: {
      card: hasOwnImage ? "summary_large_image" : "summary",
      title: event.title,
      description,
      images: [image],
    },
  }
}

export default async function EventPage({ params }: Params) {
  const { id } = await params
  const event = await loadEvent(id)
  if (!event) notFound()

  return <EventDetail event={event} />
}
