"use client"

import React from "react"
import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, Phone, MapPin, Facebook, Instagram, Send } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export default function KontaktPage() {
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const { t } = useLanguage()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormStatus("sending")
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setFormStatus("sent")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t.contact.pageTitle}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t.contact.pageSubtitle}
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-20 px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Info */}
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                  {t.contact.getInTouch}
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  {t.contact.getInTouchText}
                </p>

                <div className="flex flex-col gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{t.contact.email}</h3>
                      <a
                        href="mailto:info@sygs.de"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        info@sygs.de
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{t.contact.phone}</h3>
                      <p className="text-muted-foreground">{t.contact.phoneValue}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{t.contact.location}</h3>
                      <p className="text-muted-foreground">{t.contact.locationValue}</p>
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div className="mt-10">
                  <h3 className="font-semibold text-foreground mb-4">{t.contact.followUs}</h3>
                  <div className="flex gap-4">
                    <a
                      href="https://www.facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      aria-label="Facebook"
                    >
                      <Facebook className="h-5 w-5" />
                    </a>
                    <a
                      href="https://www.instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      aria-label="Instagram"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-secondary p-8 rounded-2xl">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {t.contact.writeUs}
                </h2>

                {formStatus === "sent" ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {t.contact.sent}
                    </h3>
                    <p className="text-muted-foreground">
                      {t.contact.sentText}
                    </p>
                    <Button onClick={() => setFormStatus("idle")} variant="outline" className="mt-6">
                      {t.contact.newMessage}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="firstName">{t.contact.firstName}</Label>
                        <Input id="firstName" name="firstName" required />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="lastName">{t.contact.lastName}</Label>
                        <Input id="lastName" name="lastName" required />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="email">{t.contact.emailLabel}</Label>
                      <Input id="email" name="email" type="email" required />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="subject">{t.contact.subject}</Label>
                      <Input
                        id="subject"
                        name="subject"
                        placeholder={t.contact.subjectPlaceholder}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="message">{t.contact.message}</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder={t.contact.messagePlaceholder}
                        rows={5}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={formStatus === "sending"}>
                      {formStatus === "sending" ? t.contact.sending : t.contact.send}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
