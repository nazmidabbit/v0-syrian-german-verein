"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  CalendarHeart,
  HelpingHand,
  Users,
  UsersRound,
  Globe2,
  ArrowRight,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export default function ProjektePage() {
  const { t } = useLanguage()

  const projects = [
    { icon: BookOpen, title: t.projects.p1Title, text: t.projects.p1Text },
    { icon: CalendarHeart, title: t.projects.p2Title, text: t.projects.p2Text },
    { icon: HelpingHand, title: t.projects.p3Title, text: t.projects.p3Text },
    { icon: Users, title: t.projects.p4Title, text: t.projects.p4Text },
    { icon: UsersRound, title: t.projects.p5Title, text: t.projects.p5Text },
    { icon: Globe2, title: t.projects.p6Title, text: t.projects.p6Text },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t.projects.pageTitle}
            </h1>
            <p className="text-xl text-muted-foreground">{t.projects.pageSubtitle}</p>
          </div>
        </section>

        {/* Intro */}
        <section className="py-12 px-6 bg-background">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg text-muted-foreground leading-relaxed">{t.projects.introText}</p>
          </div>
        </section>

        {/* Project cards */}
        <section className="py-12 px-6 bg-background">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="bg-secondary rounded-2xl p-6 sm:p-8 transition-all hover:shadow-md hover:-translate-y-1"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 bg-primary text-primary-foreground mt-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.projects.ctaTitle}</h2>
            <p className="text-lg opacity-90 mb-8">{t.projects.ctaText}</p>
            <Button asChild size="lg" variant="secondary" className="gap-2">
              <Link href="/kontakt">
                {t.projects.ctaButton}
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
