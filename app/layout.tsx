import React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { LanguageProvider } from "@/components/language-provider"
import { CookieConsent } from "@/components/cookie-consent"
import { InstallApp } from "@/components/install-app"
import { PwaRegister } from "@/components/pwa-register"
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_NAME_AR, SITE_SHORT, SITE_URL } from "@/lib/site"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const _notoArabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic" })

export const metadata: Metadata = {
  // Macht relative Bild- und Seitenpfade in Open Graph zu absoluten Adressen
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "Syrische Gemeinschaft",
    "Saarland",
    "Saarbrücken",
    "Verein",
    "Integration",
    "Syrer im Saarland",
    "تجمع السوريين",
    "زارلاند",
  ],
  applicationName: SITE_SHORT,
  alternates: { canonical: "/" },
  // Vorschau beim Teilen in WhatsApp, Facebook, Telegram
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "de_DE",
    alternateLocale: ["ar_SY"],
    url: "/",
    title: `${SITE_NAME} — ${SITE_NAME_AR}`,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: "/images/logo.png", width: 1024, height: 1024, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: ["/images/logo.png"],
  },
  robots: { index: true, follow: true },
  // Ohne diese Angaben startet iOS die Seite im Browser statt als App
  appleWebApp: {
    capable: true,
    title: SITE_SHORT,
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    // Next setzt nur den neuen Namen "mobile-web-app-capable"; aeltere
    // iOS-Fassungen starten die App nur mit dem apple-Praefix ohne Browserleiste
    "apple-mobile-web-app-capable": "yes",
  },
}

export const viewport: Viewport = {
  // Faerbt unter Android die Statusleiste in der installierten App
  themeColor: "#006911",
  // Nutzt auf iPhones mit Aussparung die volle Bildschirmflaeche
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" dir="ltr" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {/* Sprunglink fuer Tastatur und Screenreader: erst beim Fokussieren sichtbar */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-primary"
        >
          Zum Inhalt springen · الانتقال إلى المحتوى
        </a>
        <LanguageProvider>
          {children}
          <CookieConsent />
          <InstallApp />
        </LanguageProvider>
        <PwaRegister />
        <Analytics />
      </body>
    </html>
  )
}
