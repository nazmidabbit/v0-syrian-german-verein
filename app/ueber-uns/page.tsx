"use client"

import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Users, Target, Handshake } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export default function UeberUnsPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center">
          <div className="absolute inset-0">
            <Image
              src="/images/saarbruecker-schloss.png"
              alt="Saarbruecker Schloss"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-foreground/60" />
          </div>
          <div className="relative z-10 text-center px-6">
            <h1 className="text-4xl md:text-5xl font-bold text-background mb-4">
              {t.about.pageTitle}
            </h1>
          </div>
        </section>

        {/* About Section */}
        <section className="py-20 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="bg-secondary p-8 md:p-12 rounded-2xl mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                {t.about.whoWeAre}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t.about.whoWeAreText}
              </p>
            </div>

            {/* Values */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{t.about.community}</h3>
                <p className="text-muted-foreground">{t.about.communityText}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{t.about.integration}</h3>
                <p className="text-muted-foreground">{t.about.integrationText}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Handshake className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{t.about.cooperation}</h3>
                <p className="text-muted-foreground">{t.about.cooperationText}</p>
              </div>
            </div>

            {/* History */}
            <div className="bg-muted p-8 md:p-12 rounded-2xl">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                {t.about.history}
              </h2>
              <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                {t.about.historyText1}
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t.about.historyText2}
              </p>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {t.about.team}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t.about.teamText}
            </p>
            <p className="text-muted-foreground">
              {t.about.teamSoon}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
