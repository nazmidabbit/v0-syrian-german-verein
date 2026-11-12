"use client"

import { useState } from "react"
import { Check, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"

interface ShareButtonProps {
  title: string
  text?: string
  // Absolut oder relativ — relativ wird gegen die aktuelle Adresse aufgeloest
  url: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg"
  className?: string
}

// Teilen-Knopf: auf dem Handy oeffnet sich das Teilen-Menue (WhatsApp,
// Telegram, ...), am Rechner wird der Link in die Zwischenablage kopiert.
export function ShareButton({ title, text, url, variant = "outline", size = "sm", className }: ShareButtonProps) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const absolute = new URL(url, window.location.origin).toString()

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: absolute })
      } catch {
        // Abgebrochen — nichts weiter tun
      }
      return
    }

    try {
      await navigator.clipboard.writeText(absolute)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt(t.events.share, absolute)
    }
  }

  return (
    <Button type="button" variant={variant} size={size} className={`gap-2 ${className || ""}`} onClick={share}>
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? t.events.linkCopied : t.events.share}
    </Button>
  )
}
