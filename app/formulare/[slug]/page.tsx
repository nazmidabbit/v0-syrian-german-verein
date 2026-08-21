"use client"

import React, { useCallback, useEffect, useState, use } from "react"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle2, FileQuestion, Loader2, Send } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import type { FormFieldDef } from "@/lib/forms"

interface PublicForm {
  id: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  slug: string
}

const SELECT_CLASSES =
  "border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"

export default function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { t, locale } = useLanguage()
  const td = t.dynamicForm

  const [form, setForm] = useState<PublicForm | null>(null)
  const [fields, setFields] = useState<FormFieldDef[]>([])
  const [formToken, setFormToken] = useState("")
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [values, setValues] = useState<Record<string, string | boolean>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})
  // Honeypot ausserhalb der eigentlichen Formulardaten
  const [honeypot, setHoneypot] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")
  const [serverError, setServerError] = useState("")

  const loadForm = useCallback(async () => {
    try {
      const res = await fetch(`/api/forms/${slug}`)
      if (res.ok) {
        const data = await res.json()
        setForm(data.form)
        setFields(data.fields || [])
        setFormToken(data.token || "")
        const initial: Record<string, string | boolean> = {}
        for (const field of data.fields || []) {
          initial[field.field_key] = field.field_type === "checkbox" ? false : ""
        }
        setValues(initial)
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadForm()
  }, [loadForm])

  const label = (field: FormFieldDef) => (locale === "ar" && field.label_ar ? field.label_ar : field.label)

  const setValue = (key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: false }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError("")

    // Client-Validierung: Pflichtfelder
    const errors: Record<string, boolean> = {}
    for (const field of fields) {
      const value = values[field.field_key]
      if (field.required && (field.field_type === "checkbox" ? value !== true : !String(value ?? "").trim())) {
        errors[field.field_key] = true
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setStatus("sending")
    try {
      const res = await fetch(`/api/forms/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formToken, company: honeypot, data: values }),
      })

      if (res.ok) {
        setStatus("sent")
        return
      }

      const data = await res.json().catch(() => ({}))
      if (res.status === 429) {
        setServerError(td.errorRateLimited)
      } else if (data.error === "invalidToken") {
        await loadForm()
        setServerError(td.errorToken)
      } else if (data.error === "validation") {
        setServerError(td.errorValidation)
      } else {
        setServerError(td.errorGeneric)
      }
      setStatus("idle")
    } catch {
      setServerError(td.errorGeneric)
      setStatus("idle")
    }
  }

  const renderField = (field: FormFieldDef) => {
    const key = field.field_key
    const value = values[key]

    if (field.field_type === "checkbox") {
      return (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-primary"
            checked={value === true}
            onChange={(e) => setValue(key, e.target.checked)}
          />
          <span className="text-sm text-foreground leading-relaxed">
            {label(field)}
            {field.required ? " *" : ""}
          </span>
        </label>
      )
    }

    return (
      <div>
        <Label htmlFor={`field-${key}`}>
          {label(field)}
          {field.required ? " *" : ""}
        </Label>
        {field.field_type === "textarea" ? (
          <Textarea
            id={`field-${key}`}
            rows={4}
            maxLength={2000}
            value={String(value ?? "")}
            onChange={(e) => setValue(key, e.target.value)}
          />
        ) : field.field_type === "select" ? (
          <select
            id={`field-${key}`}
            className={SELECT_CLASSES}
            value={String(value ?? "")}
            onChange={(e) => setValue(key, e.target.value)}
          >
            <option value="">{td.selectPlaceholder}</option>
            {field.options.map((option, index) => (
              <option key={option} value={option}>
                {locale === "ar" && field.options_ar[index] ? field.options_ar[index] : option}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id={`field-${key}`}
            type={field.field_type === "number" ? "text" : field.field_type}
            inputMode={field.field_type === "number" ? "decimal" : undefined}
            maxLength={300}
            value={String(value ?? "")}
            onChange={(e) => setValue(key, e.target.value)}
          />
        )}
      </div>
    )
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

  if (notFound || !form) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <FileQuestion className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-6">{td.notFound}</p>
            <Button asChild>
              <Link href="/">{td.backHome}</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (status === "sent") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="max-w-lg text-center py-20">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">{td.successTitle}</h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">{td.successText}</p>
            <Button asChild size="lg">
              <Link href="/">{td.backHome}</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const title = locale === "ar" && form.title_ar ? form.title_ar : form.title
  const description = locale === "ar" && form.description_ar ? form.description_ar : form.description

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        {/* Kopfbereich: jedes Formular traegt das Vereinslogo */}
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <Image
              src="/images/logo.jpg"
              alt="Logo der Syrischen Gemeinschaft"
              width={80}
              height={80}
              className="rounded-xl mx-auto mb-6"
            />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{title}</h1>
            {description && <p className="text-xl text-muted-foreground whitespace-pre-wrap">{description}</p>}
          </div>
        </section>

        <section className="py-16 px-6 bg-background">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
              {/* Honeypot: fuer Menschen unsichtbar, Bots fuellen es aus */}
              <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="form_check_field">Bitte nicht ausfüllen</label>
                <input
                  id="form_check_field"
                  name="form_check_field"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              {fields.map((field) => (
                <div key={field.field_key}>
                  {renderField(field)}
                  {fieldErrors[field.field_key] && (
                    <p className="text-destructive text-sm mt-1">{td.errorRequired}</p>
                  )}
                </div>
              ))}

              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">{td.requiredHint}</p>
                <Button type="submit" size="lg" disabled={status === "sending"} className="gap-2">
                  {status === "sending" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {td.submitting}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {td.submit}
                    </>
                  )}
                </Button>
                {serverError && <p className="text-destructive text-sm text-center">{serverError}</p>}
              </div>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
