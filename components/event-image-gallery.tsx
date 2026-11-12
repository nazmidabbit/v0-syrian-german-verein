"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Bildergalerie einer Veranstaltung: ein Bild gross, bei mehreren mit
// Pfeilen und Punkten zum Blaettern. Wird in der Liste und auf der
// Detailseite verwendet.
export function EventImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [current, setCurrent] = useState(0)

  if (images.length === 0) return null

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
        type="button"
        onClick={() => setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 transition-opacity"
        aria-label="Vorheriges Bild"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 transition-opacity"
        aria-label="Nächstes Bild"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/50"}`}
            aria-label={`Bild ${i + 1}`}
          />
        ))}
      </div>

      {/* Counter */}
      <div dir="ltr" className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
        {current + 1} / {images.length}
      </div>
    </div>
  )
}
