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
| `lib/participant-card.ts` | Zeichnet den Ausweis auf ein Canvas und reicht ihn zum Teilen weiter |
| `components/participant-qr-share.tsx` | Ausweis mit Vorschau in der Detailansicht |
| `components/participant-share-button.tsx` | Teilen-Knopf auf jeder Kachel der Liste |
| `components/participant-bulk-share.tsx` | Alle angezeigten Ausweise auf einmal teilen |
| `app/api/admin/participants/checkin/route.ts` | Code nachschlagen und ein- beziehungsweise auschecken |
| `app/api/admin/participants/qr-shared/route.ts` | Vermerk, dass jemand seinen Ausweis bekommen hat |
| `app/api/admin/participants/status/route.ts` | Absagen und Wiederanmelden |
| `app/api/admin/participants/name/route.ts` | Namen berichtigen, alte Schreibweise aufheben |
| `components/participant-name-edit.tsx` | Maske dafür in der Detailansicht |

Beide Seiten liegen unter der Berechtigung **Teilnehmer**. Wer am Eingang
steht, braucht damit keinen Zugriff auf Formulare oder Mitgliedsanträge.

---

## Vor der Veranstaltung

1. **Ausweise drucken.** Admin → Einlass → „Ausweise drucken". Zehn Ausweise
   pro A4-Seite, mit Nummer, Namen auf Deutsch und Arabisch, Sportart, Ehrung
   und QR-Code. Am besten auf festeres Papier, dann halten sie den Abend durch.
2. **Ausweise verteilen.** Mit der Einladung, oder einzeln als Bild. Für den
   schnellen Weg sitzt in der Teilnehmerliste links oben auf jeder Kachel ein
   **Teilen-Knopf** — einmal antippen, das Teilen-Menü geht auf, fertig. Wer
   den Ausweis vorher sehen will, tippt die Kachel an und findet ihn unten in
   der Detailansicht mit „Teilen" und „Speichern".

   Auf dem Handy öffnet „Teilen" direkt WhatsApp; am Rechner wird die Datei
   gespeichert. Der QR-Code funktioniert auch vom Handydisplay.

   Sobald eine Karte weitergegeben ist, gilt die Person als eingeladen und
   wird doppelt markiert: ein grünes Häkchen oben rechts auf der Kachel und
   darunter die Zeile **„Eingeladen · تمت الدعوة"** mit Datum. Der Zähler
   **Eingeladen** zeigt den Gesamtstand.

   Rechts neben den Status-Filtern steht der Einladungsfilter:
   **Alle · Eingeladen · Nicht eingeladen**. „Nicht eingeladen" lässt genau
   die übrig, die noch dran sind — sie verschwinden daraus, sobald du geteilt
   hast. Ist die Liste leer, sind alle versorgt.

   Der Vermerk wird beim Teilen *und* beim Speichern gesetzt, einzeln wie im
   Sammelversand; bricht man den Teilen-Dialog ab, passiert nichts.

3. **Alte Check-ins zurücksetzen.** Wurde vorher getestet, stehen noch
   Häkchen in der Liste. Zurücknehmen lassen sie sich einzeln unter
   Formulare → Ergebnisse oder direkt beim Scan über „Check-in zurücknehmen".

### Wenn jemand absagt

Admin → Teilnehmer → Person antippen → **„Hat abgesagt"**. Die Person bleibt
mit ihrer Nummer in der Liste, zählt aber nicht mehr als angemeldet, und ein
bereits gesetzter Check-in wird zurückgenommen. Über den Filter **Abgesagt**
sieht man alle Absagen, im Detailfenster steht **„Wieder anmelden"** bereit,
falls es sich doch noch ändert.

Kommt jemand trotz Absage und lässt scannen, zeigt der Eingang **rot „Hat
abgesagt · اعتذر عن الحضور"** — eingelassen wird er nicht stillschweigend.

