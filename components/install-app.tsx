"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, Share, X } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"

// Chrome/Edge feuern dieses Ereignis, bevor sie selbst zur Installation
// auffordern. Der Typ steht nicht in den DOM-Typen.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "pwa-install-dismissed"
const COOKIE_CONSENT_NAME = "cookie-consent"

export function InstallApp() {
  const { t } = useLanguage()
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [visible, setVisible] = useState(false)

  const hide = useCallback((remember: boolean) => {
    setVisible(false)
    if (!remember) return
    try {
      localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // Privates Fenster: dann eben nur fuer diese Sitzung ausgeblendet
    }
  }, [])

  useEffect(() => {
    // Schon installiert? Dann nichts anbieten.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS meldet den Startbildschirm-Modus ueber eine eigene Eigenschaft
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) return

    try {
      if (localStorage.getItem(DISMISS_KEY)) return
    } catch {
      // Zugriff gesperrt: Hinweis trotzdem zeigen
    }

    // Erst nach der Cookie-Entscheidung, damit nicht zwei Banner uebereinander liegen
    const consentGiven = document.cookie
      .split("; ")
      .some((row) => row.startsWith(`${COOKIE_CONSENT_NAME}=`))
    if (!consentGiven) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (ios) {
      // Safari kennt kein beforeinstallprompt - dort hilft nur die Anleitung
      setIsIos(true)
      setVisible(true)
      return
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)

    const onInstalled = () => hide(true)
    window.addEventListener("appinstalled", onInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [hide])

  const install = async () => {
    if (!promptEvent) return
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    setPromptEvent(null)
    hide(outcome === "accepted")
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-4">
      <div className="max-w-3xl mx-auto bg-background border border-border rounded-xl shadow-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">
            {isIos ? t.pwa.iosTitle : t.pwa.installTitle}
          </p>
          {isIos ? (
            <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
              <Share className="h-4 w-4 flex-shrink-0" />
              {t.pwa.iosStep1}
              <span aria-hidden="true">→</span>
              {t.pwa.iosStep2}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">{t.pwa.installText}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!isIos && (
            <Button onClick={install} className="gap-2">
              <Download className="h-4 w-4" />
              {t.pwa.installButton}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => hide(true)} className="gap-1">
            <X className="h-4 w-4" />
            {t.pwa.installLater}
          </Button>
        </div>
      </div>
    </div>
  )
}
