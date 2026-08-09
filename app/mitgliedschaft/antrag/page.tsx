"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Loader2, Send } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { membershipFormSchema, type MembershipFormValues, MEMBERSHIP_TYPES } from "@/lib/membership"

export default function MembershipApplicationPage() {
  const { t, locale } = useLanguage()
  const tf = t.membershipForm

  const [formToken, setFormToken] = useState("")
  // Honeypot bewusst ausserhalb von react-hook-form (Schema ist .strict())
  const [honeypot, setHoneypot] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")
  const [serverError, setServerError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MembershipFormValues>({
    resolver: zodResolver(membershipFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      birthDate: "",
      email: "",
      phone: "",
      street: "",
      postalCode: "",
      city: "",
      membershipType: "regular",
      message: "",
      privacyConsent: false,
      statutesConsent: false,
    },
  })

  const fetchToken = useCallback(async (): Promise<string> => {
    try {
      const res = await fetch("/api/membership")
      if (res.ok) {
        const data = await res.json()
        if (data.token) {
          setFormToken(data.token)
          return data.token
        }
      }
    } catch {
      // Token wird beim Absenden erneut angefordert
    }
    return ""
  }, [])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  const errorText = (key?: string) => {
    if (!key) return ""
    const map = tf.errors as Record<string, string>
    return map[key] || tf.errors.invalid
  }

  const onSubmit = async (values: MembershipFormValues) => {
    setStatus("sending")
    setServerError("")
    try {
      const token = formToken || (await fetchToken())
      const res = await fetch("/api/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, formToken: token, company: honeypot, locale }),
      })

      if (res.ok) {
        setStatus("sent")
        return
      }

      const data = await res.json().catch(() => ({}))
      if (res.status === 429) {
        setServerError(tf.errorRateLimited)
      } else if (data.error === "invalidToken") {
        await fetchToken()
        setServerError(tf.errorToken)
      } else {
        setServerError(tf.errorGeneric)
      }
      setStatus("idle")
    } catch {
      setServerError(tf.errorGeneric)
      setStatus("idle")
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  if (status === "sent") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="max-w-lg text-center py-20">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">{tf.successTitle}</h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">{tf.successText}</p>
            <Button asChild size="lg">
              <Link href="/">{tf.backHome}</Link>
            </Button>
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
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{tf.pageTitle}</h1>
            <p className="text-xl text-muted-foreground">{tf.pageSubtitle}</p>
          </div>
        </section>

        <section className="py-16 px-6 bg-background">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-10">
              {/* Honeypot: fuer Menschen unsichtbar, Bots fuellen es aus */}
              <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="company">Company</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              {/* Persoenliche Daten */}
              <fieldset className="flex flex-col gap-4">
                <legend className="text-2xl font-bold text-foreground mb-4">{tf.personalTitle}</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">{tf.firstName} *</Label>
                    <Input id="firstName" autoComplete="given-name" maxLength={100} {...register("firstName")} />
                    {errors.firstName && <p className="text-destructive text-sm mt-1">{errorText(errors.firstName.message)}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lastName">{tf.lastName} *</Label>
                    <Input id="lastName" autoComplete="family-name" maxLength={100} {...register("lastName")} />
                    {errors.lastName && <p className="text-destructive text-sm mt-1">{errorText(errors.lastName.message)}</p>}
                  </div>
                  <div>
                    <Label htmlFor="birthDate">{tf.birthDate} *</Label>
                    <Input id="birthDate" type="date" max={today} autoComplete="bday" {...register("birthDate")} />
                    {errors.birthDate && <p className="text-destructive text-sm mt-1">{errorText(errors.birthDate.message)}</p>}
                  </div>
                  <div>
                    <Label htmlFor="email">{tf.email} *</Label>
                    <Input id="email" type="email" autoComplete="email" maxLength={254} {...register("email")} />
                    {errors.email && <p className="text-destructive text-sm mt-1">{errorText(errors.email.message)}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="phone">{tf.phone}</Label>
                    <Input id="phone" type="tel" autoComplete="tel" maxLength={25} {...register("phone")} />
                    {errors.phone && <p className="text-destructive text-sm mt-1">{errorText(errors.phone.message)}</p>}
                  </div>
                </div>
              </fieldset>

              {/* Adresse */}
              <fieldset className="flex flex-col gap-4">
                <legend className="text-2xl font-bold text-foreground mb-4">{tf.addressTitle}</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3">
                    <Label htmlFor="street">{tf.street} *</Label>
                    <Input id="street" autoComplete="street-address" maxLength={150} {...register("street")} />
                    {errors.street && <p className="text-destructive text-sm mt-1">{errorText(errors.street.message)}</p>}
                  </div>
                  <div>
                    <Label htmlFor="postalCode">{tf.postalCode} *</Label>
                    <Input id="postalCode" inputMode="numeric" autoComplete="postal-code" maxLength={5} {...register("postalCode")} />
                    {errors.postalCode && <p className="text-destructive text-sm mt-1">{errorText(errors.postalCode.message)}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="city">{tf.city} *</Label>
                    <Input id="city" autoComplete="address-level2" maxLength={100} {...register("city")} />
                    {errors.city && <p className="text-destructive text-sm mt-1">{errorText(errors.city.message)}</p>}
                  </div>
                </div>
              </fieldset>

              {/* Beitragsart */}
              <fieldset className="flex flex-col gap-4">
                <legend className="text-2xl font-bold text-foreground mb-4">{tf.typeTitle}</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {MEMBERSHIP_TYPES.map((type) => {
                    const labels = {
                      regular: { title: tf.typeRegular, fee: t.membership.feeRegularValue },
                      family: { title: tf.typeFamily, fee: t.membership.feeFamilyValue },
                      student: { title: tf.typeStudent, fee: t.membership.feeStudentValue },
                    }[type]
                    return (
                      <label
                        key={type}
                        className="flex flex-col items-center gap-1 bg-secondary rounded-xl p-4 cursor-pointer border-2 border-transparent has-[:checked]:border-primary transition-colors text-center"
                      >
                        <input type="radio" value={type} className="sr-only" {...register("membershipType")} />
                        <span className="font-semibold text-foreground">{labels.title}</span>
                        <span className="text-sm text-muted-foreground">{labels.fee}</span>
                      </label>
                    )
                  })}
                </div>
                {errors.membershipType && <p className="text-destructive text-sm">{errorText(errors.membershipType.message)}</p>}
              </fieldset>

              {/* Nachricht */}
              <fieldset className="flex flex-col gap-2">
                <legend className="text-2xl font-bold text-foreground mb-4">{tf.messageTitle}</legend>
                <Textarea id="message" rows={4} maxLength={2000} placeholder={tf.messagePlaceholder} {...register("message")} />
                {errors.message && <p className="text-destructive text-sm">{errorText(errors.message.message)}</p>}
              </fieldset>

              {/* Einwilligungen */}
              <fieldset className="flex flex-col gap-4">
                <legend className="text-2xl font-bold text-foreground mb-4">{tf.consentTitle}</legend>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" {...register("privacyConsent")} />
                  <span className="text-sm text-foreground leading-relaxed">
                    {tf.privacyConsentPre}{" "}
                    <Link href="/datenschutz" target="_blank" className="text-primary underline">
                      {tf.privacyLink}
                    </Link>{" "}
                    {tf.privacyConsentPost} *
                  </span>
                </label>
                {errors.privacyConsent && <p className="text-destructive text-sm">{errorText(errors.privacyConsent.message)}</p>}

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" {...register("statutesConsent")} />
                  <span className="text-sm text-foreground leading-relaxed">
                    {tf.statutesConsentPre}{" "}
                    <Link href="/satzung" target="_blank" className="text-primary underline">
                      {tf.statutesLink}
                    </Link>{" "}
                    {tf.statutesConsentPost} *
                  </span>
                </label>
                {errors.statutesConsent && <p className="text-destructive text-sm">{errorText(errors.statutesConsent.message)}</p>}
              </fieldset>

              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">{tf.requiredHint}</p>
                <Button type="submit" size="lg" disabled={status === "sending"} className="gap-2">
                  {status === "sending" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {tf.submitting}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {tf.submit}
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
