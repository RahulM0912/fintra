import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional query param to limit how many years to return (not required)
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    // Fetch all year_history rows for the user
    const { data: rows, error } = await supabase
      .from('year_history')
      .select('year, income, expense')
      .eq('user_id', userId)
      .order('year', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate by year (sum income and expense)
    const map = new Map<number, { year: number; income: number; expense: number }>();
    (rows || []).forEach((r: any) => {
      const y = r.year as number;
      const existing = map.get(y) || { year: y, income: 0, expense: 0 };
      existing.income += Number(r.income || 0);
      existing.expense += Number(r.expense || 0);
      map.set(y, existing);
    });

    let aggregated = Array.from(map.values()).sort((a, b) => a.year - b.year);

    if (limit && aggregated.length > limit) {
      aggregated = aggregated.slice(-limit);
    }

    return NextResponse.json({ data: aggregated });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
