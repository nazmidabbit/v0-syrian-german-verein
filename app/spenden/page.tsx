"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Heart, Building2, Banknote, Receipt, ArrowRight, Check } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export default function SpendenPage() {
  const { t } = useLanguage()

  const usages = [t.donate.usage1, t.donate.usage2, t.donate.usage3, t.donate.usage4]

  const bankRows: { label: string; value: string }[] = [
    { label: t.donate.bankHolder, value: t.donate.bankHolderValue },
    { label: t.donate.bankIban, value: t.donate.bankIbanValue },
    { label: t.donate.bankBic, value: t.donate.bankBicValue },
    { label: t.donate.bankPurpose, value: t.donate.bankPurposeValue },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t.donate.pageTitle}
            </h1>
            <p className="text-xl text-muted-foreground">{t.donate.pageSubtitle}</p>
          </div>
        </section>

        {/* Intro */}
        <section className="py-16 px-6 bg-background">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">{t.donate.introTitle}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">{t.donate.introText}</p>
          </div>
        </section>

        {/* Usage */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground text-center mb-10">
              {t.donate.usageTitle}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {usages.map((u) => (
                <li key={u} className="flex items-start gap-3 bg-background rounded-xl p-5 shadow-sm">
                  <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-foreground leading-relaxed">{u}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Bank details */}
        <section className="py-16 px-6 bg-background">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex w-12 h-12 bg-primary/10 rounded-full items-center justify-center mb-3">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3">{t.donate.bankTitle}</h2>
              <p className="text-sm text-muted-foreground italic max-w-xl mx-auto">
                {t.donate.bankNote}
              </p>
            </div>

            <div className="bg-secondary rounded-2xl p-6 sm:p-8 divide-y divide-border">
              {bankRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {row.label}
                  </p>
                  <p className="sm:col-span-2 text-foreground font-medium break-all">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Receipt */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-3xl mx-auto bg-background rounded-2xl p-8 flex gap-5">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{t.donate.receiptTitle}</h3>
              <p className="text-muted-foreground leading-relaxed">{t.donate.receiptText}</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 bg-primary text-primary-foreground">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex w-14 h-14 bg-primary-foreground/10 rounded-full items-center justify-center mb-4">
              <Banknote className="h-7 w-7" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.donate.ctaTitle}</h2>
            <p className="text-lg opacity-90 mb-8">{t.donate.ctaText}</p>
            <Button asChild size="lg" variant="secondary" className="gap-2">
              <Link href="/kontakt">
                {t.donate.ctaButton}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
