import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Mitglied werden",
  description:
    "Werden Sie Mitglied der Syrischen Gemeinschaft im Saarland: Vorteile, Beitrag und Online-Antrag. انضم إلى تجمع السوريين في زارلاند.",
  path: "/mitgliedschaft",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
