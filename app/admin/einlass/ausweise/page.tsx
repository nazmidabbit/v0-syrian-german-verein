import Link from "next/link"
import QRCode from "qrcode"
import { ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAuthUser, hasPermission } from "@/lib/auth"
import { getSupabase } from "@/lib/supabase"
import {
  fieldValue,
  participantName,
  participantNameAr,
  participantNumber,
  type Participant,
  type ParticipantField,
} from "@/lib/participants"
import { PrintButton } from "./print-button"

export const dynamic = "force-dynamic"

// Teilnehmerausweise zum Ausdrucken: Nummer, Name und der QR-Code, den die
// Einlasskontrolle scannt. Zehn Stueck auf eine A4-Seite.
//
// Der QR-Code enthaelt die Adresse der Einlass-Seite mit der Einsendungs-ID.
// So funktioniert er auch mit einer beliebigen Kamera-App: sie oeffnet die
// Seite, die den Code dann sofort prueft.

const CARDS_PER_PAGE = 10

function checkInUrl(id: string) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "")
  return `${base}/admin/einlass?c=${id}`
}

export default async function AusweisePage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string }>
}) {
  const authUser = await getAuthUser()
  if (!authUser || !hasPermission(authUser, "teilnehmer")) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Kein Zugriff</h1>
          <p className="text-muted-foreground">
            Für die Teilnehmerausweise ist die Berechtigung „Teilnehmer“ nötig.
          </p>
        </div>
      </main>
    )
  }

  const supabase = getSupabase()
  const { form: formParam } = await searchParams

  // Ohne Angabe das Formular mit den meisten Anmeldungen — in aller Regel
  // das der laufenden Veranstaltung
  let formId = formParam || ""
  if (!formId) {
    const { data } = await supabase
      .from("forms")
      .select("id, form_submissions(count)")
      .order("created_at", { ascending: false })
    const withMost = (data || [])
      .map((f) => ({
        id: f.id as string,
        count: (f.form_submissions as { count: number }[])?.[0]?.count ?? 0,
      }))
      .sort((a, b) => b.count - a.count)[0]
    formId = withMost?.id || ""
  }

  const { data: form } = await supabase
    .from("forms")
    .select("id, title, title_ar, event_id")
    .eq("id", formId)
    .maybeSingle()

  if (!form) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-muted-foreground">Kein Formular gefunden.</p>
      </main>
    )
  }

  const { data: event } = form.event_id
    ? await supabase.from("events").select("title, title_ar, date").eq("id", form.event_id).maybeSingle()
    : { data: null }

  const { data: fieldRows } = await supabase
    .from("form_fields")
    .select("field_key, label, field_type, sort_order")
    .eq("form_id", form.id)
    .order("sort_order", { ascending: true })

  const { data: rows } = await supabase
    .from("form_submissions")
    .select("id, data, created_at, status, checked_in_at, email")
    .eq("form_id", form.id)
    .neq("status", "cancelled")
    .limit(1000)

  const fields = (fieldRows || []) as ParticipantField[]
  const participants = ((rows || []) as Participant[]).sort(
    (a, b) => (Number(participantNumber(a)) || 9999) - (Number(participantNumber(b)) || 9999),
  )

  // QR-Codes serverseitig als SVG — kein zusaetzliches Skript im Browser und
  // beim Druck gestochen scharf. Fehlerkorrektur "H" gleicht bis zu 30 % aus,
  // deshalb darf das Vereinslogo mitten darauf liegen.
  const codes = await Promise.all(
    participants.map((p) =>
      QRCode.toString(checkInUrl(p.id), {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "H",
      }),
    ),
  )

  const eventDate = event?.date
    ? new Date(event.date).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : ""

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        .ausweis-blatt { display: grid; grid-template-columns: repeat(2, 92mm); gap: 3mm; justify-content: center; }
        .ausweis { height: 52mm; break-inside: avoid; page-break-inside: avoid; }
        @media print {
          .kein-druck { display: none !important; }
          body { background: #fff; }
        }
      `}</style>

      <main className="min-h-screen bg-muted/40 px-4 py-8 print:bg-white print:p-0">
        <div className="max-w-[200mm] mx-auto">
          <div className="kein-druck mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-primary mb-1">
                Teilnehmerausweise
              </p>
              <h1 className="text-2xl font-bold">{event?.title || form.title}</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {participants.length} Ausweise · {CARDS_PER_PAGE} pro Seite ·{" "}
                {Math.ceil(participants.length / CARDS_PER_PAGE)} Seiten
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="gap-2">
                <Link href="/admin/einlass">
                  <ScanLine className="h-4 w-4" />
                  Zur Einlasskontrolle
                </Link>
              </Button>
              <PrintButton />
            </div>
          </div>

          <div className="ausweis-blatt">
            {participants.map((p, i) => {
              const nr = participantNumber(p)
              const nameAr = participantNameAr(p)
              const sport = fieldValue(p, "sportart")
              const ehrung = fieldValue(p, "ehrung_ar")

              return (
                <div
                  key={p.id}
                  className="ausweis bg-white border border-neutral-300 rounded-lg p-3 flex gap-3 overflow-hidden"
                >
                  <div className="flex-1 min-w-0 flex flex-col">
                    <p className="text-[7pt] uppercase tracking-wide text-neutral-500 truncate">
                      {event?.title || form.title}
                    </p>
                    <p className="text-[7pt] text-neutral-500 truncate" dir="rtl">
                      {event?.title_ar || form.title_ar}
                    </p>

                    <p className="text-[20pt] font-bold leading-none tabular-nums mt-1 text-neutral-900">
                      {nr ? `#${nr}` : ""}
                    </p>

                    <p className="text-[11pt] font-bold leading-tight mt-1 text-neutral-900 truncate">
                      {participantName(fields, p)}
                    </p>
                    {nameAr && (
                      <p className="text-[11pt] font-bold leading-tight text-neutral-900 truncate" dir="rtl">
                        {nameAr}
                      </p>
                    )}

                    <div className="mt-auto text-[7pt] text-neutral-600 leading-tight">
                      {sport && <p className="truncate">{sport}</p>}
                      {ehrung && (
                        <p className="truncate" dir="rtl">
                          {ehrung}
                        </p>
                      )}
                      {eventDate && <p>{eventDate}</p>}
                    </div>
                  </div>

                  <div className="w-[26mm] flex-shrink-0 flex flex-col items-center justify-center">
                    <div className="relative w-[24mm] h-[24mm]">
                      <div
                        className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                        dangerouslySetInnerHTML={{ __html: codes[i] }}
                      />
                      {/* Vereinslogo in der Mitte — die Fehlerkorrektur traegt das */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/logo.png"
                        alt=""
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[6mm] h-[6mm] bg-white rounded-[1mm] p-[0.4mm]"
                      />
                    </div>
                    <p className="text-[6pt] text-neutral-500 mt-1">Einlass · الدخول</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </>
  )
}
