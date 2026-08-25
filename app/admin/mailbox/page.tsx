"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Forward,
  Inbox,
  Loader2,
  LogIn,
  Mail,
  MailOpen,
  Paperclip,
  PenSquare,
  RefreshCw,
  Reply,
  ReplyAll,
  Send,
  Shield,
  Trash2,
  X,
} from "lucide-react"

interface Folder {
  path: string
  name: string
  specialUse: string
  messages: number
  unseen: number
}

interface Address {
  name: string
  address: string
}

interface ListMessage {
  uid: number
  subject: string
  from: Address[]
  to: Address[]
  date: string | null
  seen: boolean
  answered: boolean
  flagged: boolean
  hasAttachments: boolean
  size: number
}

interface MessageDetail {
  uid: number
  folder: string
  subject: string
  from: Address[]
  to: Address[]
  cc: Address[]
  replyTo: Address[]
  date: string | null
  messageId: string
  references: string
  html: string
  text: string
  attachments: { index: number; filename: string; contentType: string; size: number }[]
}

interface ComposeState {
  open: boolean
  title: string
  to: string
  cc: string
  bcc: string
  subject: string
  text: string
  inReplyTo: string
  references: string
  replyFolder: string
  replyUid: number
  forwardFolder: string
  forwardUid: number
}

const EMPTY_COMPOSE: ComposeState = {
  open: false,
  title: "Neue E-Mail",
  to: "",
  cc: "",
  bcc: "",
  subject: "",
  text: "",
  inReplyTo: "",
  references: "",
  replyFolder: "",
  replyUid: 0,
  forwardFolder: "",
  forwardUid: 0,
}

const FOLDER_LABELS: Record<string, string> = {
  "\\Inbox": "Posteingang",
  "\\Sent": "Gesendet",
  "\\Drafts": "Entwürfe",
  "\\Junk": "Spam",
  "\\Trash": "Papierkorb",
}

const PAGE_SIZE = 25

function formatAddress(a: Address) {
  return a.name ? `${a.name} <${a.address}>` : a.address
}

function addressListText(list: Address[]) {
  return list.map(formatAddress).join(", ")
}

function formatDate(iso: string | null, short = false) {
  if (!iso) return ""
  const d = new Date(iso)
  if (short) {
    const today = new Date()
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    }
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })
  }
  return d.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

function replySubject(subject: string) {
  return /^\s*(re|aw)\s*:/i.test(subject) ? subject : `Re: ${subject}`
}

function forwardSubject(subject: string) {
  return /^\s*(fwd|wg)\s*:/i.test(subject) ? subject : `Fwd: ${subject}`
}

function quoteOriginal(detail: MessageDetail) {
  const sender = detail.from[0] ? formatAddress(detail.from[0]) : "Unbekannt"
  const quoted = (detail.text || "").split("\n").map((l) => `> ${l}`).join("\n")
  return `\n\nAm ${formatDate(detail.date)} schrieb ${sender}:\n${quoted}`
}

function forwardBody(detail: MessageDetail) {
  return [
    "",
    "",
    "---------- Weitergeleitete Nachricht ----------",
    `Von: ${addressListText(detail.from)}`,
    `Datum: ${formatDate(detail.date)}`,
    `Betreff: ${detail.subject}`,
    `An: ${addressListText(detail.to)}`,
    "",
    detail.text || "",
  ].join("\n")
}

