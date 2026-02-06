"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ImageGallery } from "@/components/image-gallery"
import { useLanguage } from "@/components/language-provider"

export default function GaleriePage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t.gallery.pageTitle}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t.gallery.pageSubtitle}
            </p>
          </div>
        </section>

        {/* Gallery Section */}
        <section className="py-20 px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <ImageGallery />
          </div>
        </section>

        {/* Info Section */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {t.gallery.saarlandTitle}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t.gallery.saarlandText}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
