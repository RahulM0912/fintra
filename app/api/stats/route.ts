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

    // Get overview stats for the month
    const { data: monthHistoryData, error: monthError } = await supabase
      .from('month_history')
      .select('income, expense')
      .eq('user_id', userId)
      .eq('month', parseInt(month))
      .eq('year', parseInt(year));

    if (monthError) {
      console.error('Supabase error:', monthError);
      return NextResponse.json(
        { error: monthError.message },
        { status: 500 }
      );
    }

    // Calculate totals from month_history data
    let totalIncome = 0;
    let totalExpense = 0;
    
    if (monthHistoryData && monthHistoryData.length > 0) {
      totalIncome = monthHistoryData.reduce((sum: number, item: any) => sum + (item.income || 0), 0);
      totalExpense = monthHistoryData.reduce((sum: number, item: any) => sum + (item.expense || 0), 0);
    }

    // Get category breakdown by joining transactions and categories tables
    const monthInt = parseInt(month);
    const yearInt = parseInt(year);
    const monthStart = `${yearInt}-${String(monthInt).padStart(2, '0')}-01`;
    const monthEnd = monthInt === 12 
      ? `${yearInt + 1}-01-01` 
      : `${yearInt}-${String(monthInt + 1).padStart(2, '0')}-01`;

    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select('amount, type, category_id, created_at')
      .eq('user_id', userId)
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd);

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

    // Process transaction data to aggregate by category
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const incomeByCategory = (transactionsData || [])
      .filter((item: any) => item.type === 'income')
      .reduce((acc: Record<string, number>, item: any) => {
        const categoryName = categoryMap.get(item.category_id) || 'Other';
        acc[categoryName] = (acc[categoryName] || 0) + item.amount;
        return acc;
      }, {});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expenseByCategory = (transactionsData || [])
      .filter((item: any) => item.type === 'expense')
      .reduce((acc: Record<string, number>, item: any) => {
        const categoryName = categoryMap.get(item.category_id) || 'Other';
        acc[categoryName] = (acc[categoryName] || 0) + item.amount;
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
