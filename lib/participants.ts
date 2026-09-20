// Teilnehmer-Darstellung: entscheidet, welche Formularfelder auf einer Karte
// und welche in der Vollbild-Anzeige gezeigt werden.
//
// Der Formular-Baukasten laesst beliebige Felder zu, deshalb wird hier nach
// Feldtyp und Schluessel eingeteilt statt fest verdrahtet.

import type { FieldType } from "./forms"

export interface ParticipantField {
  field_key: string
  label: string
  field_type: FieldType | string
}

export interface Participant {
  id: string
  data: Record<string, string | boolean>
  created_at: string
  status: "confirmed" | "waitlist" | "cancelled"
  checked_in_at: string | null
  email: string
}

// Angaben aus den Ehrungslisten (siehe scripts/import-participants.mjs).
// Sie stehen bewusst nicht im Formular-Baukasten — sonst taeuchten sie im
// oeffentlichen Anmeldeformular auf — werden aber ueberall gezeigt, wo
// Teilnehmer sichtbar sind.
export const LIST_FIELDS = [
  { key: "rolle_ar", label: "Funktion", label_ar: "الصفة" },
  { key: "kategorie_ar", label: "Kategorie", label_ar: "الفئة" },
  { key: "ehrung_ar", label: "Ehrung", label_ar: "نوع التكريم" },
  { key: "liste_ar", label: "Liste", label_ar: "القائمة" },
  { key: "notiz_ar", label: "Notiz", label_ar: "ملاحظات" },
] as const

// Laufende Nummer auf dem Ausweis und im QR-Code
export function participantNumber(p: Participant): string {
  const value = p.data["teilnehmer_nr"]
  return typeof value === "string" ? value.trim() : ""
}

export function participantNameAr(p: Participant): string {
  const value = p.data["name_ar"]
  return typeof value === "string" ? value.trim() : ""
}

// Wann der Ausweis an die Person weitergegeben wurde — leer heisst: noch nicht
export function participantSharedAt(p: Participant): string {
  const value = p.data["qr_geteilt_am"]
  return typeof value === "string" ? value.trim() : ""
}

// Gefuellte Listen-Angaben in fester Reihenfolge
export function listValues(p: Participant): { key: string; label: string; label_ar: string; value: string }[] {
  return LIST_FIELDS.map((f) => ({ ...f, value: fieldValue(p, f.key) })).filter((f) => f.value)
}

// Kontaktdaten und Anschrift: gehoeren in die Detailansicht, niemals auf
// eine Leinwand vor Publikum.
const CONTACT_TYPES = new Set(["email", "tel"])
const ADDRESS_KEYS = new Set(["street", "postal_code", "city", "address", "plz", "ort"])
const NAME_KEYS = ["first_name", "last_name"]

// Freitext ist fuer eine Kachel zu lang
const LONG_TYPES = new Set(["textarea"])

export function photoField(fields: ParticipantField[]): ParticipantField | undefined {
  return fields.find((f) => f.field_type === "photo")
}

// Anzeigename: Vor- und Nachname, sonst das erste Textfeld
export function participantName(fields: ParticipantField[], p: Participant): string {
  const parts = NAME_KEYS.map((key) => p.data[key])
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim())

  if (parts.length > 0) return parts.join(" ")

  const firstText = fields.find((f) => f.field_type === "text")
  const fallback = firstText ? p.data[firstText.field_key] : ""
  return typeof fallback === "string" && fallback.trim() ? fallback.trim() : "Ohne Namen"
}

export function participantInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase()
}

// Felder, die eine Person kurz beschreiben (z. B. Sportart, Verein).
// Bewusst ohne Name, Foto, Kontakt, Anschrift und Freitext.
export function highlightFields(fields: ParticipantField[]): ParticipantField[] {
  return fields.filter(
    (f) =>
      f.field_type !== "photo" &&
      !NAME_KEYS.includes(f.field_key) &&
      !CONTACT_TYPES.has(f.field_type) &&
      !ADDRESS_KEYS.has(f.field_key) &&
      !LONG_TYPES.has(f.field_type) &&
      f.field_type !== "date",
  )
}

// Alles Uebrige — nur in der Detailansicht sichtbar
export function detailFields(fields: ParticipantField[]): ParticipantField[] {
  const shown = new Set(highlightFields(fields).map((f) => f.field_key))
  return fields.filter(
    (f) => f.field_type !== "photo" && !NAME_KEYS.includes(f.field_key) && !shown.has(f.field_key),
  )
}

export function fieldValue(p: Participant, key: string): string {
  const value = p.data[key]
  if (typeof value === "boolean") return value ? "Ja" : "Nein"
  return typeof value === "string" ? value.trim() : ""
}

// Sucht ueber Name und alle Textwerte, damit auch "Fußball" oder ein
// Vereinsname trifft
export function matchesSearch(fields: ParticipantField[], p: Participant, term: string): boolean {
  const needle = term.trim().toLowerCase()
  if (!needle) return true

  const haystack = [
    participantName(fields, p),
    ...Object.values(p.data).map((v) => (typeof v === "string" ? v : "")),
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(needle)
}
