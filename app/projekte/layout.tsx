import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Projekte",
  description:
    "Projekte und Angebote der Syrischen Gemeinschaft im Saarland: Sprache, Beratung, Kultur und Begegnung. مشاريع تجمع السوريين في زارلاند.",
  path: "/projekte",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
