"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, useCallback } from "react"
import { Menu, X, Globe, LogOut, LogIn, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/components/language-provider"
import { locales } from "@/lib/i18n"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const { locale, setLocale, t } = useLanguage()

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check")
      setAuthenticated(res.ok)
    } catch {
      setAuthenticated(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setAuthenticated(false)
    window.location.href = "/"
  }

  const navigation = [
    { name: t.nav.home, href: "/" },
    { name: t.nav.about, href: "/ueber-uns" },
    { name: t.nav.events, href: "/veranstaltungen" },
    { name: t.nav.news, href: "/nachrichten" },
    { name: t.nav.election, href: "/wahlen" },
    { name: t.nav.gallery, href: "/galerie" },
    { name: t.nav.contact, href: "/kontakt" },
  ]

  const vereinMenu = [
    { name: t.nav.membership, href: "/mitgliedschaft" },
    { name: t.nav.donate, href: "/spenden" },
    { name: t.nav.projects, href: "/projekte" },
    { name: t.nav.board, href: "/vorstand" },
    { name: t.nav.statutes, href: "/satzung" },
    { name: t.nav.faq, href: "/faq" },
  ]

  const currentLocale = locales.find((l) => l.code === locale)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/logo.jpg"
            alt="Logo der Syrischen Gemeinschaft"
            width={50}
            height={50}
            className="rounded-lg animate-float-sm transition-transform duration-300 hover:scale-110"
          />
          <div className="hidden sm:block">
            <p className="font-semibold text-foreground text-sm">{t.header.title}</p>
            <p className="text-xs text-muted-foreground">{t.header.subtitle}</p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex lg:gap-x-6 xl:gap-x-8">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.name}
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {t.nav.verein}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {vereinMenu.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Language Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">{currentLocale?.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {locales.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLocale(l.code)}
                  className={locale === l.code ? "bg-secondary font-medium" : ""}
                >
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {authenticated ? (
            <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Logout</span>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="gap-2" asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Login</span>
              </Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-background max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="px-6 py-4 flex flex-col gap-3">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            <div className="pt-2 mt-1 border-t border-border">
              <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">
                {t.nav.verein}
              </p>
              {vereinMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block py-1.5 text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {authenticated ? (
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout() }}
                className="block text-base font-medium text-destructive hover:text-destructive/80 transition-colors"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                className="block text-base font-medium text-primary hover:text-primary/80 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
