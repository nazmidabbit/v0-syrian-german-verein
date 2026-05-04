"use client"

import { useEffect, useState, useCallback, use } from "react"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Vote, Loader2, CheckCircle2, AlertCircle, Trophy, LogIn } from "lucide-react"

interface Election {
  id: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  starts_at: string
  ends_at: string
  status: "draft" | "active" | "closed"
}

interface Candidate {
  id: string
  name: string
  name_ar: string
  bio: string
  bio_ar: string
  image_url: string
  sort_order: number
}

interface MyVote {
  voted: boolean
  candidateId?: string
  votedAt?: string
}

interface ResultRow {
  candidateId: string
  name: string
  nameAr: string
  imageUrl: string
  count: number
}

interface AuthInfo {
  loggedIn: boolean
  verified: boolean
}

export default function ElectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { t, locale } = useLanguage()

  const [election, setElection] = useState<Election | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [myVote, setMyVote] = useState<MyVote>({ voted: false })
  const [auth, setAuth] = useState<AuthInfo>({ loggedIn: false, verified: false })
  const [results, setResults] = useState<{ rows: ResultRow[]; total: number; turnout: number } | null>(null)
  const [selected, setSelected] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    try {
      const [eRes, vRes, aRes] = await Promise.all([
        fetch(`/api/elections/${id}`),
        fetch(`/api/elections/${id}/my-vote`),
        fetch("/api/auth/check"),
      ])

      if (eRes.ok) {
        const data = await eRes.json()
        setElection(data.election)
        setCandidates(data.candidates || [])
      }
      if (vRes.ok) setMyVote(await vRes.json())
      if (aRes.ok) {
        const a = await aRes.json()
        setAuth({
          loggedIn: !!a.user,
          verified: !!a.user?.is_verified,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (election?.status !== "closed") {
      setResults(null)
      return
    }
    fetch(`/api/elections/${id}/results`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setResults({
          rows: data.results || [],
          total: data.totalVotes || 0,
          turnout: data.turnout || 0,
        })
      })
      .catch(() => { /* ignore */ })
  }, [election?.status, id])

  const getTitle = (e: Election) => (locale === "ar" && e.title_ar ? e.title_ar : e.title)
  const getDescription = (e: Election) =>
    locale === "ar" && e.description_ar ? e.description_ar : e.description
  const getName = (c: Candidate) => (locale === "ar" && c.name_ar ? c.name_ar : c.name)
  const getBio = (c: Candidate) => (locale === "ar" && c.bio_ar ? c.bio_ar : c.bio)
  const getResultName = (r: ResultRow) => (locale === "ar" && r.nameAr ? r.nameAr : r.name)

  const formatDate = (s: string) =>
    new Date(s).toLocaleString(locale === "ar" ? "ar-SA" : "de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) {
      setError(t.election.selectCandidate)
      return
    }
    if (!confirm(t.election.confirmVote)) return

    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/elections/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: selected }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Fehler.")
      }
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    )
  }

  if (!election || election.status === "draft") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <p className="text-muted-foreground">{t.election.noElections}</p>
        </main>
        <Footer />
      </div>
    )
  }

  const isActive = election.status === "active"
  const isClosed = election.status === "closed"
  const winner = results ? results.rows.reduce<ResultRow | null>((max, r) => (!max || r.count > max.count ? r : max), null) : null
  const maxCount = results && results.rows.length > 0 ? Math.max(...results.rows.map((r) => r.count), 1) : 1

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <section className="py-12 px-6 bg-gradient-to-b from-white to-primary/10">
          <div className="max-w-4xl mx-auto">
            <Button asChild variant="ghost" size="sm" className="mb-4">
              <Link href="/wahlen">← {t.election.pageTitle}</Link>
            </Button>
            <span
              className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${
                isActive ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
              }`}
            >
              {isActive ? t.election.activeNow : t.election.closed}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-3">{getTitle(election)}</h1>
            <p className="text-sm text-muted-foreground mb-2">
              {t.election.startsAt}: {formatDate(election.starts_at)} · {t.election.endsAt}:{" "}
              {formatDate(election.ends_at)}
            </p>
            {getDescription(election) && (
              <p className="text-foreground/80 mt-4 whitespace-pre-line">{getDescription(election)}</p>
            )}
          </div>
        </section>

        {/* Voting / Status Section */}
        {isActive && (
          <section className="py-8 px-6 bg-background">
            <div className="max-w-4xl mx-auto">
              {!auth.loggedIn ? (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 flex items-center gap-4">
                  <AlertCircle className="h-6 w-6 text-orange-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-orange-800 font-medium">{t.election.loginToVote}</p>
                  </div>
                  <Button asChild>
                    <Link href="/login" className="gap-2">
                      <LogIn className="h-4 w-4" />
                      Login
                    </Link>
                  </Button>
                </div>
              ) : !auth.verified ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex items-center gap-4">
                  <AlertCircle className="h-6 w-6 text-yellow-600 shrink-0" />
                  <p className="text-yellow-800">{t.election.notVerified}</p>
                </div>
              ) : myVote.voted ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-4">
                  <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                  <p className="text-green-800">
                    {myVote.votedAt
                      ? t.election.votedAt.replace("{date}", formatDate(myVote.votedAt))
                      : t.election.voted}
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* Candidates / Results */}
        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">
              {isClosed ? t.election.results : t.election.candidates}
            </h2>

            {candidates.length === 0 ? (
              <p className="text-muted-foreground">{t.election.noCandidates}</p>
            ) : isClosed && results ? (
              <div className="space-y-4">
                {results.rows.map((r) => {
                  const pct = results.total > 0 ? (r.count / results.total) * 100 : 0
                  const isWinner = winner && r.candidateId === winner.candidateId && r.count > 0
                  return (
                    <div
                      key={r.candidateId}
                      className={`p-4 rounded-xl border ${
                        isWinner ? "bg-primary/5 border-primary/40" : "bg-background border-border"
                      }`}
                    >
                      <div className="flex items-center gap-4 mb-3">
                        {r.imageUrl ? (
                          <Image src={r.imageUrl} alt="" width={56} height={56} className="rounded-lg object-cover w-14 h-14" />
                        ) : (
                          <div className="w-14 h-14 bg-muted rounded-lg" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{getResultName(r)}</h3>
                            {isWinner && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                                <Trophy className="h-3.5 w-3.5" />
                                {t.election.winner}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {r.count === 1 ? t.election.voteCountOne : t.election.voteCount.replace("{n}", String(r.count))}{" "}
                            · {pct.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${isWinner ? "bg-primary" : "bg-primary/50"}`}
                          style={{ width: `${(r.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}

                <div className="text-sm text-muted-foreground pt-4 border-t">
                  {t.election.totalVotes}: <strong>{results.total}</strong> · {t.election.turnout}:{" "}
                  <strong>{(results.turnout * 100).toFixed(1)}%</strong>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVote} className="space-y-3">
                {candidates.map((c) => {
                  const canVoteNow = isActive && auth.loggedIn && auth.verified && !myVote.voted
                  const isMine = myVote.voted && myVote.candidateId === c.id
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                        isMine
                          ? "bg-green-50 border-green-300"
                          : selected === c.id
                            ? "bg-primary/5 border-primary"
                            : "bg-background border-border hover:bg-secondary/50"
                      } ${canVoteNow ? "cursor-pointer" : "cursor-default"}`}
                    >
                      {canVoteNow && (
                        <input
                          type="radio"
                          name="candidate"
                          value={c.id}
                          checked={selected === c.id}
                          onChange={(e) => setSelected(e.target.value)}
                          className="h-5 w-5 accent-primary"
                        />
                      )}
                      {c.image_url ? (
                        <Image src={c.image_url} alt="" width={64} height={64} className="rounded-lg object-cover w-16 h-16" />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{getName(c)}</h3>
                          {isMine && (
                            <span className="text-xs font-semibold text-green-700 inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t.election.voted}
                            </span>
                          )}
                        </div>
                        {getBio(c) && <p className="text-sm text-muted-foreground mt-1">{getBio(c)}</p>}
                      </div>
                    </label>
                  )
                })}

                {error && <p className="text-destructive text-sm">{error}</p>}

                {isActive && auth.loggedIn && auth.verified && !myVote.voted && (
                  <Button type="submit" disabled={submitting || !selected} className="gap-2">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.election.voting}
                      </>
                    ) : (
                      <>
                        <Vote className="h-4 w-4" />
                        {t.election.vote}
                      </>
                    )}
                  </Button>
                )}
              </form>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
