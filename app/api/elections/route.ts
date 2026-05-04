import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getAuthUser, hasPermission } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active') === '1'

    let query = supabase
      .from('elections')
      .select('*')
      .order('created_at', { ascending: false })

    if (active) {
      query = query.eq('status', 'active').limit(1)
    }

    const { data: elections, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Laden der Wahlen.' }, { status: 500 })
    }

    return NextResponse.json({ elections: elections || [] })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Laden der Wahlen.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user || !hasPermission(user, 'wahlen')) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 })
    }

    const supabase = getSupabase()
    const body = await request.json()
    const { title, titleAr, description, descriptionAr, startsAt, endsAt } = body

    if (!title || !startsAt || !endsAt) {
      return NextResponse.json(
        { error: 'Titel, Start- und End-Datum sind erforderlich.' },
        { status: 400 }
      )
    }

    if (new Date(endsAt) <= new Date(startsAt)) {
      return NextResponse.json(
        { error: 'End-Datum muss nach dem Start-Datum liegen.' },
        { status: 400 }
      )
    }

    const { data: election, error } = await supabase
      .from('elections')
      .insert({
        title,
        title_ar: titleAr || '',
        description: description || '',
        description_ar: descriptionAr || '',
        starts_at: startsAt,
        ends_at: endsAt,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('Election create error:', error)
      return NextResponse.json({ error: 'Fehler beim Erstellen der Wahl.' }, { status: 500 })
    }

    return NextResponse.json({ election }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Erstellen der Wahl.' }, { status: 500 })
  }
}
