import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Impressum",
  description:
    "Impressum der Syrischen Gemeinschaft im Saarland e.V. (i. Gr.).",
  path: "/impressum",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
