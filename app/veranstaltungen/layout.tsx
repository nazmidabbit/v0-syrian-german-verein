import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Veranstaltungen",
  description:
    "Kommende und vergangene Veranstaltungen der Syrischen Gemeinschaft im Saarland — Feste, Treffen, Sport und Begegnung. فعاليات تجمع السوريين في زارلاند.",
  path: "/veranstaltungen",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
