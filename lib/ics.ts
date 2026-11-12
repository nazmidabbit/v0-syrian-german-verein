// Kalenderdatei (.ics) fuer eine Veranstaltung — laeuft im Browser.
// Veranstaltungen haben nur ein Datum, deshalb entsteht ein Ganztagestermin;
// steckt im Datum eine Uhrzeit, wird ein zweistuendiger Termin daraus.

interface IcsEvent {
  uid: string
  title: string
  description: string
  date: string
  url: string
}

// Sonderzeichen laut RFC 5545 maskieren
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

// Zeilen laenger als 75 Zeichen muessen umgebrochen werden (Leerzeichen am Folgezeilenanfang)
function fold(line: string): string {
  const parts: string[] = []
  let rest = line
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75))
    rest = " " + rest.slice(75)
  }
  parts.push(rest)
  return parts.join("\r\n")
}

const pad = (n: number) => String(n).padStart(2, "0")

function dateOnly(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

function dateTimeUtc(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
}

export function buildEventIcs(event: IcsEvent): string {
  const start = new Date(event.date)
  const hasTime = /T\d{2}:\d{2}/.test(event.date) && (start.getHours() !== 0 || start.getMinutes() !== 0)

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Syrische Gemeinschaft im Saarland//sygs.de//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}@sygs.de`,
    `DTSTAMP:${dateTimeUtc(new Date())}`,
  ]

  if (hasTime) {
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    lines.push(`DTSTART:${dateTimeUtc(start)}`, `DTEND:${dateTimeUtc(end)}`)
  } else {
    const next = new Date(start)
    next.setDate(next.getDate() + 1)
    lines.push(`DTSTART;VALUE=DATE:${dateOnly(start)}`, `DTEND;VALUE=DATE:${dateOnly(next)}`)
  }

  lines.push(
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  )

  return lines.map(fold).join("\r\n") + "\r\n"
}

// Startet den Download der Kalenderdatei im Browser
export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
