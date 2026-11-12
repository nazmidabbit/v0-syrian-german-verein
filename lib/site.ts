import type { Metadata } from "next"

// Zentrale Angaben zur Seite — einmal hier, damit Titel, Adresse und Links
// nicht in zwanzig Dateien auseinanderlaufen.
export const SITE_NAME = "Syrische Gemeinschaft im Saarland"
export const SITE_NAME_AR = "تجمع السوريين في زارلاند"
export const SITE_SHORT = "SGIS"
export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "https://sygs.de").replace(/\/+$/, "")
export const CONTACT_EMAIL = "info@sygs.de"
export const ADDRESS = "Breite Straße 28, 66115 Saarbrücken"
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`

// Soziale Kanaele kommen aus der Umgebung; ohne Eintrag wird das Symbol
// gar nicht gezeigt — besser als ein Link ins Leere.
export const SOCIAL = {
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || "",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL || "",
}

export const DEFAULT_DESCRIPTION =
  "Verein syrischer Familien und Einzelpersonen im Saarland: Veranstaltungen, Beratung, kultureller Austausch und Mitgliedschaft. تجمع السوريين في زارلاند — فعاليات، دعم، وتبادل ثقافي."

interface PageMeta {
  title: string
  description: string
  path: string
  // Interne Seiten (Login, Admin, Aufgaben) sollen nicht in Suchmaschinen landen
  noindex?: boolean
}

// Metadaten fuer eine Unterseite. Die Seiten selbst sind Client-Komponenten
// und koennen keine Metadaten exportieren — deshalb liegt pro Route ein
// kleines layout.tsx daneben, das diese Funktion aufruft.
export function pageMetadata({ title, description, path, noindex }: PageMeta): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: "de_DE",
      images: [{ url: "/images/logo.png", width: 1024, height: 1024, alt: SITE_NAME }],
    },
  }
}
