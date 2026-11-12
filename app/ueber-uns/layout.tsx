import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Über uns",
  description:
    "Wer wir sind: Die Syrische Gemeinschaft im Saarland bringt syrische Familien und Einzelpersonen zusammen und fördert Integration und kulturellen Austausch. من نحن — تجمع السوريين في زارلاند.",
  path: "/ueber-uns",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
