import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getAuthUser, hasPermission } from '@/lib/auth'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['active'],
  active: ['closed'],
  closed: [],
}

export async function PATCH(
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
    const { status } = await request.json()

    if (!['draft', 'active', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Ungültiger Status.' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('elections')
      .select('status')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Wahl nicht gefunden.' }, { status: 404 })
    }

    if (!ALLOWED_TRANSITIONS[existing.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Übergang von "${existing.status}" zu "${status}" nicht erlaubt.` },
        { status: 400 }
      )
    }

    if (status === 'active') {
      const { count } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', id)

      if (!count || count < 2) {
        return NextResponse.json(
          { error: 'Mindestens 2 Kandidaten erforderlich, bevor die Wahl gestartet werden kann.' },
          { status: 400 }
        )
      }
    }

    const { data: election, error } = await supabase
      .from('elections')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Aktualisieren des Status.' }, { status: 500 })
    }

    return NextResponse.json({ election })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Status.' }, { status: 500 })
  }
}