> **Absagen statt löschen.**
> Die Nummer folgt der Reihenfolge im Dokument. Wird jemand mitten aus der
> Liste entfernt, stimmen die bereits gedruckten und verschickten Ausweise
> nicht mehr, und es ist nicht mehr nachvollziehbar, wer eingeladen war.
> Deshalb bleibt die Person stehen und wird nur als abgesagt geführt.
>
> Endgültig löschen — samt hochgeladenem Foto, wie es die DSGVO bei einem
> Löschverlangen verlangt — geht weiterhin unter Formulare → Ergebnisse, und
> zwar nur mit der Berechtigung „formulare".

### Einen Namen berichtigen

Admin → Teilnehmer → Person antippen → **„Name ändern"**. Dort stehen Vorname,
Nachname und der arabische Name.

Die bisherige Schreibweise wird dabei aufgehoben. Das ist kein Beiwerk: Das
Import-Skript erkennt Personen am Namen, und ohne diesen Vermerk fände es
jemanden nach einer Korrektur nicht wieder und legte ihn ein zweites Mal an.

> **Wer seine Karte schon hat, braucht nach einer Namensänderung eine neue.**
> Der QR-Code bleibt gültig — er hängt nicht am Namen —, aber auf dem Ausweis
> steht noch die alte Schreibweise.

### Die Richtigen finden

Über der Liste stehen sechs Auswahlmenüs: **Sportart · Liste · Ehrung ·
Kategorie · Verein · Notiz**. Sie lassen sich kombinieren — „Ringen" plus
„ميدالية" zeigt die fünfzehn Ringer mit Medaille, „Notiz: ضيف" die achtzehn
Gäste von außerhalb. Neben jedem Wert steht, wie viele Personen ihn haben;
Werte, die niemand hat, tauchen gar nicht erst auf.

Das Suchfeld daneben durchsucht alles Übrige: Namen auf Deutsch und Arabisch,
Nummer, Funktion, Verein, Notizen. Die Funktion (لاعب, حكم كرة قدم, …) hat über
vierzig verschiedene Werte und steht deshalb bewusst nicht als Menü da — dafür
ist die Suche schneller.

Unter den Filtern steht, wie viele übrig sind, und rechts daneben
**„N Ausweise teilen"**: damit gehen alle angezeigten Ausweise in einem Rutsch
ins Teilen-Menü — etwa die einer Mannschaft an deren Trainer. Über dreißig
Stück nimmt WhatsApp nicht an, dann bittet der Knopf um eine engere Auswahl.
Wo kein Teilen-Menü für mehrere Dateien da ist, werden sie einzeln gespeichert.

> **Der Vermerk übersteht den Wechsel zu WhatsApp.**
> Sobald eine andere App in den Vordergrund kommt, friert der Browser die
> Seite ein. Eine laufende Anfrage kann dann einfach verschwinden — sie
> schlägt nicht fehl, sie kommt nur nie an. Deshalb geht jeder Vermerk sofort
> an den Server *und* wird zugleich im Browser vorgemerkt; gestrichen wird er
> erst, wenn der Server bestätigt hat. Was offen bleibt, geht beim nächsten
> Blick auf die Seite erneut raus — auch nach einem Neuladen.
>
> Bestätigt der Server nicht sofort, zeigt der Teilen-Knopf ein gelbes
> Warnzeichen statt des grünen Häkchens. Dann ist der Ausweis zwar draußen,
> der Vermerk aber noch unterwegs — nach dem nächsten Laden der Seite steht er.

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
   | Rot — *Hat abgesagt* | zwei tiefe Töne | die Person hat abgesagt und wird nicht eingecheckt |

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

> **Eine einmal vergebene Nummer bleibt.**
> Wer schon eine Nummer hat, behält sie bei jedem weiteren Lauf — auch wenn er
> im Dokument inzwischen an anderer Stelle steht. Sonst würden bereits
> gedruckte und verschickte Ausweise falsch. Neue Personen bekommen die
> nächsten freien Nummern.
>
> **Nur beim allerersten Lauf** folgt die Nummerierung der Reihenfolge im
> Dokument. Sind die Ausweise schon
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
