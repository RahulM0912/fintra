import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year parameters are required' },
        { status: 400 }
      );
    }

    // Build date range for the month (using UTC dates)
    const monthInt = parseInt(month);
    const yearInt = parseInt(year);
    const monthStart = `${yearInt}-${String(monthInt).padStart(2, '0')}-01`;
    
    // Calculate next month for the end date
    let nextMonth = monthInt + 1;
    let nextYear = yearInt;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = yearInt + 1;
    }
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    console.log(monthStart)
    console.log(monthEnd)

    // Fetch user currency from user_settings table (fallback to EUR)
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('currency')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Supabase error fetching user settings:', settingsError);
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    const currencyCode: string = (userSettings && (userSettings.currency as string)) || 'EUR';

    // Fetch all transactions for the month to calculate totals and category breakdown
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select('amount, type, category_id, created_at')
      .eq('user_id', userId)
      .gte('date', monthStart)
      .lte('date', monthEnd);

    if (transactionsError) {
      console.error('Supabase error:', transactionsError);
      return NextResponse.json(
        { error: transactionsError.message },
        { status: 500 }
      );
    }

    // Get all categories to map category_id to category name
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name');

    if (categoriesError) {
      console.error('Supabase error:', categoriesError);
      return NextResponse.json(
        { error: categoriesError.message },
        { status: 500 }
      );
    }

    // Create a map of category_id to category name
    const categoryMap = new Map((categoriesData || []).map((cat: any) => [cat.id, cat.name]));

    // Calculate totals and category breakdown from transactions
    let totalIncome = 0;
    let totalExpense = 0;

    // Process transaction data to aggregate by category and calculate totals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const incomeByCategory = (transactionsData || [])
      .filter((item: any) => item.type === 'income')
      .reduce((acc: Record<string, number>, item: any) => {
        const categoryName = categoryMap.get(item.category_id) || 'Other';
        acc[categoryName] = (acc[categoryName] || 0) + item.amount;
        totalIncome += item.amount;
        return acc;
      }, {});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expenseByCategory = (transactionsData || [])
      .filter((item: any) => item.type === 'expense')
      .reduce((acc: Record<string, number>, item: any) => {
        const categoryName = categoryMap.get(item.category_id) || 'Other';
        acc[categoryName] = (acc[categoryName] || 0) + item.amount;
        totalExpense += item.amount;
        return acc;
      }, {});

    return NextResponse.json({
      data: {
        overview: {
          total_income: totalIncome,
          total_expense: totalExpense,
          balance: totalIncome - totalExpense,
        },
        incomeByCategory,
        expenseByCategory,
        currency: currencyCode,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
