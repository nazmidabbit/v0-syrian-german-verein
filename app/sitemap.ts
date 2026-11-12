import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"
import { getSupabase } from "@/lib/supabase"

// Wird unter /sitemap.xml ausgeliefert. Statische Seiten plus eine Seite je
// Veranstaltung — so finden Suchmaschinen auch aeltere Veranstaltungen.
export const revalidate = 3600

type Frequency = "daily" | "weekly" | "monthly" | "yearly"

const STATIC_PAGES: { path: string; priority: number; changeFrequency: Frequency }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/veranstaltungen", priority: 0.9, changeFrequency: "daily" },
  { path: "/nachrichten", priority: 0.8, changeFrequency: "weekly" },
  { path: "/ueber-uns", priority: 0.8, changeFrequency: "monthly" },
  { path: "/mitgliedschaft", priority: 0.8, changeFrequency: "monthly" },
  { path: "/mitgliedschaft/antrag", priority: 0.7, changeFrequency: "monthly" },
  { path: "/spenden", priority: 0.7, changeFrequency: "monthly" },
  { path: "/projekte", priority: 0.7, changeFrequency: "monthly" },
  { path: "/galerie", priority: 0.6, changeFrequency: "monthly" },
  { path: "/vorstand", priority: 0.6, changeFrequency: "monthly" },
  { path: "/satzung", priority: 0.5, changeFrequency: "yearly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/kontakt", priority: 0.7, changeFrequency: "yearly" },
  { path: "/wahlen", priority: 0.4, changeFrequency: "monthly" },
  { path: "/impressum", priority: 0.2, changeFrequency: "yearly" },
  { path: "/datenschutz", priority: 0.2, changeFrequency: "yearly" },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    priority: page.priority,
    changeFrequency: page.changeFrequency,
  }))

  // Veranstaltungen aus der Datenbank — faellt die Verbindung aus, bleibt
  // die Sitemap mit den statischen Seiten trotzdem gueltig.
  try {
    const { data } = await getSupabase()
      .from("events")
      .select("id, date, updated_at, created_at")
      .order("date", { ascending: false })
      .limit(500)

    for (const event of data || []) {
      const modified = event.updated_at || event.created_at || event.date
      entries.push({
        url: `${SITE_URL}/veranstaltungen/${event.id}`,
        lastModified: modified ? new Date(modified) : undefined,
        priority: 0.6,
        changeFrequency: "monthly",
      })
    }
  } catch {
    // ohne Datenbank nur die statischen Seiten
  }

  return entries
}
