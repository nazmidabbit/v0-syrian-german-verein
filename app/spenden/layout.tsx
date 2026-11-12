import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Spenden",
  description:
    "Unterstützen Sie die Arbeit der Syrischen Gemeinschaft im Saarland mit einer Spende. ادعم عمل تجمع السوريين في زارلاند بتبرعك.",
  path: "/spenden",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
