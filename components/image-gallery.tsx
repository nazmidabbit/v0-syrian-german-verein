"use client"

import Image from "next/image"
import { useState } from "react"
import { X } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const galleryData = [
  {
    id: "1",
    src: "/images/saarschleife.png",
    alt: "Saarschleife",
    titleKey: "saarschleife" as const,
  },
  {
    id: "2",
    src: "/images/ludwigskirche.png",
    alt: "Ludwigskirche",
    titleKey: "ludwigskirche" as const,
  },
  {
    id: "3",
    src: "/images/saarbruecker-schloss.png",
    alt: "Saarbruecker Schloss",
    titleKey: "saarbrueckerSchloss" as const,
  },
  {
    id: "4",
    src: "/images/voelklinger-huette.png",
    alt: "Voelklinger Huette",
    titleKey: "voelklingerHuette" as const,
  },
  {
    id: "5",
    src: "/images/saar-polygon.png",
    alt: "Saar Polygon",
    titleKey: "saarPolygon" as const,
  },
  {
    id: "6",
    src: "/images/bostalsee.png",
    alt: "Bostalsee",
    titleKey: "bostalsee" as const,
  },
]

export function ImageGallery() {
  const [selectedImage, setSelectedImage] = useState<(typeof galleryData)[0] | null>(null)
  const { t } = useLanguage()

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {galleryData.map((image) => (
          <button
            key={image.id}
            onClick={() => setSelectedImage(image)}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted cursor-pointer"
          >
            <Image
              src={image.src || "/placeholder.svg"}
              alt={image.alt}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-foreground/80 to-transparent">
              <p className="text-background text-sm font-medium">{t.images[image.titleKey]}</p>
            </div>
          </button>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t.images[selectedImage.titleKey]}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-background hover:text-background/80 transition-colors"
            aria-label={t.gallery.close}
          >
            <X className="h-8 w-8" />
          </button>
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full">
            <Image
              src={selectedImage.src || "/placeholder.svg"}
              alt={selectedImage.alt}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-background text-lg font-medium">
            {t.images[selectedImage.titleKey]}
          </p>
        </div>
      )}
    </>
  )
}
