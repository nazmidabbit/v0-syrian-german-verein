// Teilnehmer (Formulare, Felder, Einsendungen) in eine Datei sichern.
//
//   node scripts/export-participants.mjs [--fotos]
//
// Schreibt nach exports/teilnehmer-<datum>/:
//   sicherung.json  — vollstaendige Zeilen, genau so, wie sie in der Datenbank
//                     stehen; daraus stellt scripts/restore-participants.mjs
//                     wieder her
//   <slug>.csv      — je Formular eine Tabelle zum Ansehen in Excel
//   fotos/          — nur mit --fotos: die Fotodateien selbst. Kostet Egress
//                     (etwa 150 KB je Foto), deshalb nicht standardmaessig.
//
// Liest nur, aendert nichts in der Datenbank. exports/ steht in .gitignore —
// die Dateien enthalten personenbezogene Daten und gehoeren nicht ins Repo.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const PAGE = 1000;

function loadEnv(root) {
  const text = fs.readFileSync(path.join(root, '.env'), 'utf8');
  const pick = (key) => ((text.match(new RegExp(`^${key}=(.*)$`, 'm')) || [])[1] || '').trim();
  return { url: pick('NEXT_PUBLIC_SUPABASE_URL'), key: pick('SUPABASE_SERVICE_ROLE_KEY') };
}

// Supabase liefert hoechstens 1000 Zeilen je Abfrage
async function readAll(supabase, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",;\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Semikolon und BOM, damit deutsches Excel Spalten und arabische Schrift richtig zeigt
function toCsv(fields, submissions) {
  const keys = fields.map((f) => f.field_key);
  for (const s of submissions) {
    for (const key of Object.keys(s.data || {})) if (!keys.includes(key)) keys.push(key);
  }
  const labels = new Map(fields.map((f) => [f.field_key, f.label]));

  const head = ['id', 'created_at', 'status', 'checked_in_at', ...keys.map((k) => labels.get(k) || k)];
  const lines = [head.map(csvCell).join(';')];
  for (const s of submissions) {
    const d = s.data || {};
    lines.push(
      [s.id, s.created_at, s.status, s.checked_in_at, ...keys.map((k) => d[k])].map(csvCell).join(';'),
    );
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

const PUBLIC_PREFIX = '/storage/v1/object/public/uploads/';

async function downloadPhotos(supabase, submissions, dir) {
  fs.mkdirSync(dir, { recursive: true });
  let count = 0;
  for (const s of submissions) {
    for (const value of Object.values(s.data || {})) {
      if (typeof value !== 'string' || !value.includes(PUBLIC_PREFIX)) continue;
      const storagePath = decodeURIComponent(new URL(value).pathname.split(PUBLIC_PREFIX)[1]);
      const target = path.join(dir, storagePath);
      if (fs.existsSync(target)) continue;

      const { data, error } = await supabase.storage.from('uploads').download(storagePath);
      if (error) {
        console.log(`  ! Foto nicht geladen: ${storagePath} (${error.message})`);
        continue;
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, Buffer.from(await data.arrayBuffer()));
      count += 1;
    }
  }
  return count;
}

async function main() {
  const withPhotos = process.argv.includes('--fotos');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const env = loadEnv(root);
  const supabase = createClient(env.url, env.key);

  const forms = await readAll(supabase, 'forms');
  const fields = await readAll(supabase, 'form_fields');
  const submissions = await readAll(supabase, 'form_submissions');

  const stamp = new Date().toISOString().slice(0, 10);
  const dir = path.join(root, 'exports', `teilnehmer-${stamp}`);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(
    path.join(dir, 'sicherung.json'),
    JSON.stringify(
      { exportiert_am: new Date().toISOString(), forms, form_fields: fields, form_submissions: submissions },
      null,
      1,
    ),
    'utf8',
  );

  for (const form of forms) {
    const own = submissions.filter((s) => s.form_id === form.id);
    if (own.length === 0) continue;
    const ownFields = fields
      .filter((f) => f.form_id === form.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    fs.writeFileSync(path.join(dir, `${form.slug}.csv`), toCsv(ownFields, own), 'utf8');
    console.log(`${form.slug}: ${own.length} Einsendungen`);
  }

  console.log(`Formulare: ${forms.length} · Felder: ${fields.length} · Einsendungen: ${submissions.length}`);

  if (withPhotos) {
    const n = await downloadPhotos(supabase, submissions, path.join(dir, 'fotos'));
    console.log(`Fotos geladen: ${n}`);
  }

  console.log(`\nGesichert in ${path.relative(root, dir)}`);
}

main().catch((err) => {
  console.error('Fehler:', err.message);
  process.exit(1);
});
