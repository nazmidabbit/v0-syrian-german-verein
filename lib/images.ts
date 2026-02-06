// Diese Datei enthält die Bild-URLs für die Webseite
// Die Bilder werden über Vercel Blob verwaltet
// Um neue Bilder hinzuzufügen, laden Sie diese über die Admin-Seite hoch

export interface SiteImage {
  id: string
  src: string
  alt: string
  title: string
  category: "gallery" | "hero" | "about"
}

// Aktuelle Bilder - Diese können später über die Admin-Seite verwaltet werden
export const galleryImages: SiteImage[] = [
  {
    id: "1",
    src: "/images/saarschleife.png",
    alt: "Saarschleife",
    title: "Saarschleife",
    category: "gallery",
  },
  {
    id: "2",
    src: "/images/ludwigskirche.png",
    alt: "Ludwigskirche",
    title: "Ludwigskirche",
    category: "gallery",
  },
  {
    id: "3",
    src: "/images/saarbruecker-schloss.png",
    alt: "Saarbrücker Schloss",
    title: "Saarbrücker Schloss",
    category: "gallery",
  },
  {
    id: "4",
    src: "/images/voelklinger-huette.png",
    alt: "Völklinger Hütte",
    title: "Völklinger Hütte",
    category: "gallery",
  },
  {
    id: "5",
    src: "/images/saar-polygon.png",
    alt: "Saar Polygon",
    title: "Saar Polygon",
    category: "gallery",
  },
  {
    id: "6",
    src: "/images/bostalsee.png",
    alt: "Bostalsee",
    title: "Bostalsee",
    category: "gallery",
  },
]

export const logoImage = {
  src: "/images/logo.jpg",
  alt: "Logo der Syrischen Gemeinschaft",
}

export const heroImage = {
  src: "/images/saarschleife.png",
  alt: "Saarschleife - Das Wahrzeichen des Saarlandes",
}
