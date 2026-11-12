import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Nachrichten",
  description:
    "Aktuelle Neuigkeiten aus der Syrischen Gemeinschaft im Saarland. آخر أخبار تجمع السوريين في زارلاند.",
  path: "/nachrichten",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
