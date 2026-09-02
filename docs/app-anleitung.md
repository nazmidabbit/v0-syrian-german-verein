# SGIS als App

Die Vereinsseite lässt sich auf Android und iPhone als App installieren — mit
eigenem Symbol auf dem Startbildschirm, ohne Browserleiste und mit einer
verständlichen Seite, wenn gerade kein Netz da ist.

Es gibt keinen zweiten Code, der gepflegt werden müsste: Die Webseite selbst
ist die App (eine Progressive Web App).

---

## Was gebaut wurde

| Datei | Zweck |
| --- | --- |
| `app/manifest.ts` | Name, Symbole, Startfarbe und Direkteinstiege zu Veranstaltungen, Aufgaben und Kontakt |
| `public/icons/` | Vier Symbolgrößen aus dem Vereinslogo, inklusive gerandeter Fassung für Androids runde Symbole |
| `public/sw.js` | Offline-Verhalten (Service Worker) |
| `public/offline.html` | Zweisprachige Hinweisseite ohne Netz |
| `components/install-app.tsx` | Installations-Banner, auf iPhones mit Anleitung statt Knopf |
| `components/pwa-register.tsx` | Meldet den Service Worker an (nur im Produktions-Build) |

Der App-Name auf dem Startbildschirm ist **SGIS**. Im Installationsdialog
erscheint der lange Name „Syrische Gemeinschaft im Saarland".

> **Persönliche Daten werden nicht zwischengespeichert.**
> Admin-Bereich, Aufgaben, Login und sämtliche API-Aufrufe sind vom
> Zwischenspeicher ausgenommen. Sonst könnte auf einem geteilten Gerät die
> nächste Person Reste der vorherigen sehen.

---

## Installieren auf Android

Chrome, Edge oder Samsung Internet.

1. **sygs.de im Browser öffnen.** Nach der Cookie-Entscheidung erscheint unten
   das Banner „App installieren".
2. **Auf „Installieren" tippen und bestätigen.** Falls das Banner weggetippt
   wurde: Menü `⋮` → „App installieren" beziehungsweise „Zum Startbildschirm
   zufügen".
3. **Fertig.** Das SGIS-Symbol liegt auf dem Startbildschirm und öffnet in einem
   eigenen Fenster ohne Adressleiste. Langes Drücken zeigt die Direkteinstiege.

## Installieren auf iPhone und iPad

Apple erlaubt das Hinzufügen nur über das Teilen-Menü — ein Installieren-Knopf
ist technisch nicht möglich.

1. **sygs.de in Safari öffnen.** In Safari, nicht in Chrome oder in einem
   In-App-Browser wie dem von WhatsApp oder Instagram.
2. **Teilen-Symbol antippen.** Das Quadrat mit dem Pfeil nach oben, unten in der
   Mitte der Leiste.
3. **„Zum Home-Bildschirm" wählen.** In der Liste etwas nach unten scrollen,
   dann oben rechts auf „Hinzufügen".

---

## Vor dem Verteilen prüfen

- **HTTPS ist Pflicht.** Über `http://` oder eine IP-Adresse installiert kein
  Browser eine App. Auf sygs.de ist das erfüllt, unter `localhost` ebenfalls.
- **Der Offline-Teil läuft nur in der gebauten App.** Im Entwicklungsmodus ist
  er absichtlich abgeschaltet, sonst würde der Zwischenspeicher ständig
  veraltete Dateien ausliefern. Zum Testen `npm run build` und `npm start`.
- **Prüfen im Browser:** Chrome → Entwicklertools → Reiter „Application".
  Unter „Manifest" müssen Name und alle vier Symbole erscheinen, unter
  „Service Workers" muss einer als *activated* laufen.

> **Beim Ändern des Offline-Verhaltens die Version hochzählen.**
> In `public/sw.js` steht oben `const VERSION = "v1"`. Wer diese Datei ändert,
> ohne die Zahl zu erhöhen, lässt bereits installierte Apps auf dem alten
> Zwischenspeicher sitzen — die Änderung kommt dann bei niemandem an.

---

## Wenn die App in die Stores soll

Das ist ein eigener Schritt. Er braucht eigene Entwicklerkonten und für Apple
zusätzlich einen Mac. Beide Wege bauen auf dem auf, was jetzt fertig ist.

| Weg | Voraussetzung | Kosten | Aufwand |
| --- | --- | --- | --- |
| Startbildschirm (fertig) | nichts | keine | erledigt |
| Google Play | Play-Entwicklerkonto, Java + Android SDK | 25 $ einmalig | halber Tag |
| Apple App Store | Mac, Xcode, Apple-Entwicklerprogramm | 99 $ pro Jahr | mehrere Tage, Ausgang offen |

### Google Play

Google verpackt eine installierbare Webseite offiziell zu einer Play-App. Das
Werkzeug dafür heißt Bubblewrap und liest genau das Manifest, das unter
`/manifest.webmanifest` liegt.

```bash
# Java und Android SDK müssen installiert sein
npx @bubblewrap/cli init --manifest https://sygs.de/manifest.webmanifest
npx @bubblewrap/cli build
```

Damit die App ohne Adressleiste startet, muss danach die Datei
`assetlinks.json` mit dem Fingerabdruck des Signaturschlüssels unter
`public/.well-known/` abgelegt werden. Den Schlüssel erzeugt Bubblewrap — er
darf niemals verloren gehen, sonst sind Updates der App unmöglich.

### Apple App Store

Apple kennt kein Gegenstück zu Bubblewrap. Der übliche Weg ist Capacitor: eine
native Hülle, die die Seite lädt. Dafür braucht es zwingend einen Mac mit
Xcode — von Windows aus lässt sich keine iOS-App bauen oder einreichen.

> **Apple lehnt reine Webseiten-Hüllen regelmäßig ab.**
> Richtlinie 4.2 verlangt, dass eine App mehr kann als die Webseite im Browser.
> Eine Hülle ohne echte Gerätefunktionen — Benachrichtigungen, Kamera,
> Offline-Nutzung — wird häufig zurückgewiesen. Mit mehreren Anläufen rechnen.

Für die meisten Vereine lohnt das nicht: Auf dem iPhone sieht eine über
„Zum Home-Bildschirm" installierte App praktisch genauso aus wie eine
Store-App. Der Unterschied ist die Auffindbarkeit im Store — nicht das
Erlebnis.

---

## Was noch fehlt

- **Push-Benachrichtigungen.** Auf Android funktionieren sie mit dieser Bauart;
  auf iPhones ab Version 16.4 ebenfalls, aber nur wenn die App über
  „Zum Home-Bildschirm" installiert wurde. Sie wären der naheliegende nächste
  Schritt für die Aufgaben-Erinnerungen und für neue Veranstaltungen — bislang
  gehen die nur per E-Mail.
- **Ein eigenes App-Symbol.** Aktuell ist es das Vereinslogo auf weißem Grund.
  Ein eigens gezeichnetes Symbol wirkt auf dem Startbildschirm deutlich
  professioneller, weil Logos mit feinen Linien bei 48 Pixeln unleserlich
  werden.
- **Ein Screenshot-Satz im Manifest.** Android zeigt damit einen richtigen
  Installationsdialog statt eines schmalen Banners.
