import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Galerie",
  description:
    "Bilder aus dem Saarland und von unseren Veranstaltungen. معرض صور تجمع السوريين في زارلاند.",
  path: "/galerie",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
