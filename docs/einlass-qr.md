# Einlass mit QR-Code

Jeder Teilnehmer hat eine feste Nummer und einen QR-Code. Am Eingang wird der
Code gescannt: Grün heißt angemeldet und eingelassen, Rot heißt nicht auf der
Liste. Wer den Ausweis vergessen hat, wird über seine Nummer gefunden.

---

## Was gebaut wurde

| Datei | Zweck |
| --- | --- |
| `scripts/import-participants.mjs` | Namen aus den Ehrungslisten (.docx) in die Teilnehmerliste übernehmen |
| `app/admin/einlass/page.tsx` | Einlasskontrolle: Kamera-Scanner, Nummerneingabe, Zähler |
| `app/admin/einlass/ausweise/page.tsx` | Teilnehmerausweise mit QR-Code zum Ausdrucken |
| `components/participant-qr-share.tsx` | Einzelner Ausweis als Bild — zum Teilen über WhatsApp |
| `app/api/admin/participants/checkin/route.ts` | Code nachschlagen und ein- beziehungsweise auschecken |
| `app/api/admin/participants/qr-shared/route.ts` | Vermerk, dass jemand seinen Ausweis bekommen hat |

Beide Seiten liegen unter der Berechtigung **Teilnehmer**. Wer am Eingang
steht, braucht damit keinen Zugriff auf Formulare oder Mitgliedsanträge.

---

## Vor der Veranstaltung

1. **Ausweise drucken.** Admin → Einlass → „Ausweise drucken". Zehn Ausweise
   pro A4-Seite, mit Nummer, Namen auf Deutsch und Arabisch, Sportart, Ehrung
   und QR-Code. Am besten auf festeres Papier, dann halten sie den Abend durch.
2. **Ausweise verteilen.** Mit der Einladung, oder einzeln als Bild: Admin →
   Teilnehmer → Person antippen. Unten im Fenster liegt der fertige Ausweis mit
   „Teilen" und „Speichern". Auf dem Handy öffnet „Teilen" direkt WhatsApp; am
   Rechner wird die Datei gespeichert. Der QR-Code funktioniert auch vom
   Handydisplay.

   Wer seinen Ausweis bekommen hat, trägt in der Liste oben rechts auf der
   Kachel ein QR-Zeichen, und der Zähler **QR geteilt** zeigt den Stand. Der
   Knopf **Ohne Ausweis** blendet alle aus, die ihren schon haben — so bleibt
   übrig, wer noch dran ist. Der Vermerk wird beim Teilen *und* beim Speichern
   gesetzt; bricht man den Teilen-Dialog ab, passiert nichts.
3. **Alte Check-ins zurücksetzen.** Wurde vorher getestet, stehen noch
   Häkchen in der Liste. Zurücknehmen lassen sie sich einzeln unter
   Formulare → Ergebnisse oder direkt beim Scan über „Check-in zurücknehmen".

## Am Eingang

1. **Admin → Einlass öffnen** und auf „Scannen starten" tippen. Der Browser
   fragt einmal nach der Kamera.
2. **QR-Code vor die Kamera halten.** Die Rückmeldung kommt dreifach — die
   ganze Seite blitzt kurz in der Farbe auf, dazu ein Ton und ein Vibrieren,
   und darunter steht das Ergebnis in groß mit Name und Nummer:

   | Farbe | Ton | Bedeutung |
   | --- | --- | --- |
   | Grün — *Eingelassen* | zwei helle Töne | angemeldet, Check-in gerade gesetzt |
   | Gelb — *War schon da* | ein mittlerer Ton | der Code wurde bereits gescannt, mit Uhrzeit |
   | Rot — *Nicht angemeldet* | zwei tiefe Töne | der Code gehört zu niemandem auf der Liste |

   So muss am Eingang niemand auf den Bildschirm starren. Der Ton lässt sich
   über das Lautsprecher-Symbol oben abschalten; Farbe und Vibration bleiben.
   Der Ton startet erst nach dem ersten Antippen — das verlangen die Browser
   so, damit Seiten nicht von allein lärmen.

3. **Ohne Ausweis:** Nummer unten eintippen und auf „Prüfen" tippen. Wer seine
   Nummer nicht weiß, wird unter Admin → Teilnehmer über die Suche gefunden —
   dort steht die Nummer vor dem Namen.

Der Zähler oben zeigt durchgehend, wie viele schon da sind und wie viele noch
fehlen. Derselbe Code wird innerhalb von vier Sekunden nicht doppelt gebucht,
und ein zweiter Scan überschreibt die erste Uhrzeit nicht.

> **Die Kamera braucht https.** Auf sygs.de ist das erfüllt. Über eine
> IP-Adresse im WLAN der Halle startet der Scanner nicht — dann bleibt die
> Nummerneingabe.

---

## Die Teilnehmerliste ergänzen

Kommen Namen dazu oder ändert sich eine Liste, wird dieselbe Datei erneut
eingelesen:

```bash
# Probelauf — schreibt nichts, nur scripts/import-vorschau.json
node scripts/import-participants.mjs "pfad/zu/listen.docx"

# Übernehmen
node scripts/import-participants.mjs "pfad/zu/listen.docx" --apply
```

Der Lauf ist wiederholbar. Wer schon in der Liste steht, wird am Namen erkannt
und nicht doppelt angelegt; bestehende Angaben bleiben stehen, es werden nur
leere Felder gefüllt. Personen, die sich selbst über das Formular angemeldet
haben, behalten ihre eigenen Angaben und bekommen nur eine Nummer.

> **Nummern verschieben sich, wenn mitten in der Liste jemand dazukommt.**
> Die Nummer folgt der Reihenfolge im Dokument. Sind die Ausweise schon
> gedruckt, neue Namen besser hinten anhängen — oder nach dem Import neu
> drucken. Der QR-Code selbst bleibt immer gültig, er hängt nicht an der
> Nummer.

Zwei Schreibweisen desselben Namens erkennt das Skript nur, wenn sie sich
ähneln. Fällt ihm ein Paar auf, meldet es das im Probelauf und schlägt vor,
den arabischen Namen an der vorhandenen Anmeldung einzutragen — danach führt
der nächste Lauf beide zusammen.

---

## Was der QR-Code enthält

Die Adresse der Einlass-Seite mit der ID der Anmeldung, zum Beispiel
`https://sygs.de/admin/einlass?c=52e0f163-…`. Das hat zwei Vorteile: Der
eingebaute Scanner liest sie, und wer den Code mit der normalen Kamera-App
seines Handys scannt, landet direkt auf der Einlass-Seite, die den Code sofort
prüft — nach dem Login, denn die Seite ist nicht öffentlich.

Die ID steht in keinem Zusammenhang mit der Nummer auf dem Ausweis. Ein
geratener Code trifft deshalb niemanden.

In der Mitte des Codes liegt das Vereinslogo. Das geht, weil die Codes mit der
Fehlerkorrektur-Stufe **H** erzeugt werden: Sie gleicht bis zu 30 % Verlust
aus, das Logo verdeckt rund 7 %. Geprüft wurde das mit demselben Decoder, den
auch der Scanner benutzt.

> **Wer das Logo größer zieht, muss neu prüfen.**
> Der Wert steht in `components/participant-qr-share.tsx` (`qrSize * 0.26`)
> und in `app/admin/einlass/ausweise/page.tsx` (`w-[6mm]` bei 24 mm Code).
> Ab etwa einem Drittel der Kantenlänge wird es eng.
