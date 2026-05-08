"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { ScrollText, Info } from "lucide-react"

export default function SatzungPage() {
  const { t } = useLanguage()

  const paragraphs = [
    t.statutes.p1,
    t.statutes.p2,
    t.statutes.p3,
    t.statutes.p4,
    t.statutes.p5,
    t.statutes.p6,
    t.statutes.p7,
    t.statutes.p8,
    t.statutes.p9,
    t.statutes.p10,
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
              <ScrollText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t.statutes.pageTitle}
            </h1>
            <p className="text-xl text-muted-foreground">{t.statutes.pageSubtitle}</p>
          </div>
        </section>

        {/* Intro */}
        <section className="py-12 px-6 bg-background">
          <div className="max-w-3xl mx-auto">
            <p className="text-lg text-muted-foreground leading-relaxed text-center">
              {t.statutes.introText}
            </p>
          </div>
        </section>

        {/* Notice */}
        <section className="py-6 px-6 bg-background">
          <div className="max-w-3xl mx-auto bg-primary/5 border border-primary/20 rounded-2xl p-6 flex gap-4">
            <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center flex-shrink-0">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{t.statutes.noticeTitle}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t.statutes.noticeText}
              </p>
            </div>
          </div>
        </section>

        {/* TOC */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              {t.statutes.tocTitle}
            </h2>
            <ol className="bg-background rounded-2xl divide-y divide-border overflow-hidden">
              {paragraphs.map((p) => (
                <li key={p} className="px-6 py-4 text-foreground font-medium">
                  {p}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Purpose excerpt */}
        <section className="py-16 px-6 bg-background">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              {t.statutes.purposeTitle}
            </h2>
            <blockquote className="border-l-4 border-primary pl-6 py-2 italic text-lg text-foreground/90 leading-relaxed">
              {t.statutes.purposeText}
            </blockquote>
          </div>
        </section>

        {/* Contact */}
        <section className="py-12 px-6 bg-secondary">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-muted-foreground">
              {t.statutes.contactText}{" "}
              <a href="mailto:info@sygs.de" className="text-primary font-medium hover:underline">
                info@sygs.de
              </a>
              .
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
