"use client"

import Link from "next/link"
import { ExternalLink, ShieldCheck } from "lucide-react"

// Vollstaendige Liste aller Seiten im Admin-Bereich — nur fuer Administratoren.
//
// Die Kacheln oben zeigen die elf Hauptbereiche. Hier stehen zusaetzlich die
// Unterseiten, die man sonst nur ueber einen Umweg findet, und daneben, welcher
// Zugang jeweils noetig ist. Die Berechtigung wird serverseitig in der
// zugehoerigen API-Route geprueft, nicht in der Seite selbst.

interface Eintrag {
  pfad: string
  zweck: string
  zugang: string
  /** Aufrufbar nur mit einer ID in der Adresse — kein direkter Link moeglich */
  ueber?: string
}

const BEREICHE: { titel: string; eintraege: Eintrag[] }[] = [
  {
    titel: "Einstieg",
    eintraege: [{ pfad: "/admin", zweck: "Übersicht mit den Kacheln", zugang: "angemeldet" }],
  },
  {
    titel: "Veranstaltung und Einlass",
    eintraege: [
      { pfad: "/admin/veranstaltungen", zweck: "Veranstaltungen anlegen und bearbeiten", zugang: "veranstaltungen" },
      { pfad: "/admin/teilnehmer", zweck: "Teilnehmerliste, Ausweise, Vollbild-Anzeige", zugang: "teilnehmer" },
      { pfad: "/admin/einlass", zweck: "Einlasskontrolle mit QR-Scanner", zugang: "teilnehmer" },
      { pfad: "/admin/einlass/ausweise", zweck: "Teilnehmerausweise zum Ausdrucken", zugang: "teilnehmer" },
    ],
  },
  {
    titel: "Formulare",
    eintraege: [
      { pfad: "/admin/formulare", zweck: "Formulare anlegen und verwalten", zugang: "formulare" },
      {
        pfad: "/admin/formulare/[id]",
        zweck: "Felder eines Formulars bearbeiten",
        zugang: "formulare",
        ueber: "Formulare → Formular antippen",
      },
      {
        pfad: "/admin/formulare/[id]/ergebnisse",
        zweck: "Einsendungen ansehen, exportieren, löschen",
        zugang: "formulare",
        ueber: "Formulare → Formular → Ergebnisse",
      },
    ],
  },
  {
    titel: "Verein",
    eintraege: [
      { pfad: "/admin/nachrichten", zweck: "Nachrichten erstellen und bearbeiten", zugang: "nachrichten" },
      { pfad: "/admin/mitgliedsantraege", zweck: "Eingegangene Anträge prüfen", zugang: "mitgliedsantraege" },
      { pfad: "/admin/bueros", zweck: "Arbeitsbüros als Stammdaten", zugang: "bueros" },
      { pfad: "/admin/bilder", zweck: "Galerie-Bilder verwalten", zugang: "bilder" },
      { pfad: "/admin/aufgaben", zweck: "Aufgaben zuweisen, Erinnerungen auslösen", zugang: "aufgaben" },
    ],
  },
  {
    titel: "Wahlen",
    eintraege: [
      { pfad: "/admin/wahlen", zweck: "Wahlen anlegen und öffnen", zugang: "wahlen" },
      {
        pfad: "/admin/wahlen/[id]",
        zweck: "Kandidaten verwalten, Stimmen auswerten",
        zugang: "wahlen",
        ueber: "Wahlen → Wahl antippen",
      },
    ],
  },
  {
    titel: "Kommunikation",
    eintraege: [{ pfad: "/admin/mailbox", zweck: "E-Mails lesen und beantworten", zugang: "mailbox" }],
  },
  {
    titel: "Benutzer",
    eintraege: [
      { pfad: "/admin/benutzer", zweck: "Benutzer und Berechtigungen", zugang: "nur Rolle Admin" },
      {
        pfad: "/admin/benutzer/[id]",
        zweck: "Rechte eines einzelnen Benutzers",
        zugang: "nur Rolle Admin",
        ueber: "Benutzer → Person antippen",
      },
    ],
  },
]

export function AdminRouteList() {
  const anzahl = BEREICHE.reduce((summe, b) => summe + b.eintraege.length, 0)

  return (
    <section className="px-6 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-border bg-background overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-border bg-muted/50">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-[12rem]">
              <h2 className="font-bold text-foreground">Alle Seiten im Admin-Bereich</h2>
              <p className="text-sm text-muted-foreground">
                {anzahl} Seiten · nur für Administratoren sichtbar
              </p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {BEREICHE.map((bereich) => (
              <div key={bereich.titel} className="px-6 py-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                  {bereich.titel}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {bereich.eintraege.map((e) => (
                    <li key={e.pfad} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      {e.ueber ? (
                        <code className="text-sm font-mono text-muted-foreground">{e.pfad}</code>
                      ) : (
                        <Link
                          href={e.pfad}
                          className="text-sm font-mono text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {e.pfad}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                      <span className="text-sm text-foreground">{e.zweck}</span>
                      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                        {e.zugang}
                      </span>
                      {e.ueber && (
                        <span className="w-full text-xs text-muted-foreground">
                          Nur mit ID in der Adresse — erreichbar über: {e.ueber}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="px-6 py-4 text-xs text-muted-foreground border-t border-border bg-muted/30">
            Die Spalte rechts nennt die Berechtigung, die eine Person unter{" "}
            <Link href="/admin/benutzer" className="underline">
              Benutzer
            </Link>{" "}
            braucht. Geprüft wird sie serverseitig in der jeweiligen API-Route — eine Seite ohne
            Berechtigung lädt zwar, zeigt aber keine Daten.
          </p>
        </div>
      </div>
    </section>
  )
}
