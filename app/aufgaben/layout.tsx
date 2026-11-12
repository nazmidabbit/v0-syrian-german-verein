import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Meine Aufgaben",
  description:
    "Persönliche Aufgaben im Mitgliederbereich.",
  path: "/aufgaben",
  noindex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
