import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase';

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;

  const supabase = getSupabase();
  const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

  const { data: user } = await supabase
    .from('users')
    .select('id, email, role, is_verified')
    .eq('id', decoded.userId)
    .single();

  if (!user || !user.is_verified) return null;
  return user;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role, is_verified } = body;

    // Admin kann sich nicht selbst die Rolle entziehen
    if (id === authUser.id && role !== 'admin') {
      return NextResponse.json({ error: 'Sie können sich nicht selbst die Admin-Rolle entziehen.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role;
    if (is_verified !== undefined) updateData.is_verified = is_verified;

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, role, is_verified, email_verified, created_at')
      .single();

    if (error) {
      console.error('User Update Fehler:', error);
      return NextResponse.json({ error: error.message || 'Fehler beim Aktualisieren.' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json({ user });
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
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { id } = await params;

    // Admin kann sich nicht selbst löschen
    if (id === authUser.id) {
      return NextResponse.json({ error: 'Sie können sich nicht selbst löschen.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Löschen.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Benutzer gelöscht.' });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
