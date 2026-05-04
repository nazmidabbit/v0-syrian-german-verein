import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getAuthUser, hasPermission } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || !hasPermission(user, 'wahlen')) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 })
    }

    const { id } = await params
    const supabase = getSupabase()
    const body = await request.json()
    const { name, nameAr, bio, bioAr, imageUrl, sortOrder } = body

    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich.' }, { status: 400 })
    }

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
      .insert({
        election_id: id,
        name,
        name_ar: nameAr || '',
        bio: bio || '',
        bio_ar: bioAr || '',
        image_url: imageUrl || '',
        sort_order: typeof sortOrder === 'number' ? sortOrder : 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Candidate create error:', error)
      return NextResponse.json({ error: 'Fehler beim Hinzufügen des Kandidaten.' }, { status: 500 })
    }

    return NextResponse.json({ candidate }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Hinzufügen des Kandidaten.' }, { status: 500 })
  }
}
