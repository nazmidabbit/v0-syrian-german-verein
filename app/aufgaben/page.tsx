"use client"

// "Meine Aufgaben" als App-Maske: Am Handy (auch als installierte App auf
// iOS und Android) verhaelt sich die Seite wie eine native Aufgaben-App —
// Liste mit Abhak-Kreis, Details und Formular als Blatt von unten,
// schwebender "+"-Knopf, Zaehler am App-Symbol. Am Rechner dieselbe Liste,
// schmal in der Mitte.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  AlarmClock,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ListTodo,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  RefreshCw,
  Repeat,
  RotateCcw,
  StickyNote,
  Timer,
  Trash2,
  UserPlus,
} from "lucide-react"
import {
  REMINDER_LEAD_OPTIONS,
  TASK_PRIORITIES,
  TASK_RECURRENCES,
  type TaskPriority,
  type TaskRecurrence,
  type TaskStatus,
} from "@/lib/tasks"

interface Task {
  id: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  assigned_to: string
  created_by: string | null
  due_at: string
  priority: TaskPriority
  status: TaskStatus
  completed_at: string | null
  completion_note: string
  reminder_lead_hours: number
  recurrence: TaskRecurrence
}

type Tab = "active" | "done"
type GroupKey = "overdue" | "today" | "week" | "later"

const DAY_MS = 86_400_000

// Frist als <input type="datetime-local"> darstellen (lokale Zeit des Browsers)
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Ganze Kalendertage zwischen heute und der Frist
function daysUntil(iso: string): number {
  const due = new Date(iso)
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((startOfDue - startOfToday) / DAY_MS)
}

const isActive = (task: Task) => task.status === "open" || task.status === "in_progress"
const isOverdue = (task: Task) => isActive(task) && new Date(task.due_at).getTime() < Date.now()

function groupOf(task: Task): GroupKey {
  if (isOverdue(task)) return "overdue"
  const days = daysUntil(task.due_at)
  if (days <= 0) return "today"
  if (days <= 7) return "week"
  return "later"
}

// Zahl am App-Symbol (Android/Chrome und iOS ab 16.4 bei installierter App):
// was heute faellig oder schon ueberfaellig ist.
function updateAppBadge(count: number) {
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  try {
    if (count > 0) nav.setAppBadge?.(count)?.catch(() => {})
    else nav.clearAppBadge?.()?.catch(() => {})
  } catch {
    // nicht unterstuetzt — kein Problem
  }
}

