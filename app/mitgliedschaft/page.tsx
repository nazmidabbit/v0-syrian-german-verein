"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Users, Vote, HeartHandshake, Sparkles, ArrowRight, Mail, FileSignature, PartyPopper } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export default function MitgliedschaftPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t.membership.pageTitle}
            </h1>
            <p className="text-xl text-muted-foreground">{t.membership.pageSubtitle}</p>
          </div>
        </section>

        {/* Why join */}
        <section className="py-16 px-6 bg-background">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">{t.membership.whyJoinTitle}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">{t.membership.whyJoinText}</p>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground text-center mb-12">
              {t.membership.benefitsTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[
                { icon: Users, title: t.membership.benefit1Title, text: t.membership.benefit1Text },
                { icon: Vote, title: t.membership.benefit2Title, text: t.membership.benefit2Text },
                { icon: HeartHandshake, title: t.membership.benefit3Title, text: t.membership.benefit3Text },
                { icon: Sparkles, title: t.membership.benefit4Title, text: t.membership.benefit4Text },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="bg-background p-8 rounded-2xl shadow-sm flex gap-5">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Fees */}
        <section className="py-16 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground text-center mb-4">
              {t.membership.feesTitle}
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
              {t.membership.feesText}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              {[
                { label: t.membership.feeRegular, value: t.membership.feeRegularValue },
                { label: t.membership.feeFamily, value: t.membership.feeFamilyValue },
                { label: t.membership.feeStudent, value: t.membership.feeStudentValue },
              ].map((fee) => (
                <div key={fee.label} className="bg-secondary p-6 rounded-xl text-center">
                  <p className="text-sm uppercase tracking-wide text-muted-foreground mb-2">
                    {fee.label}
                  </p>
                  <p className="text-2xl font-bold text-primary">{fee.value}</p>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground italic text-center max-w-2xl mx-auto">
              {t.membership.feeNote}
            </p>
          </div>
        </section>

        {/* How */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground text-center mb-12">
              {t.membership.howTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Mail, title: t.membership.step1Title, text: t.membership.step1Text },
                { icon: FileSignature, title: t.membership.step2Title, text: t.membership.step2Text },
                { icon: PartyPopper, title: t.membership.step3Title, text: t.membership.step3Text },
              ].map(({ icon: Icon, title, text }, i) => (
                <div key={title} className="bg-background p-8 rounded-2xl text-center relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary rounded-full text-primary-foreground font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Notice */}
        <section className="py-10 px-6 bg-background">
          <div className="max-w-3xl mx-auto bg-primary/5 border border-primary/20 rounded-xl p-6">
            <p className="text-sm text-foreground leading-relaxed">
              {t.membership.noticeInGruendung}
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 bg-primary text-primary-foreground">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.membership.ctaTitle}</h2>
            <p className="text-lg opacity-90 mb-8">{t.membership.ctaText}</p>
            <Button asChild size="lg" variant="secondary" className="gap-2">
              <Link href="/mitgliedschaft/antrag">
                {t.membership.ctaButton}
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
