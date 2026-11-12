import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Anmelden",
  description:
    "Anmeldung für Mitglieder der Syrischen Gemeinschaft im Saarland.",
  path: "/login",
  noindex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
