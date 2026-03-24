"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"

const COOKIE_NAME = "cookie-consent"

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    const consent = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE_NAME}=`))
    if (!consent) {
      setVisible(true)
    }
  }, [])

  function setCookie(value: string) {
    const maxAge = 60 * 60 * 24 * 365
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; SameSite=Strict`
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-4xl mx-auto bg-foreground text-background rounded-xl shadow-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm leading-relaxed flex-1">
          {t.cookieConsent.text}{" "}
          <Link href="/datenschutz" className="underline font-medium hover:opacity-80">
            {t.cookieConsent.link}
          </Link>
          .
        </p>
        <div className="flex gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="border-background/30 text-background hover:bg-background/10"
            onClick={() => setCookie("declined")}
          >
            {t.cookieConsent.decline}
          </Button>
          <Button
            size="sm"
            className="bg-background text-foreground hover:bg-background/90"
            onClick={() => setCookie("accepted")}
          >
            {t.cookieConsent.accept}
          </Button>
        </div>
      </div>
    </div>
  )
}
