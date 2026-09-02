import type { MetadataRoute } from "next"

// Wird von Next unter /manifest.webmanifest ausgeliefert und automatisch
// im <head> verlinkt. Erst damit bieten Android und iOS "Zum Startbildschirm".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Syrische Gemeinschaft im Saarland",
    short_name: "SGIS",
    description:
      "Veranstaltungen, Nachrichten, Mitgliedschaft und Aufgaben der Syrischen Gemeinschaft im Saarland",
    // Startet die App auf der Startseite; ?source=pwa macht Aufrufe
    // aus der installierten App in der Statistik unterscheidbar
    start_url: "/?source=pwa",
    scope: "/",
    // standalone = eigenes Fenster ohne Browser-Adressleiste
    display: "standalone",
    orientation: "portrait",
    background_color: "#fcfcfc",
    theme_color: "#006911",
    lang: "de",
    dir: "auto",
    categories: ["social", "education", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Android beschneidet zu Kreis/Squircle - dieses Icon hat den Rand dafuer
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Langes Druecken auf das App-Symbol zeigt diese Direkteinstiege
    shortcuts: [
      {
        name: "Veranstaltungen",
        url: "/veranstaltungen",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Meine Aufgaben",
        url: "/aufgaben",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Kontakt",
        url: "/kontakt",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  }
}
