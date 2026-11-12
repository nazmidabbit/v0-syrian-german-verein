import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

// Wird unter /robots.txt ausgeliefert. Interne Bereiche bleiben fuer
// Suchmaschinen unsichtbar; die Sitemap zeigt ihnen den Rest.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/login", "/register", "/verify", "/aufgaben"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
