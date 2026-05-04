import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getAuthUser, hasPermission } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || !hasPermission(user, 'wahlen')) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 })
    }

    const { id, candidateId } = await params
    const supabase = getSupabase()
    const body = await request.json()
    const { name, nameAr, bio, bioAr, imageUrl, sortOrder } = body

    const { data: election } = await supabase
      .from('elections')
      .select('status')
      .eq('id', id)
      .single()

    if (!election) {
      return NextResponse.json({ error: 'Wahl nicht gefunden.' }, { status: 404 })
    }

    if (election.status === 'closed') {
      return NextResponse.json(
        { error: 'Beendete Wahlen können nicht mehr geändert werden.' },
        { status: 400 }
      )
    }

    const { data: candidate, error } = await supabase
      .from('candidates')
      .update({
        name,
        name_ar: nameAr || '',
        bio: bio || '',
        bio_ar: bioAr || '',
        image_url: imageUrl || '',
        sort_order: typeof sortOrder === 'number' ? sortOrder : 0,
      })
      .eq('id', candidateId)
      .eq('election_id', id)
      .select()
      .single()

    if (error || !candidate) {
      return NextResponse.json({ error: 'Kandidat nicht gefunden.' }, { status: 404 })
    }

    return NextResponse.json({ candidate })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Kandidaten.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || !hasPermission(user, 'wahlen')) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 })
    }

    const { id, candidateId } = await params
    const supabase = getSupabase()

    const { data: election } = await supabase
      .from('elections')
      .select('status')
      .eq('id', id)
      .single()

    if (!election) {
      return NextResponse.json({ error: 'Wahl nicht gefunden.' }, { status: 404 })
    }

    if (election.status !== 'draft') {
      return NextResponse.json(
        { error: 'Kandidaten können nur im Entwurfs-Status gelöscht werden.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidateId)
      .eq('election_id', id)

    if (error) {
      return NextResponse.json({ error: 'Kandidat nicht gefunden.' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Kandidat gelöscht.' })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Löschen des Kandidaten.' }, { status: 500 })
  }
}
