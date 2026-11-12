"use client"

import React from "react"
import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, Phone, MapPin, Facebook, Instagram, MessageCircle, Send, ExternalLink } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { ADDRESS, CONTACT_EMAIL, MAPS_URL, SOCIAL } from "@/lib/site"

type FormStatus = "idle" | "sending" | "sent" | "error" | "rateLimited" | "validation"

export default function KontaktPage() {
  const [formStatus, setFormStatus] = useState<FormStatus>("idle")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: "",
    // Honeypot — bleibt bei Menschen leer, Bots fuellen es aus
    website: "",
  })
  const { t, locale } = useLanguage()

  const socialLinks = [
    { href: SOCIAL.facebook, label: "Facebook", icon: Facebook },
    { href: SOCIAL.instagram, label: "Instagram", icon: Instagram },
    { href: SOCIAL.whatsapp, label: "WhatsApp", icon: MessageCircle },
  ].filter((item) => item.href)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormStatus("sending")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, locale }),
      })
      if (res.ok) {
        setFormStatus("sent")
        setFormData({ firstName: "", lastName: "", email: "", subject: "", message: "", website: "" })
      } else if (res.status === 429) {
        setFormStatus("rateLimited")
      } else if (res.status === 400 || res.status === 413 || res.status === 415) {
        setFormStatus("validation")
      } else {
        setFormStatus("error")
      }
    } catch {
      setFormStatus("error")
    }
  }

  const errorMessage =
    formStatus === "rateLimited"
      ? t.contact.rateLimited
      : formStatus === "validation"
        ? t.contact.validation
        : formStatus === "error"
          ? t.contact.error
          : ""

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="main" className="flex-1 pt-20">
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
                        href={`mailto:${CONTACT_EMAIL}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {CONTACT_EMAIL}
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
                      <p className="text-muted-foreground">{ADDRESS}</p>
                      <a
                        href={MAPS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-sm text-primary hover:underline"
                      >
                        {t.contact.route}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Social Media — nur, wenn Kanaele eingetragen sind */}
                {socialLinks.length > 0 && (
                  <div className="mt-10">
                    <h3 className="font-semibold text-foreground mb-4">{t.contact.followUs}</h3>
                    <div className="flex gap-4">
                      {socialLinks.map(({ href, label, icon: Icon }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                          aria-label={label}
                        >
                          <Icon className="h-5 w-5" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
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
                        <Input
                          id="firstName"
                          name="firstName"
                          autoComplete="given-name"
                          required
                          maxLength={100}
                          value={formData.firstName}
                          onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="lastName">{t.contact.lastName}</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          autoComplete="family-name"
                          required
                          maxLength={100}
                          value={formData.lastName}
                          onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="email">{t.contact.emailLabel}</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="subject">{t.contact.subject}</Label>
                      <Input
                        id="subject"
                        name="subject"
                        placeholder={t.contact.subjectPlaceholder}
                        required
                        minLength={2}
                        maxLength={150}
                        value={formData.subject}
                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
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
                        minLength={10}
                        maxLength={5000}
                        value={formData.message}
                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                      />
                    </div>

                    {/* Honeypot: fuer Menschen unsichtbar und nicht per Tab erreichbar */}
                    <div className="sr-only" aria-hidden="true">
                      <label htmlFor="website">Website</label>
                      <input
                        id="website"
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={formData.website}
                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                      />
                    </div>

                    {errorMessage && (
                      <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
                        {errorMessage}
                      </p>
                    )}

                    <Button type="submit" className="w-full" disabled={formStatus === "sending"}>
                      {formStatus === "sending" ? t.contact.sending : t.contact.send}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">{t.contact.confirmationNote}</p>
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
