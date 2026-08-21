import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { FIELD_TYPES } from '@/lib/forms';

const idSchema = z.string().uuid();

const fieldSchema = z
  .object({
    fieldKey: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^[a-z0-9_]+$/, 'Nur Kleinbuchstaben, Ziffern und Unterstrich'),
    label: z.string().trim().min(1).max(150),
    labelAr: z.string().trim().max(150).optional().default(''),
    fieldType: z.enum(FIELD_TYPES),
    options: z.array(z.string().trim().min(1).max(150)).max(50).optional().default([]),
    optionsAr: z.array(z.string().trim().max(150)).max(50).optional().default([]),
    required: z.boolean().optional().default(false),
  })
  .strict();

const putSchema = z
  .object({
    fields: z.array(fieldSchema).max(50),
  })
  .strict();

// Ersetzt die komplette Felddefinition eines Formulars (die Feld-Maske
// speichert immer den gesamten Stand — Reihenfolge = Array-Reihenfolge).
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'formulare')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 });
    }

    const parsed = putSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }

    // Doppelte Feldschluessel ablehnen, Select-Felder brauchen Optionen
    const keys = parsed.data.fields.map((f) => f.fieldKey);
    if (new Set(keys).size !== keys.length) {
      return NextResponse.json({ error: 'Feldschlüssel müssen eindeutig sein.' }, { status: 400 });
    }
    for (const field of parsed.data.fields) {
      if (field.fieldType === 'select' && field.options.length === 0) {
        return NextResponse.json(
          { error: `Auswahlfeld "${field.label}" braucht mindestens eine Option.` },
          { status: 400 },
        );
      }
    }

    const supabase = getSupabase();

    const { data: form } = await supabase.from('forms').select('id').eq('id', id).maybeSingle();
    if (!form) {
      return NextResponse.json({ error: 'Formular nicht gefunden.' }, { status: 404 });
    }

    const { error: deleteError } = await supabase.from('form_fields').delete().eq('form_id', id);
    if (deleteError) {
      return NextResponse.json({ error: 'Fehler beim Speichern.' }, { status: 500 });
    }

    if (parsed.data.fields.length > 0) {
      const rows = parsed.data.fields.map((f, index) => ({
        form_id: id,
        field_key: f.fieldKey,
        label: f.label,
        label_ar: f.labelAr,
        field_type: f.fieldType,
        options: f.options,
        options_ar: f.optionsAr,
        required: f.required,
        sort_order: index,
      }));

      const { error: insertError } = await supabase.from('form_fields').insert(rows);
      if (insertError) {
        console.error('Felddefinition speichern fehlgeschlagen:', insertError.code);
        return NextResponse.json({ error: 'Fehler beim Speichern.' }, { status: 500 });
      }
    }

    await supabase.from('forms').update({ updated_at: new Date().toISOString() }).eq('id', id);

    const { data: fields } = await supabase
      .from('form_fields')
      .select('id, field_key, label, label_ar, field_type, options, options_ar, required, sort_order')
      .eq('form_id', id)
      .order('sort_order', { ascending: true });

    return NextResponse.json({ fields: fields || [] });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
