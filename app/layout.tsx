import React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { LanguageProvider } from "@/components/language-provider"
import { CookieConsent } from "@/components/cookie-consent"
import { InstallApp } from "@/components/install-app"
import { PwaRegister } from "@/components/pwa-register"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const _notoArabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic" })

export const metadata: Metadata = {
  title: "Syrische Gemeinschaft im Saarland",
  description:
    "Herzlich willkommen bei der Syrischen Gemeinschaft im Saarland - تجمع السوريين في زارلاند",
  generator: 'v0.app',
  applicationName: "SGIS",
  // Ohne diese Angaben startet iOS die Seite im Browser statt als App
  appleWebApp: {
    capable: true,
    title: "SGIS",
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
