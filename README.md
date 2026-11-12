# Syrische Gemeinschaft im Saarland — sygs.de

Vereinsseite der Syrischen Gemeinschaft im Saarland e.V. (i. Gr.), zweisprachig
Deutsch/Arabisch, als installierbare App (PWA) nutzbar.

Live: **https://sygs.de** · Hosting: Vercel · Datenbank und Dateien: Supabase

## Was die Seite kann

| Bereich | Öffentlich | Verwaltung (`/admin`) |
| --- | --- | --- |
| Veranstaltungen | Liste, Detailseite mit Teilen-Link, Bilder, Videos, Anmeldung | anlegen, bearbeiten, löschen |
| Nachrichten | Liste | anlegen, bearbeiten, löschen |
| Mitgliedschaft | Infoseite, Online-Antrag mit Foto | Anträge prüfen, annehmen (Mitgliedsnummer), ablehnen |
| Formulare | Anmeldeformulare je Veranstaltung (Teilnehmerzahl, Warteliste, Anmeldeschluss) | Formular-Baukasten, Einsendungen, Check-in |
| Teilnehmer / Einlass | — | Teilnehmerliste, QR-Ausweise, Einlasskontrolle per Kamera |
| Wahlen | Abstimmung für freigeschaltete Mitglieder | Wahlen und Kandidaten anlegen, auswerten |
| Aufgaben | eigene Aufgaben (angemeldet) | zuweisen, Fristen, E-Mail-Erinnerungen |
| Mailbox | — | Postfach info@sygs.de lesen, antworten, weiterleiten |
| Benutzer | Registrierung, E-Mail-Bestätigung | freischalten, Rollen und Berechtigungen |
| Sonstiges | Galerie, Spenden, Vorstand, Satzung, FAQ, Projekte, Kontakt, Impressum, Datenschutz | Büros (Stammdaten), Bilder |

Anleitungen für den Verein liegen unter `docs/` (App-Installation, Einlass mit QR-Code).

## Technik

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- Supabase (Postgres + Storage) — alle Zugriffe laufen serverseitig über den
  Service-Role-Key in den API-Routen; der Browser spricht nie direkt mit Supabase
- Eigene Anmeldung mit JWT-Cookie (`auth-token`), Passwörter mit bcrypt
- Mails per SMTP (nodemailer), Admin-Postfach per IMAP (imapflow)
- Übersetzungen in `lib/i18n.ts` (Deutsch und Arabisch, Umschaltung im Header)
- PWA: `app/manifest.ts`, `public/sw.js`, `public/offline.html`

## Lokal starten

```bash
npm install
cp .env.example .env     # Werte eintragen, siehe Kommentare in der Datei
npm run dev              # http://localhost:3000
```

Für den Produktions-Build:

```bash
npm run build && npm start
```

Der Offline-Teil (Service Worker) läuft bewusst nur im gebauten Stand.

## Datenbank einrichten

Die SQL-Dateien unter `supabase-migrations/` im Supabase SQL-Editor in dieser
Reihenfolge ausführen:

1. `membership-applications.sql`, dann `membership-applications-add-profession.sql`
   und `membership-member-number.sql`
2. `offices-and-membership-extensions.sql`
3. `elections.sql`
4. `forms.sql`, dann `event-registration.sql`
5. `tasks.sql`

Die Tabellen `users`, `events`, `news` und `images` sowie der Storage-Bucket
`uploads` (öffentlich lesbar) stammen aus der ersten Einrichtung.

## Hilfsskripte

```bash
node scripts/export-participants.mjs [--fotos]        # Teilnehmer sichern (exports/, nicht im Repo)
node scripts/restore-participants.mjs <sicherung.json> [--apply]
node scripts/import-participants.mjs                  # Namen aus Ehrungslisten übernehmen
```

## Wiederkehrende Jobs

`/api/cron/task-reminders` verschickt Erinnerungen zu fälligen Aufgaben. Der
Aufruf ist mit `CRON_SECRET` geschützt und läuft stündlich über die GitHub
Action `.github/workflows/task-reminders.yml` (Secrets `APP_URL` und
`CRON_SECRET` im Repository hinterlegen).

## Veröffentlichen

Jeder Push auf `main` wird von Vercel gebaut und ausgerollt. Die Umgebungs-
variablen aus `.env.example` müssen im Vercel-Projekt gesetzt sein.
