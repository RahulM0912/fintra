import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all categories for the user (include id and type)
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, type')


    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to the expected format
    const categories = (data || [])
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type
      }));

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
