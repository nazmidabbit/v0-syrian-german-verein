// Teilnehmer aus einer Sicherung von scripts/export-participants.mjs zurueckspielen.
//
//   node scripts/restore-participants.mjs <sicherung.json> [--ueberschreiben] [--apply]
//
// Ohne --apply passiert nichts in der Datenbank (Probelauf, zeigt nur an).
//
// Standard: Nur was fehlt, wird angelegt — erkannt an der id. Zeilen, die es
// noch gibt, bleiben, wie sie sind; Aenderungen seit der Sicherung (Einlass,
// berichtigte Namen) gehen also nicht verloren.
// Mit --ueberschreiben werden auch vorhandene Zeilen auf den Stand der
// Sicherung zurueckgesetzt.
//
// Die Fotos liegen im Storage, nicht in der Datenbank; die Einsendungen
// verweisen nur per URL darauf.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const BATCH = 200;

function loadEnv(root) {
  const text = fs.readFileSync(path.join(root, '.env'), 'utf8');
  const pick = (key) => ((text.match(new RegExp(`^${key}=(.*)$`, 'm')) || [])[1] || '').trim();
  return { url: pick('NEXT_PUBLIC_SUPABASE_URL'), key: pick('SUPABASE_SERVICE_ROLE_KEY') };
}

async function existingIds(supabase, table, ids) {
  const found = new Set();
  for (let i = 0; i < ids.length; i += BATCH) {
    const { data, error } = await supabase.from(table).select('id').in('id', ids.slice(i, i + BATCH));
    if (error) throw new Error(`${table}: ${error.message}`);
    data.forEach((r) => found.add(r.id));
  }
  return found;
}

async function write(supabase, table, rows, overwrite) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase
      .from(table)
      .upsert(rows.slice(i, i + BATCH), { onConflict: 'id', ignoreDuplicates: !overwrite });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const overwrite = args.includes('--ueberschreiben');
  const file = args.find((a) => a.toLowerCase().endsWith('.json'));

  if (!file) {
    console.error('Aufruf: node scripts/restore-participants.mjs <sicherung.json> [--ueberschreiben] [--apply]');
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const env = loadEnv(root);
  const supabase = createClient(env.url, env.key);

  console.log(`Sicherung vom ${backup.exportiert_am}`);

  // Reihenfolge wegen der Fremdschluessel: erst Formulare, dann Felder, dann Einsendungen
  const tables = [
    ['forms', backup.forms || []],
    ['form_fields', backup.form_fields || []],
    ['form_submissions', backup.form_submissions || []],
  ];

  const plan = [];
  for (const [table, rows] of tables) {
    const present = await existingIds(supabase, table, rows.map((r) => r.id));
    const missing = rows.filter((r) => !present.has(r.id));
    const toWrite = overwrite ? rows : missing;
    console.log(
      `${table}: ${rows.length} in der Sicherung · ${present.size} vorhanden · ${missing.length} fehlen` +
        ` -> ${toWrite.length} ${overwrite ? 'schreiben (mit Ueberschreiben)' : 'anlegen'}`,
    );
    plan.push([table, toWrite]);
  }

  if (!apply) {
    console.log('\nProbelauf — nichts geschrieben. Zum Schreiben denselben Aufruf mit --apply wiederholen.');
    return;
  }

  for (const [table, rows] of plan) {
    if (rows.length) await write(supabase, table, rows, overwrite);
  }
  console.log('\nFertig.');
}

main().catch((err) => {
  console.error('Fehler:', err.message);
  process.exit(1);
});
