"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"

export default function ImpressumPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t.impressum.pageTitle}
            </h1>
          </div>
        </section>

        <section className="py-16 px-6 bg-background">
          <div className="max-w-4xl mx-auto prose prose-neutral dark:prose-invert">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8">
              <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                {t.impressum.gruendungshinweis}
              </p>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-4">{t.impressum.angaben}</h2>
            <div className="mb-8">
              <p className="text-lg font-semibold text-foreground">{t.impressum.name}</p>
              <p className="text-muted-foreground font-medium">{t.impressum.alwadi}</p>
              <p className="text-muted-foreground">{t.impressum.address}</p>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-4">{t.impressum.contact}</h2>
            <div className="mb-8">
              <p className="text-muted-foreground">{t.impressum.email}</p>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-4">{t.impressum.responsible}</h2>
            <div className="mb-8">
              <p className="text-muted-foreground">{t.impressum.responsibleNote}</p>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-4">{t.impressum.disclaimer}</h2>

            <h3 className="text-xl font-semibold text-foreground mb-2">{t.impressum.disclaimerContent}</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">{t.impressum.disclaimerText}</p>

            <h3 className="text-xl font-semibold text-foreground mb-2">{t.impressum.linksTitle}</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">{t.impressum.linksText}</p>

            <h3 className="text-xl font-semibold text-foreground mb-2">{t.impressum.copyrightTitle}</h3>
            <p className="text-muted-foreground leading-relaxed">{t.impressum.copyrightText}</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
