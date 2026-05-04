import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getAuthUser, hasPermission } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()

    const { data: election, error: electionErr } = await supabase
      .from('elections')
      .select('*')
      .eq('id', id)
      .single()

    if (electionErr || !election) {
      return NextResponse.json({ error: 'Wahl nicht gefunden.' }, { status: 404 })
    }

    const { data: candidates } = await supabase
      .from('candidates')
      .select('id, name, name_ar, bio, bio_ar, image_url, sort_order')
      .eq('election_id', id)
      .order('sort_order', { ascending: true })

    return NextResponse.json({
      election,
      candidates: candidates || [],
    })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Laden der Wahl.' }, { status: 500 })
  }
}

export async function PUT(
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
    const { title, titleAr, description, descriptionAr, startsAt, endsAt } = body

    const { data: existing } = await supabase
      .from('elections')
      .select('status')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Wahl nicht gefunden.' }, { status: 404 })
    }

    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Nur Wahlen im Entwurfs-Status können bearbeitet werden.' },
        { status: 400 }
      )
    }

    if (endsAt && startsAt && new Date(endsAt) <= new Date(startsAt)) {
      return NextResponse.json(
        { error: 'End-Datum muss nach dem Start-Datum liegen.' },
        { status: 400 }
      )
    }

    const { data: election, error } = await supabase
      .from('elections')
      .update({
        title,
        title_ar: titleAr || '',
        description: description || '',
        description_ar: descriptionAr || '',
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Aktualisieren.' }, { status: 500 })
    }

    return NextResponse.json({ election })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Wahl.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || !hasPermission(user, 'wahlen')) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 })
    }

    const { id } = await params
    const supabase = getSupabase()

    const { error } = await supabase.from('elections').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Wahl nicht gefunden.' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Wahl gelöscht.' })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Löschen der Wahl.' }, { status: 500 })
  }
}
