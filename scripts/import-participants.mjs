// Teilnehmer aus den Ehrungslisten (.docx) in ein Formular importieren.
//
//   node scripts/import-participants.mjs <pfad.docx> [--form <slug>] [--apply]
//
// Ohne --apply passiert nichts in der Datenbank (Probelauf, schreibt nur
// scripts/import-vorschau.json). Der Lauf ist wiederholbar: bereits vorhandene
// Personen werden am Namen erkannt und nur ergaenzt, nie doppelt angelegt.
//
// Die Datei enthaelt mehrere Quelllisten je Sportart plus abgeleitete Sichten
// (Kaesse/Schilde/Medaillen, Buehnenreihenfolge). Personen entstehen nur aus
// den Quelllisten; die abgeleiteten Sichten ergaenzen Ehrung und Sportart.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SLUG = 'das-erste-sportliche-treffen';
const QUELLE = 'Ehrungslisten (docx)';

// ---------------------------------------------------------------- docx lesen

// Eine .docx ist ein ZIP. Statt eines Pakets nur der eine Eintrag, den wir
// brauchen: ueber das Central Directory ans Ende der Datei, den Eintrag
// suchen, seine Daten entpacken.
function readZipEntry(zipPath, entryName) {
  const buf = fs.readFileSync(zipPath);

  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 0xffff; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`${path.basename(zipPath)} ist kein gueltiges ZIP/docx.`);

  const entryCount = buf.readUInt16LE(eocd + 10);
  let pos = buf.readUInt32LE(eocd + 16);

  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break;
    const method = buf.readUInt16LE(pos + 10);
    const compressedSize = buf.readUInt32LE(pos + 20);
    const nameLength = buf.readUInt16LE(pos + 28);
    const extraLength = buf.readUInt16LE(pos + 30);
    const commentLength = buf.readUInt16LE(pos + 32);
    const localOffset = buf.readUInt32LE(pos + 42);
    const name = buf.toString('utf8', pos + 46, pos + 46 + nameLength);

    if (name === entryName) {
      // Die Laengen im lokalen Header duerfen von denen im Central Directory
      // abweichen — fuer den Datenanfang zaehlt der lokale Header.
      const localNameLength = buf.readUInt16LE(localOffset + 26);
      const localExtraLength = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const data = buf.subarray(start, start + compressedSize);
      return (method === 0 ? data : zlib.inflateRawSync(data)).toString('utf8');
    }

    pos += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`${entryName} nicht in ${path.basename(zipPath)} gefunden.`);
}

// word/document.xml enthaelt Absaetze und Tabellen in Dokumentreihenfolge.
// Fuer diese Struktur reichen Regexe — kein XML-Parser noetig.
const readDocumentXml = (docxPath) => readZipEntry(docxPath, 'word/document.xml');

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