export default function AdminMailboxPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accessError, setAccessError] = useState("")

  const [folders, setFolders] = useState<Folder[]>([])
  const [account, setAccount] = useState("")
  const [activeFolder, setActiveFolder] = useState("INBOX")
  const [loadingFolders, setLoadingFolders] = useState(true)

  const [messages, setMessages] = useState<ListMessage[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingList, setLoadingList] = useState(false)

  const [detail, setDetail] = useState<MessageDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [actionError, setActionError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)

  const [compose, setCompose] = useState<ComposeState>(EMPTY_COMPOSE)
  const [composeFiles, setComposeFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [composeError, setComposeError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const showNotice = (text: string) => {
    setNotice(text)
    window.setTimeout(() => setNotice(""), 5000)
  }

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check")
      if (res.ok) setAuthenticated(true)
    } catch {
      // not authenticated
    } finally {
      setChecking(false)
    }
  }, [])

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true)
    try {
      const res = await fetch("/api/admin/mailbox/folders")
      if (res.ok) {
        const data = await res.json()
        setFolders(data.folders || [])
        setAccount(data.account || "")
      } else if (res.status === 403) {
        setAccessError("Keine Berechtigung für die Mailbox.")
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || "Verbindung zum Mailserver fehlgeschlagen.")
      }
    } catch {
      setActionError("Verbindung zum Mailserver fehlgeschlagen.")
    } finally {
      setLoadingFolders(false)
    }
  }, [])

  const loadMessages = useCallback(async (folder: string, pageNum: number) => {
    setLoadingList(true)
    setActionError("")
    try {
      const params = new URLSearchParams({ folder, page: String(pageNum) })
      const res = await fetch(`/api/admin/mailbox/messages?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setTotal(data.total || 0)
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || "E-Mails konnten nicht geladen werden.")
      }
    } catch {
      setActionError("E-Mails konnten nicht geladen werden.")
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { if (authenticated) loadFolders() }, [authenticated, loadFolders])
  useEffect(() => {
    if (authenticated && !accessError) loadMessages(activeFolder, page)
  }, [authenticated, accessError, activeFolder, page, loadMessages])

  const selectFolder = (path: string) => {
    setActiveFolder(path)
    setPage(1)
    setDetail(null)
  }

  const openMessage = async (msg: ListMessage) => {
    setLoadingDetail(true)
    setActionError("")
    try {
      const params = new URLSearchParams({ folder: activeFolder, uid: String(msg.uid) })
      const res = await fetch(`/api/admin/mailbox/message?${params}`)
      if (res.ok) {
        const data = await res.json()
        setDetail(data.message)
        if (!msg.seen) {
          setMessages((prev) => prev.map((m) => (m.uid === msg.uid ? { ...m, seen: true } : m)))
          setFolders((prev) =>
            prev.map((f) => (f.path === activeFolder ? { ...f, unseen: Math.max(0, f.unseen - 1) } : f)),
          )
        }
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || "Nachricht konnte nicht geladen werden.")
      }
    } catch {
      setActionError("Nachricht konnte nicht geladen werden.")
    } finally {
      setLoadingDetail(false)
    }
  }

  const markUnseen = async () => {
    if (!detail) return
    setBusy(true)
    try {
      const res = await fetch("/api/admin/mailbox/message", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: detail.folder, uid: detail.uid, seen: false }),
      })
      if (res.ok) {
        setMessages((prev) => prev.map((m) => (m.uid === detail.uid ? { ...m, seen: false } : m)))
        setFolders((prev) =>
          prev.map((f) => (f.path === detail.folder ? { ...f, unseen: f.unseen + 1 } : f)),
        )
        setDetail(null)
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || "Aktion fehlgeschlagen.")
      }
    } catch {
      setActionError("Aktion fehlgeschlagen.")
    } finally {
      setBusy(false)
    }
  }

  const deleteMessage = async () => {
    if (!detail) return
    const isTrash = folders.find((f) => f.path === detail.folder)?.specialUse === "\\Trash"
    const confirmText = isTrash
      ? "Diese E-Mail endgültig löschen?"
      : "Diese E-Mail in den Papierkorb verschieben?"
    if (!window.confirm(confirmText)) return
    setBusy(true)
    try {
      const params = new URLSearchParams({ folder: detail.folder, uid: String(detail.uid) })
      const res = await fetch(`/api/admin/mailbox/message?${params}`, { method: "DELETE" })
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.uid !== detail.uid))
        setDetail(null)
        loadFolders()
        showNotice(isTrash ? "E-Mail endgültig gelöscht." : "E-Mail in den Papierkorb verschoben.")
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || "Löschen fehlgeschlagen.")
      }
    } catch {
      setActionError("Löschen fehlgeschlagen.")
    } finally {
      setBusy(false)
    }
  }

  const startCompose = () => {
    setCompose({ ...EMPTY_COMPOSE, open: true })
    setComposeFiles([])
    setComposeError("")
  }

  const startReply = (all: boolean) => {
    if (!detail) return
    const replyTargets = detail.replyTo.length ? detail.replyTo : detail.from
    const own = account.toLowerCase()
    const toAddresses = replyTargets.map((a) => a.address)
    const ccList = all
      ? [...detail.to, ...detail.cc].filter(
          (a) => a.address.toLowerCase() !== own && !toAddresses.includes(a.address),
        )
      : []
    setCompose({
      open: true,
      title: all ? "Allen antworten" : "Antworten",
      to: addressListText(replyTargets),
      cc: addressListText(ccList),
      bcc: "",
      subject: replySubject(detail.subject),
      text: quoteOriginal(detail),
      inReplyTo: detail.messageId,
      references: [detail.references, detail.messageId].filter(Boolean).join(" "),
      replyFolder: detail.folder,
      replyUid: detail.uid,
      forwardFolder: "",
      forwardUid: 0,
    })
    setComposeFiles([])
    setComposeError("")
  }

  const startForward = () => {
    if (!detail) return
    setCompose({
      open: true,
      title: "Weiterleiten",
      to: "",
      cc: "",
      bcc: "",
      subject: forwardSubject(detail.subject),
      text: forwardBody(detail),
      inReplyTo: "",
      references: "",
      replyFolder: "",
      replyUid: 0,
      forwardFolder: detail.folder,
      forwardUid: detail.uid,
    })
    setComposeFiles([])
    setComposeError("")
  }

  const sendMail = async (e: React.FormEvent) => {
    e.preventDefault()
    setComposeError("")
    if (!compose.to.trim()) {
      setComposeError("Bitte mindestens einen Empfänger angeben.")
      return
    }
    setSending(true)
    try {
      const form = new FormData()
      form.set("to", compose.to)
      form.set("cc", compose.cc)
      form.set("bcc", compose.bcc)
      form.set("subject", compose.subject)
      form.set("text", compose.text)
      form.set("inReplyTo", compose.inReplyTo)
      form.set("references", compose.references)
      form.set("replyFolder", compose.replyFolder)
      form.set("replyUid", compose.replyUid ? String(compose.replyUid) : "")
      form.set("forwardFolder", compose.forwardFolder)
      form.set("forwardUid", compose.forwardUid ? String(compose.forwardUid) : "")
      for (const file of composeFiles) form.append("files", file)

      const res = await fetch("/api/admin/mailbox/send", { method: "POST", body: form })
      if (res.ok) {
        if (compose.replyUid) {
          setMessages((prev) =>
            prev.map((m) => (m.uid === compose.replyUid ? { ...m, answered: true } : m)),
          )
        }
        setCompose(EMPTY_COMPOSE)
        setComposeFiles([])
        showNotice("E-Mail wurde gesendet.")
      } else {
        const data = await res.json().catch(() => ({}))
        setComposeError(data.error || `Senden fehlgeschlagen (${res.status}).`)
      }
    } catch {
      setComposeError("Verbindungsfehler — Senden fehlgeschlagen.")
    } finally {
      setSending(false)
    }
  }

  const addFiles = (list: FileList | null) => {
    if (!list) return
    setComposeFiles((prev) => [...prev, ...Array.from(list)])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Höhe des Mail-iframes an den Inhalt anpassen
  const resizeIframe = () => {
    const iframe = iframeRef.current
    try {
      const height = iframe?.contentDocument?.body?.scrollHeight
      if (iframe && height) iframe.style.height = `${Math.min(height + 40, 4000)}px`
    } catch {
      // Zugriff blockiert — feste Höhe behalten
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const activeFolderInfo = folders.find((f) => f.path === activeFolder)
  const folderLabel = (f: Folder) => FOLDER_LABELS[f.specialUse] || f.name
  const isSentFolder = activeFolderInfo?.specialUse === "\\Sent"

  // In "Gesendet" den Empfänger statt des Absenders anzeigen
  const listCorrespondent = (msg: ListMessage) => {
    const addr = isSentFolder ? msg.to[0] : msg.from[0]
    const label = addr ? addr.name || addr.address : "Unbekannt"
    return isSentFolder ? `An: ${label}` : label
  }

  if (checking) {
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

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <LogIn className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Anmeldung erforderlich</h1>
            <p className="text-muted-foreground mb-6">Bitte melden Sie sich im Admin-Bereich an.</p>
            <Button asChild>
              <Link href="/admin">Zum Admin-Login</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (accessError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Kein Zugriff</h1>
            <p className="text-muted-foreground">{accessError}</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <section className="py-10 px-6 bg-secondary">
          <div className="max-w-6xl mx-auto text-center">
            <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-foreground mb-2">Postfach</h1>
            <p className="text-muted-foreground">{account}</p>
          </div>
        </section>

        <section className="py-8 px-4 sm:px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            {notice && (
              <div className="mb-4 rounded-lg border border-green-300 bg-green-50 text-green-800 px-4 py-2 text-sm">
                {notice}
              </div>
            )}
            {actionError && (
              <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive px-4 py-2 text-sm">
                {actionError}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-6">
              {/* Ordner-Sidebar */}
              <aside className="md:w-56 shrink-0">
                <Button className="w-full mb-4" onClick={startCompose}>
                  <PenSquare className="h-4 w-4 mr-2" />
                  Neue E-Mail
                </Button>
                {loadingFolders ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <nav className="flex md:flex-col gap-1 overflow-x-auto">
                    {folders.map((f) => (
                      <button
                        key={f.path}
                        onClick={() => selectFolder(f.path)}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                          f.path === activeFolder
                            ? "bg-primary/10 text-primary font-semibold"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Inbox className="h-4 w-4 shrink-0" />
                          <span className="truncate">{folderLabel(f)}</span>
                        </span>
                        {f.unseen > 0 && (
                          <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                            {f.unseen}
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>
                )}
              </aside>

              {/* Hauptbereich */}
              <div className="flex-1 min-w-0">
                {loadingDetail ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : detail ? (
                  <div className="border rounded-xl bg-card">
                    {/* Detail-Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Zurück
                      </Button>
                      <div className="flex-1" />
                      <Button variant="outline" size="sm" onClick={() => startReply(false)}>
                        <Reply className="h-4 w-4 mr-1" />
                        Antworten
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => startReply(true)}>
                        <ReplyAll className="h-4 w-4 mr-1" />
                        Allen antworten
                      </Button>
                      <Button variant="outline" size="sm" onClick={startForward}>
                        <Forward className="h-4 w-4 mr-1" />
                        Weiterleiten
                      </Button>
                      <Button variant="outline" size="sm" onClick={markUnseen} disabled={busy}>
                        <MailOpen className="h-4 w-4 mr-1" />
                        Ungelesen
                      </Button>
                      <Button variant="outline" size="sm" onClick={deleteMessage} disabled={busy} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Löschen
                      </Button>
                    </div>

                    {/* Kopfdaten */}
                    <div className="px-6 py-4 border-b">
                      <h2 className="text-xl font-bold mb-2 break-words">
                        {detail.subject || "(Kein Betreff)"}
                      </h2>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <div>
                          <span className="font-medium text-foreground">Von:</span>{" "}
                          {addressListText(detail.from) || "-"}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">An:</span>{" "}
                          {addressListText(detail.to) || "-"}
                        </div>
                        {detail.cc.length > 0 && (
                          <div>
                            <span className="font-medium text-foreground">Cc:</span>{" "}
                            {addressListText(detail.cc)}
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-foreground">Datum:</span>{" "}
                          {formatDate(detail.date)}
                        </div>
                      </div>

                      {detail.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {detail.attachments.map((att) => (
                            <a
                              key={att.index}
                              href={`/api/admin/mailbox/attachment?${new URLSearchParams({
                                folder: detail.folder,
                                uid: String(detail.uid),
                                index: String(att.index),
                              })}`}
                              className="inline-flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              <span className="max-w-[220px] truncate">{att.filename}</span>
                              <span className="text-xs text-muted-foreground">({formatSize(att.size)})</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Inhalt im Sandbox-iframe (Scripts blockiert) */}
                    {detail.html ? (
                      <iframe
                        ref={iframeRef}
                        title="E-Mail-Inhalt"
                        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                        srcDoc={`<base target="_blank"><style>body{margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;background:#fff;word-break:break-word}img{max-width:100%;height:auto}</style>${detail.html}`}
                        onLoad={resizeIframe}
                        className="w-full rounded-b-xl bg-white"
                        style={{ height: "500px", border: "none" }}
                      />
                    ) : (
                      <div className="px-6 py-8 text-muted-foreground text-sm">(Kein Inhalt)</div>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-xl bg-card">
                    {/* Listen-Toolbar */}
                    <div className="flex items-center gap-2 border-b px-4 py-3">
                      <h2 className="font-semibold">
                        {activeFolderInfo ? folderLabel(activeFolderInfo) : activeFolder}
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        {total} {total === 1 ? "E-Mail" : "E-Mails"}
                      </span>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { loadFolders(); loadMessages(activeFolder, page) }}
                        disabled={loadingList}
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="sm" disabled={page <= 1 || loadingList} onClick={() => setPage((p) => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {page} / {totalPages}
                      </span>
                      <Button variant="ghost" size="sm" disabled={page >= totalPages || loadingList} onClick={() => setPage((p) => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Nachrichtenliste */}
                    {loadingList ? (
                      <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-20 text-muted-foreground">
                        <Inbox className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        Keine E-Mails in diesem Ordner.
                      </div>
                    ) : (
                      <ul className="divide-y">
                        {messages.map((msg) => (
                          <li key={msg.uid}>
                            <button
                              onClick={() => openMessage(msg)}
                              className="w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors flex items-center gap-3"
                            >
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${msg.seen ? "bg-transparent" : "bg-primary"}`}
                                title={msg.seen ? "" : "Ungelesen"}
                              />
                              <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-2">
                                  <span className={`truncate text-sm ${msg.seen ? "text-muted-foreground" : "font-semibold text-foreground"}`}>
                                    {listCorrespondent(msg)}
                                  </span>
                                  {msg.answered && <Reply className="h-3 w-3 shrink-0 text-muted-foreground" />}
                                </span>
                                <span className={`block truncate text-sm ${msg.seen ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                                  {msg.subject || "(Kein Betreff)"}
                                </span>
                              </span>
                              {msg.hasAttachments && <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />}
                              <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
                                {formatDate(msg.date, true)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Compose-Dialog */}
      <Dialog open={compose.open} onOpenChange={(open) => { if (!open && !sending) setCompose(EMPTY_COMPOSE) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{compose.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={sendMail} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="mail-to">An</Label>
              <Input
                id="mail-to"
                value={compose.to}
                onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))}
                placeholder="empfaenger@example.de, weitere@example.de"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mail-cc">Cc</Label>
                <Input
                  id="mail-cc"
                  value={compose.cc}
                  onChange={(e) => setCompose((c) => ({ ...c, cc: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="mail-bcc">Bcc</Label>
                <Input
                  id="mail-bcc"
                  value={compose.bcc}
                  onChange={(e) => setCompose((c) => ({ ...c, bcc: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mail-subject">Betreff</Label>
              <Input
                id="mail-subject"
                value={compose.subject}
                onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="mail-text">Nachricht</Label>
              <Textarea
                id="mail-text"
                rows={12}
                value={compose.text}
                onChange={(e) => setCompose((c) => ({ ...c, text: e.target.value }))}
              />
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4 mr-2" />
                Anhang hinzufügen
              </Button>
              {compose.forwardUid > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Anhänge der Originalnachricht werden automatisch mitgesendet.
                </p>
              )}
              {composeFiles.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {composeFiles.map((file, idx) => (
                    <li key={`${file.name}-${idx}`} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5">
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                      <button
                        type="button"
                        onClick={() => setComposeFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Anhang entfernen"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {composeError && <p className="text-destructive text-sm">{composeError}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setCompose(EMPTY_COMPOSE)} disabled={sending}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Senden
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
