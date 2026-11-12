import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Datenschutzerklärung",
  description:
    "Datenschutzerklärung der Syrischen Gemeinschaft im Saarland: welche Daten wir verarbeiten und welche Rechte Sie haben. سياسة الخصوصية.",
  path: "/datenschutz",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
