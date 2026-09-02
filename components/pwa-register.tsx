"use client"

import { useEffect } from "react"

// Meldet den Service Worker an. Bewusst nur in der gebauten App:
// im Entwicklungsmodus wuerde der Cache staendig veraltete Dateien liefern.
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Ohne Service Worker laeuft die Seite normal weiter
      })
    }

    if (document.readyState === "complete") {
      register()
      return
    }
    window.addEventListener("load", register)
    return () => window.removeEventListener("load", register)
  }, [])

  return null
}
