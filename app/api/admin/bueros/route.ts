import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

const OFFICE_COLUMNS = 'id, name, name_ar, sort_order, is_active, created_at';

const createSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    nameAr: z.string().trim().max(100).optional().default(''),
    sortOrder: z.number().int().min(0).max(9999).optional().default(0),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'bueros')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { data, error } = await getSupabase()
      .from('offices')
      .select(OFFICE_COLUMNS)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Laden.' }, { status: 500 });
    }

    return NextResponse.json({ offices: data || [] });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'bueros')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .from('offices')
      .insert({
        name: parsed.data.name,
        name_ar: parsed.data.nameAr,
        sort_order: parsed.data.sortOrder,
        is_active: parsed.data.isActive,
      })
      .select(OFFICE_COLUMNS)
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ein Büro mit diesem Namen existiert bereits.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Fehler beim Erstellen.' }, { status: 500 });
    }

    return NextResponse.json({ office: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
