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
      .select('id, status')
      .eq('id', id)
      .single()

    if (electionErr || !election) {
      return NextResponse.json({ error: 'Wahl nicht gefunden.' }, { status: 404 })
    }

    if (election.status !== 'closed') {
      const user = await getAuthUser()
      if (!user || !hasPermission(user, 'wahlen')) {
        return NextResponse.json(
          { error: 'Ergebnisse sind erst nach Wahl-Ende verfügbar.' },
          { status: 403 }
        )
      }
    }

    const { data: candidates } = await supabase
      .from('candidates')
      .select('id, name, name_ar, image_url, sort_order')
      .eq('election_id', id)
      .order('sort_order', { ascending: true })

    const { data: votes } = await supabase
      .from('votes')
      .select('candidate_id')
      .eq('election_id', id)

    const counts = new Map<string, number>()
    for (const v of votes || []) {
      counts.set(v.candidate_id, (counts.get(v.candidate_id) || 0) + 1)
    }

    const results = (candidates || []).map((c) => ({
      candidateId: c.id,
      name: c.name,
      nameAr: c.name_ar,
      imageUrl: c.image_url,
      count: counts.get(c.id) || 0,
    }))

    const totalVotes = results.reduce((sum, r) => sum + r.count, 0)

    const { count: eligibleCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true)

    const turnout = eligibleCount && eligibleCount > 0 ? totalVotes / eligibleCount : 0

    return NextResponse.json({
      status: election.status,
      results,
      totalVotes,
      eligibleCount: eligibleCount || 0,
      turnout,
    })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Laden der Ergebnisse.' }, { status: 500 })
  }
}
