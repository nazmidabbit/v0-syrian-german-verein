"use client"

import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ImageGallery } from "@/components/image-gallery"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, Heart, MapPin } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export default function HomePage() {
  const { t, locale } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center min-h-[60vh] py-8 sm:py-16 bg-gradient-to-b from-white to-primary/10">
          <div className="w-full flex justify-center mb-6 sm:mb-8 mt-6 sm:mt-12">
            <Image
              src="/images/ramadan-invitation.jpg"
              alt="Ramadan Einladung"
              width={320}
              height={320}
              className="rounded-2xl shadow-xl border-4 border-white bg-white w-[90vw] max-w-[350px] sm:max-w-[420px] h-auto"
              priority
            />
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-primary mb-3 sm:mb-4 drop-shadow-lg">
            {t.hero.title}
          </h1>
          {locale === "de" && (
            <p className="text-lg sm:text-2xl md:text-3xl text-primary/80 mb-3 sm:mb-4" dir="rtl">
              {t.hero.titleAr}
            </p>
          )}
          <p className="text-base sm:text-xl md:text-2xl text-muted-foreground mb-6 sm:mb-10 max-w-xs sm:max-w-2xl mx-auto">
            {t.hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center w-full px-2">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full shadow-md w-full sm:w-auto">
              <Link href="/ueber-uns">
                {t.hero.cta} <ArrowRight className="h-5 w-5 ms-2" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-primary text-primary hover:bg-primary/10 hover:text-primary-foreground bg-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full shadow-md w-full sm:w-auto"
            >
              <Link href="/kontakt">{t.hero.ctaContact}</Link>
            </Button>
          </div>
        </section>

        {/* Welcome Section */}
        <section className="py-20 px-6 bg-background">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {t.welcome.title}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t.welcome.text}
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6 bg-secondary">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
              {t.features.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background p-8 rounded-xl shadow-sm text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">{t.features.community.title}</h3>
                <p className="text-muted-foreground">{t.features.community.text}</p>
              </div>
              <div className="bg-background p-8 rounded-xl shadow-sm text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">{t.features.support.title}</h3>
                <p className="text-muted-foreground">{t.features.support.text}</p>
              </div>
              <div className="bg-background p-8 rounded-xl shadow-sm text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">{t.features.homeland.title}</h3>
                <p className="text-muted-foreground">{t.features.homeland.text}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery Section */}
        <section className="py-20 px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {t.gallery.title}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t.gallery.subtitle}
              </p>
            </div>
            <ImageGallery />
            <div className="text-center mt-10">
              <Button asChild variant="outline" size="lg">
                <Link href="/galerie">{t.gallery.fullGallery}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t.cta.title}
            </h2>
            <p className="text-lg opacity-90 mb-8">
              {t.cta.text}
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/kontakt">{t.cta.button}</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
