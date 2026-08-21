import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { slugify } from '@/lib/forms';

const FORM_COLUMNS = 'id, title, title_ar, description, description_ar, slug, is_active, created_at';

const createSchema = z
  .object({
    title: z.string().trim().min(2).max(150),
    titleAr: z.string().trim().max(150).optional().default(''),
    description: z.string().trim().max(2000).optional().default(''),
    descriptionAr: z.string().trim().max(2000).optional().default(''),
  })
  .strict();

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'formulare')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { data, error } = await getSupabase()
      .from('forms')
      .select(`${FORM_COLUMNS}, form_fields(count), form_submissions(count)`)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Laden.' }, { status: 500 });
    }

    // Zaehler aus den eingebetteten count-Aggregaten flach machen
    const forms = (data || []).map((f: Record<string, unknown>) => ({
      ...f,
      field_count: (f.form_fields as { count: number }[])?.[0]?.count ?? 0,
      submission_count: (f.form_submissions as { count: number }[])?.[0]?.count ?? 0,
      form_fields: undefined,
      form_submissions: undefined,
    }));

    return NextResponse.json({ forms });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'formulare')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const baseSlug = slugify(parsed.data.title);

    // Bei Slug-Kollision einmal mit Zeit-Suffix erneut versuchen
    for (const slug of [baseSlug, `${baseSlug}-${Date.now().toString(36)}`]) {
      const { data, error } = await supabase
        .from('forms')
        .insert({
          title: parsed.data.title,
          title_ar: parsed.data.titleAr,
          description: parsed.data.description,
          description_ar: parsed.data.descriptionAr,
          slug,
          is_active: false,
          created_by: authUser.id,
        })
        .select(FORM_COLUMNS)
        .single();

      if (!error && data) {
        return NextResponse.json({ form: data }, { status: 201 });
      }
      if (error && error.code !== '23505') {
        console.error('Formular-Anlage fehlgeschlagen:', error.code);
        return NextResponse.json({ error: 'Fehler beim Erstellen.' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Ein Formular mit diesem Titel existiert bereits.' }, { status: 409 });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
