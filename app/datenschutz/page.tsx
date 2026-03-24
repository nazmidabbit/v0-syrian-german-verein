"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"

export default function DatenschutzPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t.datenschutz.pageTitle}
            </h1>
          </div>
        </section>

        <section className="py-16 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              {t.datenschutz.intro}
            </p>

            <div className="space-y-10">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{t.datenschutz.responsibleTitle}</h2>
                <p className="text-muted-foreground mb-1">{t.datenschutz.responsibleText}</p>
                <p className="text-foreground font-medium">{t.datenschutz.responsibleName}</p>
                <p className="text-muted-foreground">{t.datenschutz.responsibleEmail}</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{t.datenschutz.dataCollectionTitle}</h2>
                <p className="text-muted-foreground leading-relaxed">{t.datenschutz.dataCollectionText}</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{t.datenschutz.contactFormTitle}</h2>
                <p className="text-muted-foreground leading-relaxed">{t.datenschutz.contactFormText}</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{t.datenschutz.cookiesTitle}</h2>
                <p className="text-muted-foreground leading-relaxed">{t.datenschutz.cookiesText}</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{t.datenschutz.rightsTitle}</h2>
                <p className="text-muted-foreground leading-relaxed">{t.datenschutz.rightsText}</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{t.datenschutz.hostingTitle}</h2>
                <p className="text-muted-foreground leading-relaxed">{t.datenschutz.hostingText}</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{t.datenschutz.supabaseTitle}</h2>
                <p className="text-muted-foreground leading-relaxed">{t.datenschutz.supabaseText}</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{t.datenschutz.changesTitle}</h2>
                <p className="text-muted-foreground leading-relaxed">{t.datenschutz.changesText}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
