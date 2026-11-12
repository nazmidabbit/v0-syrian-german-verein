"use client"

import Link from "next/link"
import { Facebook, Instagram, Mail, MapPin, MessageCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { ADDRESS, CONTACT_EMAIL, MAPS_URL, SOCIAL } from "@/lib/site"

export function Footer() {
  const { t } = useLanguage()

  const navItems = [
    { name: t.nav.home, href: "/" },
    { name: t.nav.about, href: "/ueber-uns" },
    { name: t.nav.events, href: "/veranstaltungen" },
    { name: t.nav.news, href: "/nachrichten" },
    { name: t.nav.election, href: "/wahlen" },
    { name: t.nav.gallery, href: "/galerie" },
    { name: t.nav.contact, href: "/kontakt" },
  ]

  const vereinItems = [
    { name: t.nav.membership, href: "/mitgliedschaft" },
    { name: t.nav.donate, href: "/spenden" },
    { name: t.nav.projects, href: "/projekte" },
    { name: t.nav.board, href: "/vorstand" },
    { name: t.nav.statutes, href: "/satzung" },
    { name: t.nav.faq, href: "/faq" },
  ]

  // Nur Kanaele zeigen, die wirklich eingetragen sind (siehe .env.example)
  const socialLinks = [
    { href: SOCIAL.facebook, label: "Facebook", icon: Facebook },
    { href: SOCIAL.instagram, label: "Instagram", icon: Instagram },
    { href: SOCIAL.whatsapp, label: "WhatsApp", icon: MessageCircle },
  ].filter((item) => item.href)

  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">{t.footer.title}</h3>
            <p className="text-background/70 text-sm leading-relaxed mb-4">
              {t.footer.description}
            </p>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 text-sm text-background/70 hover:text-background transition-colors"
            >
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{ADDRESS}</span>
            </a>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">{t.footer.navigation}</h3>
            <ul className="flex flex-col gap-2 text-sm">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-background/70 hover:text-background transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">{t.nav.verein}</h3>
            <ul className="flex flex-col gap-2 text-sm">
              {vereinItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-background/70 hover:text-background transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">{t.footer.legal}</h3>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <Link href="/impressum" className="text-background/70 hover:text-background transition-colors">
                  {t.footer.impressum}
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="text-background/70 hover:text-background transition-colors">
                  {t.footer.datenschutz}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">{t.footer.followUs}</h3>
            <div className="flex flex-wrap gap-4">
              {socialLinks.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-background/70 hover:text-background transition-colors"
                  aria-label={label}
                >
                  <Icon className="h-6 w-6" />
                </a>
              ))}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-background/70 hover:text-background transition-colors"
                aria-label={t.contact.email}
              >
                <Mail className="h-6 w-6" />
              </a>
            </div>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-block mt-3 text-sm text-background/70 hover:text-background transition-colors"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-background/20 text-center">
          <p className="text-sm text-background/60">
            &copy; {new Date().getFullYear()} {t.footer.title}. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  )
}
