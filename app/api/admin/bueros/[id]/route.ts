import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

const idSchema = z.string().uuid();

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    nameAr: z.string().trim().max(100).optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'bueros')) {
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
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.nameAr !== undefined) update.name_ar = parsed.data.nameAr;
    if (parsed.data.sortOrder !== undefined) update.sort_order = parsed.data.sortOrder;
    if (parsed.data.isActive !== undefined) update.is_active = parsed.data.isActive;

    const { data, error } = await getSupabase()
      .from('offices')
      .update(update)
      .eq('id', id)
      .select('id, name, name_ar, sort_order, is_active, created_at')
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        return NextResponse.json({ error: 'Ein Büro mit diesem Namen existiert bereits.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Büro nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json({ office: data });
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
    if (!authUser || !hasPermission(authUser, 'bueros')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 });
    }

    // Referenzen in Mitgliedsantraegen werden per FK (ON DELETE SET NULL) geloest
    const { error } = await getSupabase().from('offices').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Löschen.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Büro gelöscht.' });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
