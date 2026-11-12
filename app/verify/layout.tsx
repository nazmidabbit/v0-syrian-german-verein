import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "E-Mail bestätigen",
  description:
    "Bestätigung der E-Mail-Adresse für den Mitgliederbereich.",
  path: "/verify",
  noindex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
