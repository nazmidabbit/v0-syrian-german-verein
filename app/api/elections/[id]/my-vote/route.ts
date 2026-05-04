import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ voted: false })
    }

    const { id } = await params
    const supabase = getSupabase()

    const { data: vote } = await supabase
      .from('votes')
      .select('candidate_id, created_at')
      .eq('election_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!vote) {
      return NextResponse.json({ voted: false })
    }

    return NextResponse.json({
      voted: true,
      candidateId: vote.candidate_id,
      votedAt: vote.created_at,
    })
  } catch {
    return NextResponse.json({ voted: false })
  }
}
