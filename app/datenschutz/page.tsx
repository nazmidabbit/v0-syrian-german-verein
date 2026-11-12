"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"

export default function DatenschutzPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="main" className="flex-1 pt-20">
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t.datenschutz.pageTitle}
            </h1>
            <p className="text-sm text-muted-foreground">{t.datenschutz.stand}</p>
          </div>
        </section>

        <section className="py-16 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              {t.datenschutz.intro}
            </p>

            <div className="space-y-10">
              {t.datenschutz.sections.map((section) => (
                <div key={section.title}>
                  <h2 className="text-2xl font-bold text-foreground mb-3">{section.title}</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{section.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
