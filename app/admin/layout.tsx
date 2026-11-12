import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Admin-Bereich",
  description:
    "Verwaltungsbereich der Syrischen Gemeinschaft im Saarland.",
  path: "/admin",
  noindex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
