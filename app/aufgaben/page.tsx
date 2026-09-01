"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ListTodo,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  RotateCcw,
  StickyNote,
  Trash2,
  UserPlus,
  X,
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

export default function MyTasksPage() {
  const { t, locale } = useLanguage()

  const [tasks, setTasks] = useState<Task[]>([])
  const [userId, setUserId] = useState("")
  const [canAssign, setCanAssign] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [noteText, setNoteText] = useState("")

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("normal")
  const [reminderLead, setReminderLead] = useState(24)
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("none")

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check")
      if (res.ok) {
        const data = await res.json()
        setAuthenticated(true)
        setUserId(data.user?.id || "")
        // Wer Aufgaben zuweisen darf, bekommt den Link in den Admin-Bereich
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
      const res = await fetch("/api/tasks")
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      } else {
        setError(t.tasks.error)
      }
    } catch {
      setError(t.tasks.error)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => { if (authenticated) loadTasks() }, [authenticated, loadTasks])

  const getTitle = (task: Task) => (locale === "ar" && task.title_ar ? task.title_ar : task.title)
  const getDescription = (task: Task) =>
    locale === "ar" && task.description_ar ? task.description_ar : task.description

  const { overdue, open, done } = useMemo(() => {
    const now = Date.now()
    const active = tasks.filter((task) => task.status === "open" || task.status === "in_progress")
    return {
      overdue: active.filter((task) => new Date(task.due_at).getTime() < now),
      open: active.filter((task) => new Date(task.due_at).getTime() >= now),
      done: tasks.filter((task) => task.status === "done" || task.status === "cancelled"),
    }
  }, [tasks])

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setTitle("")
    setDescription("")
    setDueAt("")
    setPriority("normal")
    setReminderLead(24)
    setRecurrence("none")
  }

  const startCreate = () => {
    resetForm()
    // Vorbelegung: morgen um 12:00 Uhr
    const tomorrow = new Date(Date.now() + DAY_MS)
    tomorrow.setHours(12, 0, 0, 0)
    setDueAt(toLocalInput(tomorrow.toISOString()))
    setShowForm(true)
    setError("")
  }

  const startEdit = (task: Task) => {
    setEditingId(task.id)
    setTitle(task.title)
    setDescription(task.description || "")
    setDueAt(toLocalInput(task.due_at))
    setPriority(task.priority)
    setReminderLead(task.reminder_lead_hours)
    setRecurrence(task.recurrence)
    setShowForm(true)
    setError("")
  }

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (title.trim().length < 2) {
      setError(t.tasks.titleRequired)
      return
    }
    if (!dueAt) {
      setError(t.tasks.dueRequired)
      return
    }

    setBusyId(editingId || "new")
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        dueAt: new Date(dueAt).toISOString(),
        priority,
        reminderLeadHours: reminderLead,
        recurrence,
      }
      const res = await fetch(editingId ? `/api/tasks/${editingId}` : "/api/tasks", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        resetForm()
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

  const patchTask = async (id: string, payload: Record<string, unknown>) => {
    setBusyId(id)
    setError("")
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
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

  const saveNote = async (id: string) => {
    await patchTask(id, { completionNote: noteText.trim() })
    setNoteFor(null)
    setNoteText("")
  }

  const deleteTask = async (id: string) => {
    if (!confirm(t.tasks.confirmDelete)) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
      if (res.ok) {
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

  // Restlaufzeit bzw. Verzug in Worten
  const dueLabel = (task: Task) => {
    const days = daysUntil(task.due_at)
    if (days === 0) {
      return new Date(task.due_at).getTime() < Date.now() ? t.tasks.overdueToday : t.tasks.dueToday
    }
    if (days === 1) return t.tasks.dueTomorrow
    if (days > 1) return t.tasks.daysLeft.replace("{n}", String(days))
    return t.tasks.overdueSince.replace("{n}", String(Math.abs(days)))
  }

  const formatDue = (iso: string) =>
    new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const priorityClass: Record<TaskPriority, string> = {
    low: "bg-muted text-muted-foreground",
    normal: "bg-primary/10 text-primary",
    high: "bg-orange-100 text-orange-700",
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
            <ListTodo className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">{t.tasks.pageTitle}</h1>
            <p className="text-muted-foreground mb-6">{t.tasks.loginRequired}</p>
            <Button asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4 mr-2" />
                {t.tasks.login}
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const renderTask = (task: Task, isOverdue: boolean) => {
    const isOwn = task.created_by === userId
    const isDone = task.status === "done" || task.status === "cancelled"
    const busy = busyId === task.id

    return (
      <div
        key={task.id}
        className={`bg-muted p-5 rounded-xl ${isOverdue ? "ring-2 ring-destructive/40" : ""} ${isDone ? "opacity-70" : ""}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className={`text-lg font-bold text-foreground ${isDone ? "line-through" : ""}`}>
                {getTitle(task)}
              </h3>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priorityClass[task.priority]}`}>
                {t.tasks.priorities[task.priority]}
              </span>
              {task.status === "in_progress" && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                  {t.tasks.statusInProgress}
                </span>
              )}
              {task.recurrence !== "none" && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                  {t.tasks.recurrences[task.recurrence]}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {isOwn ? t.tasks.ownTask : t.tasks.assignedByOthers}
              </span>
            </div>

            {getDescription(task) && (
              <p className="text-sm text-muted-foreground whitespace-pre-line mb-2">{getDescription(task)}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {isOverdue ? <AlarmClock className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                {t.tasks.due}: {formatDue(task.due_at)}
              </span>
              {!isDone && (
                <span className={isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                  {dueLabel(task)}
                </span>
              )}
              {isDone && task.completed_at && (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {t.tasks.completedAt}: {formatDue(task.completed_at)}
                </span>
              )}
            </div>

            {task.completion_note && (
              <p className="mt-2 text-sm text-muted-foreground bg-background rounded-lg px-3 py-2">
                <StickyNote className="h-3.5 w-3.5 inline mr-1" />
                {task.completion_note}
              </p>
            )}

            {noteFor === task.id && (
              <div className="mt-3 flex flex-col gap-2">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={t.tasks.notePlaceholder}
                  rows={2}
                  maxLength={1000}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveNote(task.id)} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t.tasks.save}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setNoteFor(null); setNoteText("") }}>
                    {t.tasks.cancel}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {!isDone && (
              <>
                {task.status === "open" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patchTask(task.id, { status: "in_progress" })}
                    disabled={busy}
                  >
                    {t.tasks.markInProgress}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => patchTask(task.id, { status: "done" })}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-1" />}
                  {t.tasks.markDone}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title={t.tasks.note}
                  onClick={() => { setNoteFor(task.id); setNoteText(task.completion_note || "") }}
                >
                  <StickyNote className="h-4 w-4" />
                </Button>
              </>
            )}

            {isDone && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => patchTask(task.id, { status: "open" })}
                disabled={busy}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {t.tasks.reopen}
              </Button>
            )}

            {isOwn && (
              <>
                <Button size="sm" variant="ghost" onClick={() => startEdit(task)} title={t.tasks.titleLabel}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteTask(task.id)}
                  disabled={busy}
                  title={t.tasks.delete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <ListTodo className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t.tasks.pageTitle}</h1>
            <p className="text-xl text-muted-foreground">{t.tasks.pageSubtitle}</p>
            {!loading && (
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {t.tasks.openCount.replace("{n}", String(open.length + overdue.length))}
                </span>
                {overdue.length > 0 && (
                  <span className="text-sm font-medium bg-destructive/10 text-destructive px-3 py-1 rounded-full">
                    {t.tasks.overdueCount.replace("{n}", String(overdue.length))}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={showForm ? resetForm : startCreate} variant={showForm ? "outline" : "default"}>
                  {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {showForm ? t.tasks.cancel : t.tasks.newTask}
                </Button>

                {canAssign && (
                  <Button asChild variant="outline">
                    <Link href="/admin/aufgaben">
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t.tasks.assignTasks}
                    </Link>
                  </Button>
                )}
              </div>
              {done.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setShowDone((prev) => !prev)}>
                  {showDone ? t.tasks.hideDone : t.tasks.showDone}
                </Button>
              )}
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4 text-sm text-center">{error}</div>
            )}

            {showForm && (
              <form onSubmit={saveTask} className="bg-muted p-6 rounded-xl mb-8 flex flex-col gap-4">
                <div>
                  <Label htmlFor="task-title">{t.tasks.titleLabel}</Label>
                  <Input
                    id="task-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="task-description">{t.tasks.descriptionLabel}</Label>
                  <Textarea
                    id="task-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    maxLength={2000}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="task-due">{t.tasks.dueLabel}</Label>
                    <Input
                      id="task-due"
                      type="datetime-local"
                      value={dueAt}
                      onChange={(e) => setDueAt(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="task-priority">{t.tasks.priorityLabel}</Label>
                    <select
                      id="task-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {TASK_PRIORITIES.map((value) => (
                        <option key={value} value={value}>{t.tasks.priorities[value]}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="task-reminder">{t.tasks.reminderLabel}</Label>
                    <select
                      id="task-reminder"
                      value={reminderLead}
                      onChange={(e) => setReminderLead(Number(e.target.value))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {REMINDER_LEAD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t.tasks.reminders[String(option.value) as keyof typeof t.tasks.reminders]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="task-recurrence">{t.tasks.recurrenceLabel}</Label>
                    <select
                      id="task-recurrence"
                      value={recurrence}
                      onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {TASK_RECURRENCES.map((value) => (
                        <option key={value} value={value}>{t.tasks.recurrences[value]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{t.tasks.reminderHint}</p>

                <div className="flex gap-2">
                  <Button type="submit" disabled={busyId !== null}>
                    {busyId ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t.tasks.saving}</> : t.tasks.save}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetForm}>{t.tasks.cancel}</Button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 bg-muted rounded-2xl">
                <ListTodo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t.tasks.empty}</p>
              </div>
            ) : (
              <div className="space-y-8">
                {overdue.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 text-destructive flex items-center gap-2">
                      <AlarmClock className="h-5 w-5" />
                      {t.tasks.overdueSection}
                    </h2>
                    <div className="space-y-4">{overdue.map((task) => renderTask(task, true))}</div>
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-bold mb-4">{t.tasks.openSection}</h2>
                  {open.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t.tasks.empty}</p>
                  ) : (
                    <div className="space-y-4">{open.map((task) => renderTask(task, false))}</div>
                  )}
                </div>

                {showDone && done.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">{t.tasks.doneSection}</h2>
                    <div className="space-y-4">{done.map((task) => renderTask(task, false))}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
