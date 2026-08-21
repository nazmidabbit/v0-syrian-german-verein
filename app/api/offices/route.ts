import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Oeffentliche Liste der aktiven Arbeitsbueros (fuer das Antragsformular)
export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('offices')
      .select('id, name, name_ar')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'serverError' }, { status: 500 });
    }

    return NextResponse.json({ offices: data || [] });
  } catch {
    return NextResponse.json({ error: 'serverError' }, { status: 500 });
  }
}
