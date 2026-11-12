import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Registrieren",
  description:
    "Konto für den Mitgliederbereich der Syrischen Gemeinschaft im Saarland anlegen.",
  path: "/register",
  noindex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
