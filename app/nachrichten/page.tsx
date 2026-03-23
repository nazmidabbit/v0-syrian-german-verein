"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { Newspaper, CalendarDays } from "lucide-react"

interface NewsItem {
  id: string
  title: string
  title_ar: string
  content: string
  content_ar: string
  image_url: string
  published_at: string
}

export default function NewsPage() {
  const { t, locale } = useLanguage()
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => setNews(data.news || []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === "ar" ? "ar-SA" : "de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getTitle = (item: NewsItem) =>
    locale === "ar" && item.title_ar ? item.title_ar : item.title

  const getContent = (item: NewsItem) =>
    locale === "ar" && item.content_ar ? item.content_ar : item.content

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <section className="py-16 px-6 bg-gradient-to-b from-white to-primary/10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              {t.news.pageTitle}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t.news.pageSubtitle}
            </p>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-5xl mx-auto">
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">{t.news.loading}</p>
              </div>
            ) : news.length === 0 ? (
              <div className="text-center py-20">
                <Newspaper className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground">{t.news.noNews}</p>
              </div>
            ) : (
              <div className="space-y-8">
                {news.map((item) => {
                  const content = getContent(item)
                  const isLong = content.length > 300
                  const isExpanded = expandedId === item.id

                  return (
                    <article
                      key={item.id}
                      className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      {item.image_url && (
                        <div className="relative w-full flex justify-center bg-muted">
                          <Image
                            src={item.image_url}
                            alt={getTitle(item)}
                            width={800}
                            height={400}
                            className="object-cover w-full max-h-[400px]"
                          />
                        </div>
                      )}
                      <div className="p-6 md:p-8">
                        <div className="flex items-center gap-2 text-primary mb-3">
                          <CalendarDays className="h-4 w-4" />
                          <time className="text-sm font-medium">
                            {t.news.publishedOn} {formatDate(item.published_at)}
                          </time>
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-3">
                          {getTitle(item)}
                        </h2>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                          {isLong && !isExpanded
                            ? content.slice(0, 300) + "..."
                            : content}
                        </p>
                        {isLong && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            className="mt-3 text-primary font-medium hover:underline"
                          >
                            {isExpanded ? (locale === "ar" ? "عرض أقل" : "Weniger anzeigen") : t.news.readMore}
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
