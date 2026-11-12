import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Häufige Fragen",
  description:
    "Antworten auf häufige Fragen zu Mitgliedschaft, Veranstaltungen und Angeboten der Syrischen Gemeinschaft im Saarland. الأسئلة الشائعة.",
  path: "/faq",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
