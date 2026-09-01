import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

const FORM_COLUMNS =
  'id, title, title_ar, description, description_ar, slug, is_active, created_at, event_id, max_participants, closes_at, waitlist_enabled, unique_by_email';
const FIELD_COLUMNS = 'id, field_key, label, label_ar, field_type, options, options_ar, required, sort_order';

const idSchema = z.string().uuid();

const patchSchema = z
  .object({
    title: z.string().trim().min(2).max(150).optional(),
    titleAr: z.string().trim().max(150).optional(),
    description: z.string().trim().max(2000).optional(),
    descriptionAr: z.string().trim().max(2000).optional(),
    isActive: z.boolean().optional(),
    // Anmelde-Einstellungen; null loescht den jeweiligen Wert
    eventId: z.string().uuid().nullable().optional(),
    maxParticipants: z.number().int().min(1).max(100_000).nullable().optional(),
    closesAt: z.string().datetime().nullable().optional(),
    waitlistEnabled: z.boolean().optional(),
    uniqueByEmail: z.boolean().optional(),
  })
  .strict();

export async function GET(
  _request: Request,
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

    const supabase = getSupabase();
    const { data: form, error } = await supabase
      .from('forms')
      .select(FORM_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error || !form) {
      return NextResponse.json({ error: 'Formular nicht gefunden.' }, { status: 404 });
    }

    const { data: fields } = await supabase
      .from('form_fields')
      .select(FIELD_COLUMNS)
      .eq('form_id', id)
      .order('sort_order', { ascending: true });

    return NextResponse.json({ form, fields: fields || [] });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

export async function PATCH(
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

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.title !== undefined) update.title = parsed.data.title;
    if (parsed.data.titleAr !== undefined) update.title_ar = parsed.data.titleAr;
    if (parsed.data.description !== undefined) update.description = parsed.data.description;
    if (parsed.data.descriptionAr !== undefined) update.description_ar = parsed.data.descriptionAr;
    if (parsed.data.isActive !== undefined) update.is_active = parsed.data.isActive;
    if (parsed.data.eventId !== undefined) update.event_id = parsed.data.eventId;
    if (parsed.data.maxParticipants !== undefined) update.max_participants = parsed.data.maxParticipants;
    if (parsed.data.closesAt !== undefined) update.closes_at = parsed.data.closesAt;
    if (parsed.data.waitlistEnabled !== undefined) update.waitlist_enabled = parsed.data.waitlistEnabled;
    if (parsed.data.uniqueByEmail !== undefined) update.unique_by_email = parsed.data.uniqueByEmail;

    const { data, error } = await getSupabase()
      .from('forms')
      .update(update)
      .eq('id', id)
      .select(FORM_COLUMNS)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Formular nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json({ form: data });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
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

    // Felder und Einsendungen werden per FK (ON DELETE CASCADE) mitgeloescht
    const { error } = await getSupabase().from('forms').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Löschen.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Formular gelöscht.' });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
