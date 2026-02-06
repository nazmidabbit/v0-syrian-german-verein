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
        <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center">
          <div className="absolute inset-0">
            <Image
              src="/images/saarschleife.png"
              alt="Saarschleife - Das Wahrzeichen des Saarlandes"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-foreground/50" />
          </div>

          <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <Image
                src="/images/logo.jpg"
                alt="Logo der Syrischen Gemeinschaft"
                width={120}
                height={120}
                className="rounded-xl shadow-lg"
              />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-background mb-4 text-balance">
              {t.hero.title}
            </h1>
            {locale === "de" && (
              <p className="text-2xl md:text-3xl text-background/90 mb-4" dir="rtl">
                {t.hero.titleAr}
              </p>
            )}
            <div className="flex justify-center gap-2 text-accent mb-8">
              <span className="text-2xl">&#9733;</span>
              <span className="text-2xl">&#9733;</span>
              <span className="text-2xl">&#9733;</span>
            </div>
            <p className="text-lg md:text-xl text-background/80 mb-8">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/ueber-uns">
                  {t.hero.cta} <ArrowRight className="h-4 w-4 ms-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-background text-background hover:bg-background hover:text-foreground bg-transparent"
              >
                <Link href="/kontakt">{t.hero.ctaContact}</Link>
              </Button>
            </div>
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