export default function MyTasksPage() {
  const { t, locale } = useLanguage()

  const [tasks, setTasks] = useState<Task[]>([])
  const [userId, setUserId] = useState("")
  const [canAssign, setCanAssign] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("active")

  // Detail-Blatt
  const [detailId, setDetailId] = useState<string | null>(null)
  const [noteEditing, setNoteEditing] = useState(false)
  const [noteText, setNoteText] = useState("")

  // Formular-Blatt (neu / bearbeiten)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("normal")
  const [reminderLead, setReminderLead] = useState(24)
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("none")
  const [formError, setFormError] = useState("")

  // "Rueckgaengig"-Leiste nach dem Abhaken
  const [undoTask, setUndoTask] = useState<Task | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check")
      if (res.ok) {
        const data = await res.json()
        setAuthenticated(true)
        setUserId(data.user?.id || "")
        const permissions: string[] = data.user?.permissions || []
        setCanAssign(data.user?.role === "admin" || permissions.includes("aufgaben"))
      }
    } catch {
      // nicht angemeldet
    } finally {
      setChecking(false)
    }
  }, [])

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
        setError("")
      } else {
        setError(t.tasks.error)
      }
    } catch {
      setError(t.tasks.error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { if (authenticated) loadTasks() }, [authenticated, loadTasks])

  // Kommt die App aus dem Hintergrund zurueck, frisch laden — sonst sieht man
  // am Handy tagelang den Stand vom letzten Oeffnen.
  useEffect(() => {
    if (!authenticated) return
    const onVisible = () => { if (document.visibilityState === "visible") loadTasks() }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [authenticated, loadTasks])

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current) }, [])

  const getTitle = (task: Task) => (locale === "ar" && task.title_ar ? task.title_ar : task.title)
  const getDescription = (task: Task) =>
    locale === "ar" && task.description_ar ? task.description_ar : task.description

  const { active, done, groups, dueNowCount, overdueCount } = useMemo(() => {
    const activeTasks = tasks.filter(isActive)
    const doneTasks = tasks
      .filter((task) => !isActive(task))
      .sort((a, b) => (b.completed_at || b.due_at).localeCompare(a.completed_at || a.due_at))
    const grouped: Record<GroupKey, Task[]> = { overdue: [], today: [], week: [], later: [] }
    for (const task of activeTasks) grouped[groupOf(task)].push(task)
    return {
      active: activeTasks,
      done: doneTasks,
      groups: grouped,
      overdueCount: grouped.overdue.length,
      dueNowCount: grouped.overdue.length + grouped.today.length,
    }
  }, [tasks])

  useEffect(() => { if (!loading) updateAppBadge(dueNowCount) }, [dueNowCount, loading])

  const detailTask = tasks.find((task) => task.id === detailId) || null

  // ---------- Aktionen ----------

  const patchTask = async (id: string, payload: Record<string, unknown>): Promise<boolean> => {
    setBusyId(id)
    setError("")
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || `${t.tasks.error} (HTTP ${res.status})`)
        await loadTasks()
        return false
      }
      await loadTasks()
      return true
    } catch {
      setError(t.tasks.error)
      return false
    } finally {
      setBusyId(null)
    }
  }

  // Abhaken mit sofortiger Rueckmeldung; die Liste wartet nicht auf den Server
  const toggleDone = async (task: Task) => {
    const nextStatus: TaskStatus = isActive(task) ? "done" : "open"
    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id
          ? { ...item, status: nextStatus, completed_at: nextStatus === "done" ? new Date().toISOString() : null }
          : item,
      ),
    )
    if (typeof navigator.vibrate === "function") navigator.vibrate(15)

    const ok = await patchTask(task.id, { status: nextStatus })
    // Rueckgaengig nur bei einmaligen Aufgaben: bei wiederkehrenden legt der
    // Server beim Erledigen schon den naechsten Termin an.
    if (ok && nextStatus === "done" && task.recurrence === "none") {
      if (undoTimer.current) clearTimeout(undoTimer.current)
      setUndoTask(task)
      undoTimer.current = setTimeout(() => setUndoTask(null), 5000)
    }
  }

  const undoDone = async () => {
    if (!undoTask) return
    const task = undoTask
    setUndoTask(null)
    if (undoTimer.current) clearTimeout(undoTimer.current)
    await patchTask(task.id, { status: task.status === "in_progress" ? "in_progress" : "open" })
  }

  const saveNote = async (id: string) => {
    const ok = await patchTask(id, { completionNote: noteText.trim() })
    if (ok) setNoteEditing(false)
  }

  const deleteTask = async (id: string) => {
    if (!confirm(t.tasks.confirmDelete)) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
      if (res.ok) {
        setDetailId(null)
        await loadTasks()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || `${t.tasks.error} (HTTP ${res.status})`)
      }
    } catch {
      setError(t.tasks.error)
    } finally {
      setBusyId(null)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setTitle("")
    setDescription("")
    // Vorbelegung: morgen um 12:00 Uhr
    const tomorrow = new Date(Date.now() + DAY_MS)
    tomorrow.setHours(12, 0, 0, 0)
    setDueAt(toLocalInput(tomorrow.toISOString()))
    setPriority("normal")
    setReminderLead(24)
    setRecurrence("none")
    setFormError("")
    setFormOpen(true)
  }

  const openEdit = (task: Task) => {
    setDetailId(null)
    setEditingId(task.id)
    setTitle(task.title)
    setDescription(task.description || "")
    setDueAt(toLocalInput(task.due_at))
    setPriority(task.priority)
    setReminderLead(task.reminder_lead_hours)
    setRecurrence(task.recurrence)
    setFormError("")
    setFormOpen(true)
  }

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    if (title.trim().length < 2) {
      setFormError(t.tasks.titleRequired)
      return
    }
    if (!dueAt) {
      setFormError(t.tasks.dueRequired)
      return
    }

    setBusyId(editingId || "new")
    try {
      // Die Wiederholung laesst sich nur beim Anlegen waehlen (API erlaubt sie
      // beim Bearbeiten nicht)
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        dueAt: new Date(dueAt).toISOString(),
        priority,
        reminderLeadHours: reminderLead,
      }
      if (!editingId) payload.recurrence = recurrence

      const res = await fetch(editingId ? `/api/tasks/${editingId}` : "/api/tasks", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setFormOpen(false)
        setTab("active")
        await loadTasks()
      } else {
        const data = await res.json().catch(() => ({}))
        setFormError(data.error || `${t.tasks.error} (HTTP ${res.status})`)
      }
    } catch {
      setFormError(t.tasks.error)
    } finally {
      setBusyId(null)
    }
  }

  // ---------- Anzeige-Helfer ----------

  const dueLabel = (task: Task) => {
    const days = daysUntil(task.due_at)
    if (days === 0) {
      return new Date(task.due_at).getTime() < Date.now() ? t.tasks.overdueToday : t.tasks.dueToday
    }
    if (days === 1) return t.tasks.dueTomorrow
    if (days > 1) return t.tasks.daysLeft.replace("{n}", String(days))
    return days === -1 ? t.tasks.overdueSinceOne : t.tasks.overdueSince.replace("{n}", String(Math.abs(days)))
  }

  const dateLocale = locale === "ar" ? "ar-SY-u-nu-latn" : "de-DE"

  const formatDue = (iso: string) =>
    new Date(iso).toLocaleString(dateLocale, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })

  const formatFull = (iso: string) =>
    new Date(iso).toLocaleString(dateLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const groupTitle: Record<GroupKey, string> = {
    overdue: t.tasks.overdueSection,
    today: t.tasks.groupToday,
    week: t.tasks.groupWeek,
    later: t.tasks.groupLater,
  }

  // ---------- Zustaende ohne Liste ----------

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main id="main" className="flex-1 flex items-center justify-center pt-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main id="main" className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <ListTodo className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t.tasks.pageTitle}</h1>
            <p className="text-muted-foreground mb-6">{t.tasks.loginRequired}</p>
            <Button asChild size="lg" className="w-full h-12 text-base">
              <Link href="/login?next=/aufgaben">
                <LogIn className="h-5 w-5 me-2" />
                {t.tasks.login}
              </Link>
            </Button>
          </div>
        </main>
        <div className="hidden md:block"><Footer /></div>
      </div>
    )
  }

  // ---------- Bausteine ----------

  const renderRow = (task: Task) => {
    const overdue = isOverdue(task)
    const doneTask = !isActive(task)
    const busy = busyId === task.id

    return (
      <li key={task.id} className="flex items-stretch">
        {/* Abhak-Kreis: grosse Tippflaeche (48 px) wie in nativen Apps */}
        <button
          type="button"
          onClick={() => toggleDone(task)}
          disabled={busy}
          aria-label={doneTask ? t.tasks.reopen : t.tasks.markDone}
          className="flex items-center justify-center w-14 shrink-0 active:scale-90 transition-transform"
        >
          {doneTask ? (
            <CheckCircle2 className="h-7 w-7 text-primary fill-primary/15" />
          ) : (
            <Circle
              className={`h-7 w-7 ${overdue ? "text-destructive" : task.priority === "high" ? "text-orange-500" : "text-muted-foreground/60"}`}
              strokeWidth={1.75}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => { setDetailId(task.id); setNoteEditing(false) }}
          className="flex-1 min-w-0 flex items-center gap-2 py-3.5 pe-3 text-start active:bg-muted/60 transition-colors"
        >
          <span className="flex-1 min-w-0">
            <span
              dir="auto"
              className={`block text-[15px] font-medium leading-snug line-clamp-2 ${doneTask ? "line-through text-muted-foreground" : "text-foreground"}`}
            >
              {getTitle(task)}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
              {doneTask ? (
                task.completed_at && (
                  <span className="text-muted-foreground">
                    {t.tasks.completedAt} {formatDue(task.completed_at)}
                  </span>
                )
              ) : (
                <span className={`inline-flex items-center gap-1 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {overdue ? <AlarmClock className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
                  <span dir="auto">{formatDue(task.due_at)}</span>
                  <span aria-hidden>·</span>
                  {dueLabel(task)}
                </span>
              )}
              {task.status === "in_progress" && (
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <Timer className="h-3.5 w-3.5" />
                  {t.tasks.statusInProgress}
                </span>
              )}
              {task.priority === "high" && !doneTask && (
                <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[11px] font-semibold">
                  {t.tasks.priorityHigh}
                </span>
              )}
              {task.recurrence !== "none" && (
                <Repeat className="h-3.5 w-3.5 text-muted-foreground" aria-label={t.tasks.recurrences[task.recurrence]} />
              )}
              {task.completion_note && <StickyNote className="h-3.5 w-3.5 text-muted-foreground" aria-label={t.tasks.note} />}
            </span>
          </span>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0 rtl:rotate-180" />
          )}
        </button>
      </li>
    )
  }

  const renderGroup = (key: GroupKey) => {
    const items = groups[key]
    if (items.length === 0) return null
    return (
      <section key={key} aria-labelledby={`group-${key}`}>
        <h2
          id={`group-${key}`}
          className={`px-4 mb-1.5 text-[13px] font-semibold uppercase tracking-wide ${key === "overdue" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {groupTitle[key]} <span className="font-normal">({items.length})</span>
        </h2>
        <ul className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {items.map(renderRow)}
        </ul>
      </section>
    )
  }

  const selectClass =
    "w-full h-12 rounded-xl border border-input bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"

  // ---------- Seite ----------

  return (
    <div className="min-h-screen flex flex-col bg-secondary/40">
      <Header />

      <main id="main" className="flex-1 pt-20">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-32">
          {/* Grosser Titel wie in iOS, darunter die Zaehler */}
          <div className="flex items-end justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.tasks.pageTitle}</h1>
              {!loading && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.tasks.openCount.replace("{n}", String(active.length))}
                  {overdueCount > 0 && (
                    <span className="text-destructive font-medium">
                      {" · "}
                      {t.tasks.overdueCount.replace("{n}", String(overdueCount))}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {canAssign && (
                <Button asChild variant="ghost" size="icon" className="h-11 w-11 rounded-full" title={t.tasks.assignTasks}>
                  <Link href="/admin/aufgaben" aria-label={t.tasks.assignTasks}>
                    <UserPlus className="h-5 w-5" />
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={() => { setRefreshing(true); loadTasks() }}
                aria-label={t.tasks.refresh}
                title={t.tasks.refresh}
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Segment-Umschalter */}
          <div role="tablist" className="grid grid-cols-2 gap-1 p-1 mb-5 rounded-xl bg-muted">
            {(["active", "done"] as const).map((key) => {
              const count = key === "active" ? active.length : done.length
              const selected = tab === key
              return (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => setTab(key)}
                  className={`h-10 rounded-lg text-sm font-semibold transition-all ${selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {key === "active" ? t.tasks.tabActive : t.tasks.tabDone}
                  <span className={`ms-1.5 text-xs ${selected ? "text-primary" : ""}`}>{count}</span>
                </button>
              )
            })}
          </div>

          {error && (
            <div role="alert" className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[68px] rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : tab === "active" ? (
            active.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-10 w-10 text-primary" />
                </div>
                <p className="text-lg font-semibold text-foreground">{tasks.length ? t.tasks.allDone : t.tasks.empty}</p>
              </div>
            ) : (
              <div className="space-y-6">{(["overdue", "today", "week", "later"] as const).map(renderGroup)}</div>
            )
          ) : done.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">{t.tasks.emptyDone}</p>
          ) : (
            <ul className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {done.map(renderRow)}
            </ul>
          )}
        </div>
      </main>

      {/* Schwebender "+"-Knopf, ueber dem iPhone-Home-Balken */}
      <button
        type="button"
        onClick={openCreate}
        aria-label={t.tasks.newTaskShort}
        className="fixed z-40 end-5 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center gap-2 px-4 min-w-14 active:scale-95 transition-transform md:px-6"
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <Plus className="h-7 w-7" />
        <span className="hidden md:inline font-semibold">{t.tasks.newTaskShort}</span>
      </button>

      {/* Rueckgaengig-Leiste */}
      {undoTask && (
        <div
          className="fixed z-40 inset-x-4 md:inset-x-auto md:start-1/2 md:-translate-x-1/2 md:w-[28rem] rounded-xl bg-foreground text-background shadow-xl flex items-center gap-3 ps-4 pe-2 py-2"
          style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
          role="status"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
          <span className="flex-1 text-sm truncate">{t.tasks.doneToast}</span>
          <Button variant="ghost" size="sm" className="text-background hover:bg-background/10 hover:text-background font-semibold" onClick={undoDone}>
            {t.tasks.undo}
          </Button>
        </div>
      )}

      {/* Detail-Blatt */}
      <Drawer open={!!detailTask} onOpenChange={(open) => { if (!open) { setDetailId(null); setNoteEditing(false) } }}>
        <DrawerContent className="max-h-[92vh]">
          {detailTask && (() => {
            const task = detailTask
            const doneTask = !isActive(task)
            const overdue = isOverdue(task)
            const isOwn = task.created_by === userId
            const busy = busyId === task.id
            return (
              <div className="overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                <DrawerHeader className="px-0 text-start md:text-start">
                  <DrawerTitle dir="auto" className={`text-xl leading-snug ${doneTask ? "line-through text-muted-foreground" : ""}`}>
                    {getTitle(task)}
                  </DrawerTitle>
                  <DrawerDescription className="sr-only">{t.tasks.details}</DrawerDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${task.priority === "high" ? "bg-orange-100 text-orange-700" : task.priority === "low" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                      {t.tasks.priorities[task.priority]}
                    </span>
                    {task.status === "in_progress" && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">{t.tasks.statusInProgress}</span>
                    )}
                    {task.recurrence !== "none" && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground inline-flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        {t.tasks.recurrences[task.recurrence]}
                      </span>
                    )}
                    <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      {isOwn ? t.tasks.ownTask : t.tasks.assignedByOthers}
                    </span>
                  </div>
                </DrawerHeader>

                <div className={`rounded-xl p-4 mb-4 ${overdue ? "bg-destructive/10" : "bg-muted"}`}>
                  <div className={`flex items-center gap-2 text-sm font-medium ${overdue ? "text-destructive" : "text-foreground"}`}>
                    {overdue ? <AlarmClock className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                    {t.tasks.due}
                  </div>
                  <p className="mt-1 text-base">{formatFull(task.due_at)}</p>
                  {!doneTask && (
                    <p className={`text-sm mt-0.5 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>{dueLabel(task)}</p>
                  )}
                  {doneTask && task.completed_at && (
                    <p className="text-sm mt-2 text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      {t.tasks.completedAt}: {formatFull(task.completed_at)}
                    </p>
                  )}
                </div>

                {getDescription(task) && (
                  <p dir="auto" className="text-[15px] leading-relaxed text-foreground whitespace-pre-line mb-4 text-start">{getDescription(task)}</p>
                )}

                {noteEditing ? (
                  <div className="mb-4 flex flex-col gap-2">
                    <Label htmlFor="task-note">{t.tasks.note}</Label>
                    <Textarea
                      id="task-note"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder={t.tasks.notePlaceholder}
                      rows={3}
                      maxLength={1000}
                      className="text-base"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="h-11" onClick={() => setNoteEditing(false)}>{t.tasks.cancel}</Button>
                      <Button className="h-11" onClick={() => saveNote(task.id)} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t.tasks.save}
                      </Button>
                    </div>
                  </div>
                ) : (
                  task.completion_note && (
                    <button
                      type="button"
                      onClick={() => { setNoteText(task.completion_note); setNoteEditing(true) }}
                      className="w-full text-start mb-4 text-sm text-muted-foreground bg-muted rounded-xl px-4 py-3 flex gap-2"
                    >
                      <StickyNote className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="whitespace-pre-line">{task.completion_note}</span>
                    </button>
                  )
                )}

                {/* Grosse Aktionsknoepfe */}
                <div className="flex flex-col gap-2">
                  {doneTask ? (
                    <Button size="lg" variant="outline" className="h-12 text-base" onClick={() => toggleDone(task)} disabled={busy}>
                      <RotateCcw className="h-5 w-5 me-2" />
                      {t.tasks.reopen}
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="lg"
                        className="h-12 text-base"
                        onClick={async () => { setDetailId(null); await toggleDone(task) }}
                        disabled={busy}
                      >
                        <Check className="h-5 w-5 me-2" />
                        {t.tasks.markDone}
                      </Button>
                      {task.status === "open" && (
                        <Button
                          size="lg"
                          variant="outline"
                          className="h-12 text-base"
                          onClick={() => patchTask(task.id, { status: "in_progress" })}
                          disabled={busy}
                        >
                          <Timer className="h-5 w-5 me-2" />
                          {t.tasks.markInProgress}
                        </Button>
                      )}
                    </>
                  )}

                  <div className={`grid gap-2 ${isOwn ? "grid-cols-3" : "grid-cols-1"}`}>
                    {!noteEditing && (
                      <Button
                        variant="secondary"
                        className="h-12 flex-col gap-0.5 text-xs"
                        onClick={() => { setNoteText(task.completion_note || ""); setNoteEditing(true) }}
                      >
                        <StickyNote className="h-5 w-5" />
                        {t.tasks.note.replace(/\s*\(.*\)/, "")}
                      </Button>
                    )}
                    {isOwn && (
                      <>
                        <Button variant="secondary" className="h-12 flex-col gap-0.5 text-xs" onClick={() => openEdit(task)}>
                          <Pencil className="h-5 w-5" />
                          {t.tasks.edit}
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-12 flex-col gap-0.5 text-xs text-destructive hover:text-destructive"
                          onClick={() => deleteTask(task.id)}
                          disabled={busy}
                        >
                          <Trash2 className="h-5 w-5" />
                          {t.tasks.delete}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </DrawerContent>
      </Drawer>

      {/* Formular-Blatt: neue Aufgabe / bearbeiten */}
      <Drawer open={formOpen} onOpenChange={setFormOpen}>
        <DrawerContent className="max-h-[95vh]">
          <form onSubmit={saveTask} className="flex flex-col min-h-0">
            <DrawerHeader className="text-start md:text-start px-5">
              <DrawerTitle className="text-xl">{editingId ? t.tasks.editTask : t.tasks.newTaskShort}</DrawerTitle>
              <DrawerDescription className="sr-only">{t.tasks.reminderHint}</DrawerDescription>
            </DrawerHeader>

            <div className="overflow-y-auto px-5 flex flex-col gap-4 pb-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-title">{t.tasks.titleLabel}</Label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  required
                  className="h-12 text-base rounded-xl"
                  autoComplete="off"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-description">{t.tasks.descriptionLabel}</Label>
                <Textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="text-base rounded-xl"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-due">{t.tasks.dueLabel}</Label>
                <Input
                  id="task-due"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  required
                  className="h-12 text-base rounded-xl"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">{t.tasks.priorityLabel}</span>
                <div role="radiogroup" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted">
                  {TASK_PRIORITIES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={priority === value}
                      onClick={() => setPriority(value)}
                      className={`h-10 rounded-lg text-sm font-medium transition-all ${priority === value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                    >
                      {t.tasks.priorities[value]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="task-reminder">{t.tasks.reminderLabel}</Label>
                  <select
                    id="task-reminder"
                    value={reminderLead}
                    onChange={(e) => setReminderLead(Number(e.target.value))}
                    className={selectClass}
                  >
                    {REMINDER_LEAD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t.tasks.reminders[String(option.value) as keyof typeof t.tasks.reminders]}
                      </option>
                    ))}
                  </select>
                </div>

                {!editingId && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="task-recurrence">{t.tasks.recurrenceLabel}</Label>
                    <select
                      id="task-recurrence"
                      value={recurrence}
                      onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
                      className={selectClass}
                    >
                      {TASK_RECURRENCES.map((value) => (
                        <option key={value} value={value}>{t.tasks.recurrences[value]}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">{t.tasks.reminderHint}</p>

              {formError && (
                <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">{formError}</p>
              )}
            </div>

            <div
              className="grid grid-cols-2 gap-2 px-5 pt-3 border-t border-border bg-background"
              style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            >
              <Button type="button" variant="outline" className="h-12 text-base" onClick={() => setFormOpen(false)}>
                {t.tasks.cancel}
              </Button>
              <Button type="submit" className="h-12 text-base" disabled={busyId !== null}>
                {busyId ? <Loader2 className="h-5 w-5 animate-spin" /> : t.tasks.save}
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Am Handy keine Webseiten-Fusszeile unter der App-Maske */}
      <div className="hidden md:block"><Footer /></div>
    </div>
  )
}
