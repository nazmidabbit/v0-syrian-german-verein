import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Bitte einloggen, um abzustimmen.' }, { status: 401 })
    }

    if (!user.is_verified) {
      return NextResponse.json(
        { error: 'Ihr Konto ist noch nicht freigeschaltet.' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabase = getSupabase()
    const { candidateId } = await request.json()

    if (!candidateId) {
      return NextResponse.json({ error: 'Kandidat fehlt.' }, { status: 400 })
    }

    const { data: election, error: electionErr } = await supabase
      .from('elections')
      .select('status, starts_at, ends_at')
      .eq('id', id)
      .single()

    if (electionErr || !election) {
      return NextResponse.json({ error: 'Wahl nicht gefunden.' }, { status: 404 })
    }

    if (election.status !== 'active') {
      return NextResponse.json(
        { error: election.status === 'closed' ? 'Diese Wahl ist beendet.' : 'Diese Wahl ist nicht aktiv.' },
        { status: 400 }
      )
    }

    const now = new Date()
    if (now < new Date(election.starts_at)) {
      return NextResponse.json({ error: 'Diese Wahl hat noch nicht begonnen.' }, { status: 400 })
    }
    if (now > new Date(election.ends_at)) {
      return NextResponse.json({ error: 'Diese Wahl ist bereits beendet.' }, { status: 400 })
    }

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('id', candidateId)
      .eq('election_id', id)
      .single()

    if (!candidate) {
      return NextResponse.json({ error: 'Kandidat gehört nicht zu dieser Wahl.' }, { status: 400 })
    }

    const { error: insertErr } = await supabase.from('votes').insert({
      election_id: id,
      candidate_id: candidateId,
      user_id: user.id,
    })

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json({ error: 'Sie haben bereits abgestimmt.' }, { status: 409 })
      }
      console.error('Vote insert error:', insertErr)
      return NextResponse.json({ error: 'Fehler beim Abgeben der Stimme.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Abgeben der Stimme.' }, { status: 500 })
  }
}
