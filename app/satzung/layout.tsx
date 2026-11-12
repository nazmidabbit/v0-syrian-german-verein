import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Satzung",
  description:
    "Die Satzung der Syrischen Gemeinschaft im Saarland e.V. (i. Gr.): Zweck, Mitgliedschaft, Organe. النظام الأساسي لتجمع السوريين في زارلاند.",
  path: "/satzung",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