// Das Leerzeichen im Muster ist Absicht: <w:t...> darf nicht auf <w:tcPr> passen
const textOf = (fragment) =>
  decode([...fragment.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join(''))
    .replace(/\s+/g, ' ')
    .trim();

function parseBlocks(xml) {
  const body = xml.slice(xml.indexOf('<w:body>'));
  const blocks = [];
  let consumedUntil = 0;

  for (const match of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>|<w:p\/>/g)) {
    if (match.index < consumedUntil) continue; // Absatz innerhalb einer Tabelle
    consumedUntil = match.index + match[0].length;

    if (match[0].startsWith('<w:tbl>')) {
      const rows = [...match[0].matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((tr) =>
        [...tr[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((tc) => textOf(tc[0])),
      );
      blocks.push({ type: 'table', rows });
    } else {
      blocks.push({ type: 'p', text: textOf(match[0]) });
    }
  }
  return blocks;
}

// --------------------------------------------------------------- Listen lesen

const LIST_HEADING = 'القائمة النهائية للمشاركين والمكرَّمين';
// Ab dieser Ueberschrift folgen nur noch Auswertungen derselben Personen
const DERIVED_FROM = 'الإحصائيات العامة';

const COL_NAME_AR = 'الاسم';
const COL_NAME_GUEST = 'اسم الضيف';
const COL_ROLE = 'الصفة';
const COL_CATEGORY = 'الفئة';
const COL_CLUB = 'النادي';
const COL_HONOUR = 'نوع التكريم';
const COL_HONOUR_SHORT = 'التكريم';
const COL_NOTE = 'ملاحظات';
const COL_LIST = 'القائمة';
const COL_GAME = 'اللعبة';

// Zwischenzeilen der Listen (Summen, Hinweise, Farblegende) sind keine
// Unterueberschriften
const NOISE = new RegExp(
  '^(المجموع|ملاحظة|ملاحظات|العدد|ترتيب|عمود|مفتاح|اعتذر|مستبعد|الإجمالي|أولا|ثانيا|ثالثا|•|\\()',
);

// Sportart je Liste — zweisprachig, wie alles andere im Verein auch
const SPORT_DE = {
  'كمال الأجسام': 'Bodybuilding',
  'السباحة': 'Schwimmen',
  'المصارعة': 'Ringen',
  'كرة القدم': 'Fußball',
  'الملاكمة': 'Boxen',
  'الكاراتيه': 'Karate',
  'كرة اليد': 'Handball',
  'التايكواندو': 'Taekwondo',
  'الجودو': 'Judo',
  'ألعاب القوى': 'Leichtathletik',
  'اللياقة البدنية': 'Fitness',
};

// Listennamen, die nicht dem Sportnamen entsprechen
const LIST_TO_SPORT = {
  'كرة القدم — أندية سارلاند': 'كرة القدم',
  'فريق Boxod': 'الملاكمة',
};

function readTables(blocks) {
  const rows = [];
  let section = '';
  let derived = false;

  for (const block of blocks) {
    if (block.type === 'p') {
      const text = block.text;
      if (!text) continue;
      if (text === LIST_HEADING) {
        section = '?';
        continue;
      }
      if (section === '?') {
        section = text;
        if (text === DERIVED_FROM) derived = true;
        continue;
      }
      continue;
    }

    const head = (block.rows[0] || []).map((h) => h.trim());
    if (!head.includes(COL_NAME_AR) && !head.includes(COL_NAME_GUEST)) continue;

    for (const cells of block.rows.slice(1)) {
      const row = {};
      head.forEach((key, i) => {
        row[key] = (cells[i] || '').trim();
      });
      if (row[COL_NAME_AR] || row[COL_NAME_GUEST]) rows.push({ section, derived, row });
    }
  }
  return rows;
}

// ------------------------------------------------------------- Namensabgleich

// Arabisch: Diakritika, Tatweel und die austauschbaren Buchstabenformen
// vereinheitlichen, damit "أحمد نعمة" und "احمد نعمه" dieselbe Person sind
const normAr = (s) =>
  (s || '')
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^ء-ي ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normLat = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Transliterationen weichen voneinander ab ("Ghazali" / "Gazaleh"). Solche
// Paare werden nicht automatisch zusammengefuehrt, aber gemeldet — die
// Entscheidung trifft ein Mensch, und zwar indem er name_ar an der
// vorhandenen Einsendung nachtraegt.
function editDistance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = prev[j];
      prev[j] = next;
    }
  }
  return prev[b.length];
}

function looksLikeSamePerson(a, b) {
  if (!a || !b || a === b) return false;
  const distance = editDistance(a, b);
  return distance <= Math.floor(Math.max(a.length, b.length) / 4);
}

