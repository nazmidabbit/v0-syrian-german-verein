import type { Metadata } from "next"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Mitgliedsantrag",
  description:
    "Online-Mitgliedsantrag für die Syrische Gemeinschaft im Saarland — in wenigen Minuten ausgefüllt. طلب الانتساب إلى تجمع السوريين في زارلاند.",
  path: "/mitgliedschaft/antrag",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
