"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlarmClock,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ListTodo,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  Trash2,
  UserCircle,
  X,
} from "lucide-react"
import {
  REMINDER_LEAD_OPTIONS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_RECURRENCES,
  TASK_RECURRENCE_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type TaskPriority,
  type TaskRecurrence,
  type TaskStatus,
} from "@/lib/tasks"

interface UserRef {
  id: string
  name: string | null
  email: string | null
}

interface AdminTask {
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
  escalate_to_creator: boolean
  recurrence: TaskRecurrence
  assignee: UserRef | null
  creator: UserRef | null
}

const DAY_MS = 86_400_000

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const priorityClass: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-orange-100 text-orange-700",
}

const statusClass: Record<TaskStatus, string> = {
  open: "bg-secondary text-foreground",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-muted text-muted-foreground",
}

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [users, setUsers] = useState<UserRef[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accessError, setAccessError] = useState("")
  const [actionError, setActionError] = useState("")
  const [reminderInfo, setReminderInfo] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [sendingReminders, setSendingReminders] = useState(false)

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  const [filterStatus, setFilterStatus] = useState("")
  const [filterUser, setFilterUser] = useState("")
  const [onlyOverdue, setOnlyOverdue] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [assignedTo, setAssignedTo] = useState("")
  const [title, setTitle] = useState("")
  const [titleAr, setTitleAr] = useState("")
  const [description, setDescription] = useState("")
  const [descriptionAr, setDescriptionAr] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("normal")
  const [reminderLead, setReminderLead] = useState(24)
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("none")
  const [escalate, setEscalate] = useState(false)
  const [notify, setNotify] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check")
      if (res.ok) setAuthenticated(true)
    } catch {
      // nicht angemeldet
    } finally {
      setChecking(false)
    }
  }, [])

  const loadTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set("status", filterStatus)
      if (filterUser) params.set("assignedTo", filterUser)
      const query = params.toString()

      const res = await fetch(`/api/admin/tasks${query ? `?${query}` : ""}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
        setAccessError("")
      } else {
        setAccessError("Keine Berechtigung für Aufgaben.")
      }
    } catch {
      setAccessError("Fehler beim Laden.")
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterUser])

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tasks/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch {
      setUsers([])
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])
  useEffect(() => {
    if (authenticated) {
      loadTasks()
      loadUsers()
    }
  }, [authenticated, loadTasks, loadUsers])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      if (res.ok) {
        setAuthenticated(true)
      } else {
        const data = await res.json()
        setLoginError(data.error || "Login fehlgeschlagen.")
      }
    } catch {
      setLoginError("Verbindungsfehler.")
    } finally {
      setLoginLoading(false)
    }
  }

  const visibleTasks = useMemo(() => {
    if (!onlyOverdue) return tasks
    const now = Date.now()
    return tasks.filter(
      (task) =>
        (task.status === "open" || task.status === "in_progress") &&
        new Date(task.due_at).getTime() < now,
    )
  }, [tasks, onlyOverdue])

  const overdueCount = useMemo(() => {
    const now = Date.now()
    return tasks.filter(
      (task) =>
        (task.status === "open" || task.status === "in_progress") &&
        new Date(task.due_at).getTime() < now,
    ).length
  }, [tasks])

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setAssignedTo("")
    setTitle("")
    setTitleAr("")
    setDescription("")
    setDescriptionAr("")
    setDueAt("")
    setPriority("normal")
    setReminderLead(24)
    setRecurrence("none")
    setEscalate(false)
    setNotify(true)
  }

  const startCreate = () => {
    resetForm()
    const tomorrow = new Date(Date.now() + DAY_MS)
    tomorrow.setHours(12, 0, 0, 0)
    setDueAt(toLocalInput(tomorrow.toISOString()))
    setShowForm(true)
    setActionError("")
  }

  const startEdit = (task: AdminTask) => {
    setEditingId(task.id)
    setAssignedTo(task.assigned_to)
    setTitle(task.title)
    setTitleAr(task.title_ar || "")
    setDescription(task.description || "")
    setDescriptionAr(task.description_ar || "")
    setDueAt(toLocalInput(task.due_at))
    setPriority(task.priority)
    setReminderLead(task.reminder_lead_hours)
    setRecurrence(task.recurrence)
    setEscalate(task.escalate_to_creator)
    setShowForm(true)
    setActionError("")
  }

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionError("")
    if (!assignedTo) {
      setActionError("Bitte eine zuständige Person auswählen.")
      return
    }
    if (title.trim().length < 2) {
      setActionError("Bitte einen Titel (mindestens 2 Zeichen) angeben.")
      return
    }
    if (!dueAt) {
      setActionError("Bitte eine Frist angeben.")
      return
    }

    setSavingId(editingId || "new")
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        titleAr: titleAr.trim(),
        description: description.trim(),
        descriptionAr: descriptionAr.trim(),
        assignedTo,
        dueAt: new Date(dueAt).toISOString(),
        priority,
        reminderLeadHours: reminderLead,
        escalateToCreator: escalate,
        recurrence,
      }
      // Die Zuweisungs-Mail gibt es nur beim Anlegen
      if (!editingId) payload.notify = notify

      const res = await fetch(editingId ? `/api/admin/tasks/${editingId}` : "/api/admin/tasks", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        if (!editingId && notify && data.mailSent === false) {
          setActionError("Aufgabe angelegt, aber die Benachrichtigungs-Mail konnte nicht versendet werden.")
        }
        resetForm()
        await loadTasks()
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(`Speichern fehlgeschlagen (${res.status}): ${data.error || "Unbekannter Fehler"}`)
      }
    } catch {
      setActionError("Verbindungsfehler — Speichern fehlgeschlagen.")
    } finally {
      setSavingId(null)
    }
  }

  const changeStatus = async (task: AdminTask, status: TaskStatus) => {
    setSavingId(task.id)
    setActionError("")
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        await loadTasks()
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || "Status konnte nicht geändert werden.")
      }
    } catch {
      setActionError("Verbindungsfehler.")
    } finally {
      setSavingId(null)
    }
  }

  const deleteTask = async (task: AdminTask) => {
    if (!confirm(`Aufgabe "${task.title}" wirklich löschen?`)) return
    setSavingId(task.id)
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}`, { method: "DELETE" })
      if (res.ok) {
        await loadTasks()
      } else {
        setActionError("Löschen fehlgeschlagen.")
      }
    } catch {
      setActionError("Verbindungsfehler.")
    } finally {
      setSavingId(null)
    }
  }

  // Denselben Job wie der Scheduler ausloesen — nuetzlich zum Testen
  const sendReminders = async () => {
    setSendingReminders(true)
    setReminderInfo("")
    setActionError("")
    try {
      const res = await fetch("/api/cron/task-reminders", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setReminderInfo(
          `${data.checked} Aufgaben geprüft · ${data.dueSoonSent} Vorab-Erinnerung(en) · ${data.overdueSent} Überfällig-Mail(s)` +
            (data.failed ? ` · ${data.failed} fehlgeschlagen` : ""),
        )
      } else {
        setActionError(data.error || "Erinnerungen konnten nicht versendet werden.")
      }
    } catch {
      setActionError("Verbindungsfehler.")
    } finally {
      setSendingReminders(false)
    }
  }

  const formatDue = (iso: string) =>
    new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const userLabel = (user: UserRef | null) => user?.name || user?.email || "Unbekannt"

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
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <LogIn className="h-12 w-12 text-primary mx-auto mb-4" />
              <h1 className="text-3xl font-bold">Admin Login</h1>
              <p className="text-muted-foreground mt-2">Melden Sie sich an, um Aufgaben zu verwalten.</p>
            </div>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Passwort</Label>
                <Input id="password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loginLoading} className="w-full">
                {loginLoading ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Wird angemeldet...</>) : "Anmelden"}
              </Button>
              {loginError && <p className="text-destructive text-sm text-center">{loginError}</p>}
            </form>
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
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-5xl mx-auto text-center">
            <ListTodo className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Aufgaben verwalten</h1>
            <p className="text-xl text-muted-foreground">
              Aufgaben mit Frist zuweisen — Erinnerungen gehen automatisch per E-Mail raus
            </p>
            {overdueCount > 0 && (
              <span className="inline-block mt-4 text-sm font-medium bg-destructive/10 text-destructive px-3 py-1 rounded-full">
                {overdueCount} überfällig
              </span>
            )}
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-5xl mx-auto">
            {accessError ? (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center">{accessError}</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <Button onClick={showForm ? resetForm : startCreate} variant={showForm ? "outline" : "default"}>
                    {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {showForm ? "Abbrechen" : "Neue Aufgabe"}
                  </Button>

                  <Button variant="outline" onClick={sendReminders} disabled={sendingReminders}>
                    {sendingReminders ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <BellRing className="h-4 w-4 mr-2" />
                    )}
                    Erinnerungen jetzt senden
                  </Button>

                  <div className="flex flex-wrap items-center gap-2 ml-auto">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Alle Status</option>
                      {TASK_STATUSES.map((value) => (
                        <option key={value} value={value}>{TASK_STATUS_LABELS[value]}</option>
                      ))}
                    </select>

                    <select
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Alle Personen</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>{userLabel(user)}</option>
                      ))}
                    </select>

                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={onlyOverdue}
                        onChange={(e) => setOnlyOverdue(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Nur überfällige
                    </label>
                  </div>
                </div>

                {reminderInfo && (
                  <div className="bg-green-100 text-green-800 p-3 rounded-lg mb-4 text-sm text-center">{reminderInfo}</div>
                )}
                {actionError && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4 text-sm text-center">{actionError}</div>
                )}

                {showForm && (
                  <form onSubmit={saveTask} className="bg-muted p-6 rounded-xl mb-8 flex flex-col gap-4">
                    <h2 className="text-lg font-bold">
                      {editingId ? "Aufgabe bearbeiten" : "Neue Aufgabe zuweisen"}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="assignee">Zuständige Person</Label>
                        <select
                          id="assignee"
                          value={assignedTo}
                          onChange={(e) => setAssignedTo(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                          required
                        >
                          <option value="">Bitte auswählen</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>{userLabel(user)}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="due">Frist (Datum und Uhrzeit)</Label>
                        <Input
                          id="due"
                          type="datetime-local"
                          value={dueAt}
                          onChange={(e) => setDueAt(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Titel</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
                      </div>
                      <div>
                        <Label htmlFor="title-ar">Titel (Arabisch, optional)</Label>
                        <Input id="title-ar" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} maxLength={200} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="description">Beschreibung</Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                          maxLength={2000}
                        />
                      </div>
                      <div>
                        <Label htmlFor="description-ar">Beschreibung (Arabisch, optional)</Label>
                        <Textarea
                          id="description-ar"
                          dir="rtl"
                          value={descriptionAr}
                          onChange={(e) => setDescriptionAr(e.target.value)}
                          rows={3}
                          maxLength={2000}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="priority">Priorität</Label>
                        <select
                          id="priority"
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as TaskPriority)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {TASK_PRIORITIES.map((value) => (
                            <option key={value} value={value}>{TASK_PRIORITY_LABELS[value]}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="reminder">Vorab-Erinnerung</Label>
                        <select
                          id="reminder"
                          value={reminderLead}
                          onChange={(e) => setReminderLead(Number(e.target.value))}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {REMINDER_LEAD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="recurrence">Wiederholung</Label>
                        <select
                          id="recurrence"
                          value={recurrence}
                          onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {TASK_RECURRENCES.map((value) => (
                            <option key={value} value={value}>{TASK_RECURRENCE_LABELS[value]}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={escalate}
                          onChange={(e) => setEscalate(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Bei Überfälligkeit eine Kopie an mich senden
                      </label>

                      {!editingId && (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={notify}
                            onChange={(e) => setNotify(e.target.checked)}
                            className="h-4 w-4"
                          />
                          Zuständige Person jetzt per E-Mail informieren
                        </label>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Erinnerungen laufen über den Job <code>/api/cron/task-reminders</code>: eine Vorab-Mail vor der Frist
                      und danach täglich eine Mail, solange die Aufgabe offen ist (höchstens 5).
                    </p>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={savingId !== null}>
                        {savingId ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Wird gespeichert...</>) : "Speichern"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={resetForm}>Abbrechen</Button>
                    </div>
                  </form>
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : visibleTasks.length === 0 ? (
                  <div className="text-center py-12 bg-muted rounded-2xl">
                    <ListTodo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Keine Aufgaben gefunden.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visibleTasks.map((task) => {
                      const isActive = task.status === "open" || task.status === "in_progress"
                      const isOverdue = isActive && new Date(task.due_at).getTime() < Date.now()
                      const busy = savingId === task.id

                      return (
                        <div
                          key={task.id}
                          className={`bg-muted p-5 rounded-xl ${isOverdue ? "ring-2 ring-destructive/40" : ""}`}
                        >
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-foreground">{task.title}</h3>
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusClass[task.status]}`}>
                                  {TASK_STATUS_LABELS[task.status]}
                                </span>
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priorityClass[task.priority]}`}>
                                  {TASK_PRIORITY_LABELS[task.priority]}
                                </span>
                                {task.recurrence !== "none" && (
                                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                                    {TASK_RECURRENCE_LABELS[task.recurrence]}
                                  </span>
                                )}
                              </div>

                              {task.description && (
                                <p className="text-sm text-muted-foreground whitespace-pre-line mb-2">{task.description}</p>
                              )}

                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <UserCircle className="h-4 w-4" />
                                  {userLabel(task.assignee)}
                                </span>
                                <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : ""}`}>
                                  {isOverdue ? <AlarmClock className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                                  Frist: {formatDue(task.due_at)}
                                </span>
                                {task.completed_at && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Erledigt: {formatDue(task.completed_at)}
                                  </span>
                                )}
                                {task.escalate_to_creator && (
                                  <span className="text-xs">Eskalation an {userLabel(task.creator)}</span>
                                )}
                              </div>

                              {task.completion_note && (
                                <p className="mt-2 text-sm text-muted-foreground bg-background rounded-lg px-3 py-2">
                                  {task.completion_note}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-start gap-2 flex-shrink-0">
                              <select
                                value={task.status}
                                onChange={(e) => changeStatus(task, e.target.value as TaskStatus)}
                                disabled={busy}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                              >
                                {TASK_STATUSES.map((value) => (
                                  <option key={value} value={value}>{TASK_STATUS_LABELS[value]}</option>
                                ))}
                              </select>

                              <Button variant="outline" size="sm" onClick={() => startEdit(task)} title="Bearbeiten">
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteTask(task)}
                                disabled={busy}
                                title="Löschen"
                              >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
