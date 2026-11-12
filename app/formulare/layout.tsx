import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Formular",
  description:
    "Online-Formular der Syrischen Gemeinschaft im Saarland.",
  path: "/formulare",
  noindex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
