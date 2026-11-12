import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Kontakt",
  description:
    "Schreiben Sie der Syrischen Gemeinschaft im Saarland: Kontaktformular, E-Mail und Adresse in Saarbrücken. تواصل مع تجمع السوريين في زارلاند.",
  path: "/kontakt",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
