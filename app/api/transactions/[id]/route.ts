import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    // Get existing transaction to compare
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Update transaction
    const { data, error } = await supabase
      .from('transactions')
      .update({
        amount: parseFloat(amount),
        date: date,
        type: type.toLowerCase(),
        category_id: category_id,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update history tables if amount or type changed
    const oldDate = new Date(existingTransaction.date);
    const newDate = new Date(date);
    const oldMonth = oldDate.getMonth() + 1;
    const oldYear = oldDate.getFullYear();
    const oldDay = oldDate.getDate();
    const newMonth = newDate.getMonth() + 1;
    const newYear = newDate.getFullYear();
    const newDay = newDate.getDate();

    const oldType = existingTransaction.type;
    const newType = type.toLowerCase();
    const oldAmount = existingTransaction.amount;
    const newAmount = parseFloat(amount);

    // If date or type/amount changed, update history
    if (oldMonth !== newMonth || oldYear !== newYear || oldType !== newType || oldAmount !== newAmount) {
      // Remove from old year_history
      try {
        const { data: oldYearRow } = await supabase
          .from('year_history')
          .select('*')
          .eq('user_id', userId)
          .eq('month', oldMonth)
          .eq('year', oldYear)
          .single();

        if (oldYearRow) {
          const field = oldType === 'income' ? 'income' : 'expense';
          const newValue = Math.max(0, (oldYearRow[field] || 0) - oldAmount);
          await supabase
            .from('year_history')
            .update({ [field]: newValue })
            .eq('user_id', userId)
            .eq('month', oldMonth)
            .eq('year', oldYear);
        }
      } catch (err) {
        console.error('Old year history update error:', err);
      }

      // Add to new year_history
      try {
        const { data: newYearRow } = await supabase
          .from('year_history')
          .select('*')
          .eq('user_id', userId)
          .eq('month', newMonth)
          .eq('year', newYear)
          .single();

        if (newYearRow) {
          const field = newType === 'income' ? 'income' : 'expense';
          const newValue = (newYearRow[field] || 0) + newAmount;
          await supabase
            .from('year_history')
            .update({ [field]: newValue })
            .eq('user_id', userId)
            .eq('month', newMonth)
            .eq('year', newYear);
        } else {
          const insertObj: any = {
            user_id: userId,
            month: newMonth,
            year: newYear,
            income: 0,
            expense: 0,
          };
          if (newType === 'income') insertObj.income = newAmount;
          else insertObj.expense = newAmount;
          await supabase.from('year_history').insert([insertObj]);
        }
      } catch (err) {
        console.error('New year history update error:', err);
      }

      // Remove from old month_history
      if (oldMonth !== newMonth || oldYear !== newYear) {
        try {
          const { data: oldMonthRow } = await supabase
            .from('month_history')
            .select('*')
            .eq('user_id', userId)
            .eq('day', oldDay)
            .eq('month', oldMonth)
            .eq('year', oldYear)
            .single();

          if (oldMonthRow) {
            const totalIncome = Math.max(0, (oldMonthRow.income || 0) - (oldType === 'income' ? oldAmount : 0));
            const totalExpense = Math.max(0, (oldMonthRow.expense || 0) - (oldType === 'expense' ? oldAmount : 0));

            await supabase
              .from('month_history')
              .update({ income: totalIncome, expense: totalExpense })
              .eq('user_id', userId)
              .eq('day', oldDay)
              .eq('month', oldMonth)
              .eq('year', oldYear);
          }
        } catch (err) {
          console.error('Old month history update error:', err);
        }
      }

      // Add to new month_history
      try {
        const { data: newMonthRow } = await supabase
          .from('month_history')
          .select('*')
          .eq('user_id', userId)
          .eq('day', newDay)
          .eq('month', newMonth)
          .eq('year', newYear)
          .single();

        if (newMonthRow) {
          const totalIncome = (newMonthRow.income || 0) + (newType === 'income' ? newAmount : 0);
          const totalExpense = (newMonthRow.expense || 0) + (newType === 'expense' ? newAmount : 0);

          await supabase
            .from('month_history')
            .update({ income: totalIncome, expense: totalExpense })
            .eq('user_id', userId)
            .eq('day', newDay)
            .eq('month', newMonth)
            .eq('year', newYear);
        } else {
          const insertMonth: any = {
            user_id: userId,
            month: newMonth,
            year: newYear,
            day: newDay,
            income: newType === 'income' ? newAmount : 0,
            expense: newType === 'expense' ? newAmount : 0,
          };
          await supabase.from('month_history').insert([insertMonth]);
        }
      } catch (err) {
        console.error('New month history update error:', err);
      }
    }

    // Fetch updated transaction with category
    const { data: updatedTransaction } = await supabase
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
      .eq('id', id)
      .single();

    const transformedData = {
      ...updatedTransaction,
      category: updatedTransaction?.categories || null,
    };

    return NextResponse.json({ data: transformedData });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get transaction to delete
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Delete transaction
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update history tables
    const txDate = new Date(transaction.date);
    const txMonth = txDate.getMonth() + 1;
    const txYear = txDate.getFullYear();
    const txDay = txDate.getDate();
    const txType = transaction.type;
    const txAmount = transaction.amount;

    // Update year_history
    try {
      const { data: yearRow } = await supabase
        .from('year_history')
        .select('*')
        .eq('user_id', userId)
        .eq('month', txMonth)
        .eq('year', txYear)
        .single();

      if (yearRow) {
        const field = txType === 'income' ? 'income' : 'expense';
        const newValue = Math.max(0, (yearRow[field] || 0) - txAmount);
        await supabase
          .from('year_history')
          .update({ [field]: newValue })
          .eq('user_id', userId)
          .eq('month', txMonth)
          .eq('year', txYear);
      }
    } catch (err) {
      console.error('Year history update error:', err);
    }

    // Update month_history
    try {
      const { data: monthRow } = await supabase
        .from('month_history')
        .select('*')
        .eq('user_id', userId)
        .eq('day', txDay)
        .eq('month', txMonth)
        .eq('year', txYear)
        .single();

      if (monthRow) {
        const totalIncome = Math.max(0, (monthRow.income || 0) - (txType === 'income' ? txAmount : 0));
        const totalExpense = Math.max(0, (monthRow.expense || 0) - (txType === 'expense' ? txAmount : 0));

        await supabase
          .from('month_history')
          .update({ income: totalIncome, expense: totalExpense })
          .eq('user_id', userId)
          .eq('day', txDay)
          .eq('month', txMonth)
          .eq('year', txYear);
      }
    } catch (err) {
      console.error('Month history update error:', err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
