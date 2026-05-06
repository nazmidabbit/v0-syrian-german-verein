import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = getSupabase();

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_verified, email_verified, permissions, created_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    const { data: voteRows } = await supabase
      .from('votes')
      .select('id, created_at, election_id, candidate_id')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    const electionIds = Array.from(new Set((voteRows || []).map((v) => v.election_id)));
    const candidateIds = Array.from(new Set((voteRows || []).map((v) => v.candidate_id)));

    const [electionsRes, candidatesRes] = await Promise.all([
      electionIds.length
        ? supabase.from('elections').select('id, title, title_ar, status').in('id', electionIds)
        : Promise.resolve({ data: [] as { id: string; title: string; title_ar: string; status: string }[] }),
      candidateIds.length
        ? supabase.from('candidates').select('id, name, name_ar').in('id', candidateIds)
        : Promise.resolve({ data: [] as { id: string; name: string; name_ar: string }[] }),
    ]);

    const electionsMap = new Map((electionsRes.data || []).map((e) => [e.id, e]));
    const candidatesMap = new Map((candidatesRes.data || []).map((c) => [c.id, c]));

    const votes = (voteRows || []).map((v) => ({
      id: v.id,
      createdAt: v.created_at,
      election: electionsMap.get(v.election_id) || null,
      candidate: candidatesMap.get(v.candidate_id) || null,
    }));

    return NextResponse.json({ user, votes });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
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
    const { role, is_verified, permissions } = body;

    // Admin kann sich nicht selbst die Rolle entziehen
    if (id === authUser.id && role !== undefined && role !== 'admin') {
      return NextResponse.json({ error: 'Sie können sich nicht selbst die Admin-Rolle entziehen.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role;
    if (is_verified !== undefined) updateData.is_verified = is_verified;
    if (permissions !== undefined) updateData.permissions = permissions;

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, role, is_verified, email_verified, permissions, created_at')
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
