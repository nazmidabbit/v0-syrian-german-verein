import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Vorstand",
  description:
    "Der Vorstand der Syrischen Gemeinschaft im Saarland und seine Aufgaben. مجلس إدارة تجمع السوريين في زارلاند.",
  path: "/vorstand",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
