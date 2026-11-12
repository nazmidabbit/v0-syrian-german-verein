import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Wahlen",
  description:
    "Online-Wahlen der Syrischen Gemeinschaft im Saarland für freigeschaltete Mitglieder. انتخابات تجمع السوريين في زارلاند.",
  path: "/wahlen",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
