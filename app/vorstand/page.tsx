"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { UserCircle2, Info } from "lucide-react"

export default function VorstandPage() {
  const { t } = useLanguage()

  const roles = [
    { title: t.board.role1Title, desc: t.board.role1Desc },
    { title: t.board.role2Title, desc: t.board.role2Desc },
    { title: t.board.role3Title, desc: t.board.role3Desc },
    { title: t.board.role4Title, desc: t.board.role4Desc },
    { title: t.board.role5Title, desc: t.board.role5Desc },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t.board.pageTitle}
            </h1>
            <p className="text-xl text-muted-foreground">{t.board.pageSubtitle}</p>
          </div>
        </section>

        {/* Intro */}
        <section className="py-16 px-6 bg-background">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg text-muted-foreground leading-relaxed">{t.board.introText}</p>
          </div>
        </section>

        {/* Roles */}
        <section className="py-12 px-6 bg-background">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.map((role) => (
              <div
                key={role.title}
                className="bg-secondary rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <UserCircle2 className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">{role.title}</h3>
                <p className="text-sm text-primary font-medium italic mb-4">{t.board.tbd}</p>
                <p className="text-muted-foreground leading-relaxed">{role.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Notice */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-3xl mx-auto bg-background rounded-2xl p-8 flex gap-5">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Info className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{t.board.noticeTitle}</h3>
              <p className="text-muted-foreground leading-relaxed">{t.board.noticeText}</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