function splitName(latin) {
  const parts = (latin || '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

// --------------------------------------------------------- Personen aufbauen

function buildPeople(tableRows) {
  const people = [];
  const byAr = new Map();
  const byLat = new Map();
  const warnings = [];

  const find = (ar, lat) => {
    const a = normAr(ar);
    const l = normLat(lat);
    return (a && byAr.get(a)) || (l && byLat.get(l)) || null;
  };

  const add = (list, value) => {
    const v = (value || '').trim();
    if (v && !list.includes(v)) list.push(v);
  };

  for (const { section, derived, row } of tableRows) {
    const nameAr = (row[COL_NAME_AR] || row[COL_NAME_GUEST] || '').trim();
    const nameLat = (row['Name'] || '').trim();
    let person = find(nameAr, nameLat);

    if (!person) {
      if (derived) {
        warnings.push(`Nur in abgeleiteter Liste "${section}": ${nameAr} / ${nameLat}`);
        continue;
      }
      person = {
        name_ar: nameAr,
        name_lat: nameLat,
        listen: [],
        rollen: [],
        kategorien: [],
        vereine: [],
        ehrungen: [],
        sportarten: [],
        notizen: [],
      };
      people.push(person);
    }

    if (normAr(nameAr)) byAr.set(normAr(nameAr), person);
    if (normLat(nameLat)) byLat.set(normLat(nameLat), person);
    if (!person.name_lat && nameLat) person.name_lat = nameLat;

    if (!derived) add(person.listen, section);
    add(person.rollen, row[COL_ROLE]);
    add(person.kategorien, row[COL_CATEGORY]);
    add(person.vereine, row[COL_CLUB]);
    add(person.ehrungen, row[COL_HONOUR] || row[COL_HONOUR_SHORT]);
    add(person.notizen, row[COL_NOTE]);

    // Sportart: aus der Quellliste, sonst aus der Spalte der abgeleiteten Sicht.
    // So bekommen Trainer und Gaeste ihre Sportart aus den Buehnenlisten.
    const raw = derived ? row[COL_LIST] || row[COL_GAME] || '' : section;
    const sportAr = LIST_TO_SPORT[raw] || raw;
    if (SPORT_DE[sportAr]) add(person.sportarten, sportAr);
  }

  return { people, warnings };
}

function toSubmissionData(person, nr) {
  const sportAr = person.sportarten[0] || '';

  return {
    ...splitName(person.name_lat),
    name_ar: person.name_ar,
    teilnehmer_nr: String(nr),
    sportart: sportAr ? `${SPORT_DE[sportAr]} · ${sportAr}` : '',
    name_des_vereins: person.vereine.join(' / '),
    rolle_ar: person.rollen.join(' · '),
    kategorie_ar: person.kategorien.join(' · '),
    ehrung_ar: person.ehrungen.join(' · '),
    liste_ar: person.listen.join(' · '),
    notiz_ar: person.notizen.join(' · '),
    quelle: QUELLE,
  };
}

// ----------------------------------------------------------------------- Lauf

function loadEnv(root) {
  const text = fs.readFileSync(path.join(root, '.env'), 'utf8');
  const pick = (key) => ((text.match(new RegExp(`^${key}=(.*)$`, 'm')) || [])[1] || '').trim();
  return { url: pick('NEXT_PUBLIC_SUPABASE_URL'), key: pick('SUPABASE_SERVICE_ROLE_KEY') };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const slug = args.includes('--form') ? args[args.indexOf('--form') + 1] : DEFAULT_SLUG;
  const docxPath = args.find((a) => a.toLowerCase().endsWith('.docx'));

  if (!docxPath) {
    console.error('Aufruf: node scripts/import-participants.mjs <pfad.docx> [--form <slug>] [--apply]');
    process.exit(1);
  }

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const env = loadEnv(root);
  const supabase = createClient(env.url, env.key);

  const tableRows = readTables(parseBlocks(readDocumentXml(path.resolve(docxPath))));
  const { people, warnings } = buildPeople(tableRows);

  const sourceRows = tableRows.filter((r) => !r.derived).length;
  console.log(`Zeilen in der Datei: ${tableRows.length} (Quelllisten: ${sourceRows})`);
  console.log(`Personen nach Zusammenfuehrung: ${people.length}`);
  warnings.forEach((w) => console.log('  ! ' + w));

  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('id, title, title_ar')
    .eq('slug', slug)
    .maybeSingle();
  if (formError || !form) throw new Error(`Formular "${slug}" nicht gefunden.`);
  console.log(`Formular: ${form.title} / ${form.title_ar}`);

  const { data: existing, error: subError } = await supabase
    .from('form_submissions')
    .select('id, data, created_at')
    .eq('form_id', form.id)
    .order('created_at', { ascending: true });
  if (subError) throw new Error(subError.message);

  // Vorhandene Einsendungen indizieren — arabischer wie lateinischer Name.
  //
  // Dazu alias_ar: Wird ein Name nach dem Import berichtigt ("موفق سامر" ->
  // "موفق قلة"), findet ihn dieser Lauf sonst nicht wieder und legt die Person
  // ein zweites Mal an. Im alias_ar steht deshalb, wie sie in der Liste heisst.
  const index = new Map();
  for (const sub of existing) {
    const d = sub.data || {};
    const lat = normLat(`${d.first_name || ''} ${d.last_name || ''}`);
    const ar = normAr(d.name_ar || `${d.first_name || ''} ${d.last_name || ''}`);
    if (lat) index.set('lat:' + lat, sub);
    if (ar) index.set('ar:' + ar, sub);
    for (const alias of String(d.alias_ar || '').split('·')) {
      const a = normAr(alias);
      if (a) index.set('ar:' + a, sub);
      const l = normLat(alias);
      if (l) index.set('lat:' + l, sub);
    }
  }
  const matchExisting = (p) =>
    index.get('ar:' + normAr(p.name_ar)) || index.get('lat:' + normLat(p.name_lat)) || null;

  // Nummern folgen der Dokumentreihenfolge; Online-Anmeldungen, die in keiner
  // Liste stehen, haengen hinten an.
  //
  // Wer schon eine Nummer hat, behaelt sie — auch wenn er im Dokument
  // inzwischen an anderer Stelle steht. Sonst wuerden bereits gedruckte und
  // verschickte Ausweise falsch.
  const vergeben = new Set(
    existing.map((s) => Number(s.data?.teilnehmer_nr) || 0).filter(Boolean),
  );
  let naechste = 0;
  const naechsteFreie = () => {
    do {
      naechste += 1;
    } while (vergeben.has(naechste));
    vergeben.add(naechste);
    return naechste;
  };
  const nummerVon = (sub) => Number(sub?.data?.teilnehmer_nr) || 0;

  const matched = new Set();
  const plan = [];

  for (const person of people) {
    const hit = matchExisting(person);
    if (hit) matched.add(hit.id);
    plan.push({ person, nr: nummerVon(hit) || naechsteFreie(), existing: hit });
  }
  const leftovers = existing.filter((s) => !matched.has(s.id));
  for (const sub of leftovers) {
    plan.push({ person: null, nr: nummerVon(sub) || naechsteFreie(), existing: sub });
  }

  // Fast-Treffer melden, bevor jemand doppelt in der Halle steht
  const offeneEinsendungen = existing.filter((s) => !matched.has(s.id));
  for (const entry of plan) {
    if (!entry.person || entry.existing) continue;
    for (const sub of offeneEinsendungen) {
      const d = sub.data || {};
      const vorhanden = normLat(`${d.first_name || ''} ${d.last_name || ''}`);
      if (looksLikeSamePerson(normLat(entry.person.name_lat), vorhanden)) {
        console.log(
          `  ? moeglicherweise dieselbe Person: "${entry.person.name_lat}" (Liste) und ` +
            `"${d.first_name} ${d.last_name}" (Online-Anmeldung, ${d.email || 'ohne E-Mail'}). ` +
            `Wenn ja: name_ar = "${entry.person.name_ar}" an der Anmeldung eintragen und neu laufen lassen.`,
        );
      }
    }
  }

  const neu = plan.filter((p) => !p.existing);
  const ergaenzt = plan.filter((p) => p.existing && p.person);
  const erstmalsNummer = plan.filter((p) => p.existing && !nummerVon(p.existing));
  if (erstmalsNummer.length > 0) {
    console.log(`\nBekommen erstmals eine Nummer: ${erstmalsNummer.length}`);
    erstmalsNummer.forEach((p) =>
      console.log(
        `  #${p.nr} ${p.existing.data?.name_ar || ''} ${p.existing.data?.first_name || ''} ${p.existing.data?.last_name || ''}`.trimEnd(),
      ),
    );
  }
  console.log(
    `\nNeu anzulegen: ${neu.length} · schon angemeldet, wird ergaenzt: ${ergaenzt.length} · nur Nummer: ${leftovers.length}`,
  );
  ergaenzt.forEach((p) =>
    console.log(
      `  = ${p.person.name_ar} / ${p.person.name_lat} -> vorhanden als "${p.existing.data?.first_name} ${p.existing.data?.last_name}"`,
    ),
  );

  if (!apply) {
    const preview = plan.map((p) => ({
      nr: p.nr,
      neu: !p.existing,
      ...(p.person ? toSubmissionData(p.person, p.nr) : { id: p.existing.id, ...p.existing.data }),
    }));
    fs.writeFileSync(
      path.join(root, 'scripts', 'import-vorschau.json'),
      JSON.stringify(preview, null, 1),
      'utf8',
    );
    console.log('\nProbelauf — nichts geschrieben. Vorschau: scripts/import-vorschau.json');
    console.log('Zum Schreiben denselben Aufruf mit --apply wiederholen.');
    return;
  }

  const inserts = [];
  for (const entry of plan) {
    if (!entry.existing) {
      inserts.push({
        form_id: form.id,
        data: toSubmissionData(entry.person, entry.nr),
        status: 'confirmed',
        email: '',
        ip_hash: '',
      });
      continue;
    }

    // Vorhandene Einsendung: Nummer setzen, Listenangaben nur ergaenzen —
    // selbst eingetragene Werte bleiben unangetastet
    const merged = { ...entry.existing.data, teilnehmer_nr: String(entry.nr) };
    if (entry.person) {
      for (const [key, value] of Object.entries(toSubmissionData(entry.person, entry.nr))) {
        if (!value || key === 'first_name' || key === 'last_name') continue;
        // name_ar nicht ueberschreiben: Eine Berichtigung von Hand soll
        // bestehen bleiben, auch wenn die Liste noch den alten Namen fuehrt.
        if (key === 'name_ar' && merged.name_ar && merged.name_ar !== value) continue;
        if (!merged[key]) merged[key] = value;
      }
    }
    const { error } = await supabase
      .from('form_submissions')
      .update({ data: merged })
      .eq('id', entry.existing.id);
    if (error) throw new Error(`Update ${entry.existing.id}: ${error.message}`);
  }

  for (let i = 0; i < inserts.length; i += 50) {
    const { error } = await supabase.from('form_submissions').insert(inserts.slice(i, i + 50));
    if (error) throw new Error(`Insert: ${error.message}`);
    console.log(`  eingefuegt: ${Math.min(i + 50, inserts.length)}/${inserts.length}`);
  }

  console.log(`\nFertig. ${inserts.length} neu angelegt, ${plan.length - inserts.length} aktualisiert.`);
}

main().catch((e) => {
  console.error('\nAbbruch:', e.message);
  process.exit(1);
});
