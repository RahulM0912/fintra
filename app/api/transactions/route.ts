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
    const limit = searchParams.get('limit') || '10';
    const offset = searchParams.get('offset') || '0';

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        user_id,
        amount,
        date,
        type,
        category_id,
        description,
        created_at,
        updated_at,
        categories:category_id (
          id,
          name,
          icon
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten category data into transaction object for easier access
    const transformedData = (data || []).map((transaction: any) => ({
      ...transaction,
      category: transaction.categories || null,
    }));

    return NextResponse.json({ data: transformedData });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, date, description, category_id, type } = body;

    // Validation
    if (!amount || !date || !category_id || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, date, category, type' },
        { status: 400 }
      );
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Insert transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: userId,
          amount: parseFloat(amount),
          date: date,
          type: type.toLowerCase(),
          category_id: category_id,
          description: description || null,
          created_at: new Date(date).toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

      // Update / Insert into year_history and month_history
      try {
        const inserted = data?.[0];
        const txDate = new Date(date);
        const txDay = txDate.getDate();
        const txMonth = txDate.getMonth() + 1;
        const txYear = txDate.getFullYear();
        const amt = parseFloat(amount);
        const txType = type.toLowerCase(); // 'income' or 'expense'

        // YEAR HISTORY: either update existing month row or insert new
        try {
          const { data: existingYearRow } = await supabase
            .from('year_history')
            .select('*')
            .eq('user_id', userId)
            .eq('month', txMonth)
            .eq('year', txYear)
            .limit(1)
            .single();

          if (existingYearRow) {
            const field = txType === 'income' ? 'income' : 'expense';
            const newValue = (existingYearRow[field] || 0) + amt;
            await supabase
              .from('year_history')
              .update({ [field]: newValue })
              .eq('user_id', userId)
              .eq('month', txMonth)
              .eq('year', txYear);
              console.log("Already present")
          } else {
            const insertObj: any = {
              user_id: userId,
              month: txMonth,
              year: txYear,
              income: 0,
              expense: 0,
            };
            if (txType === 'income') insertObj.income = amt;
            else insertObj.expense = amt;

            await supabase.from('year_history').insert([insertObj]);
            console.log("New entry")
          }
        } catch (yhErr) {
          console.error('Year history update error:', yhErr);
        }

        // MONTH HISTORY: update totals and balance
        try {
          const { data: existingMonthRow } = await supabase
            .from('month_history')
            .select('*')
            .eq('user_id', userId)
            .eq('month', txMonth)
            .eq('year', txYear)
            .limit(1)
            .single();

          if (existingMonthRow) {
            const totalIncome = (existingMonthRow.income || 0) + (txType === 'income' ? amt : 0);
            const totalExpense = (existingMonthRow.expense || 0) + (txType === 'expense' ? amt : 0);
            const balance = totalIncome - totalExpense;

            await supabase
              .from('month_history')
              .update({ income: totalIncome, expense: totalExpense })
              .eq('user_id', userId)
              .eq('day',txDay)
              .eq('month', txMonth)
              .eq('year', txYear);
          } else {
            const insertMonth: any = {
              user_id: userId,
              month: txMonth,
              year: txYear,
              day: txDay,
              income: txType === 'income' ? amt : 0,
              expense: txType === 'expense' ? amt : 0,
            };

            await supabase.from('month_history').insert([insertMonth]);
          }
        } catch (mhErr) {
          console.error('Month history update error:', mhErr);
        }
      } catch (histErr) {
        console.error('History update failed:', histErr);
      }

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data?.[0] }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
