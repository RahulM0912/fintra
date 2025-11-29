import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, Plus } from 'lucide-react';
import { StatCard } from './StatCard';
import { CategoryChart } from './CategoryChart';
import { DateSelector } from './DateSelector';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthOverview } from './MonthOverview';
import { YearOverview } from './YearOverview';
import { ExpenseFormModal } from '@/components/ExpenseFormModal';
import { TransactionsTable } from '@/components/TransactionsTable';

interface DashboardData {
  overview: {
    total_income: number;
    total_expense: number;
    balance: number;
  };
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  currency: string;
}

interface MonthHistoryData {
  day: number;
  month: number;
  year: number;
  income: number;
  expense: number;
}

interface YearHistoryData {
  month: number;
  year: number;
  income: number;
  expense: number;
}

export function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [monthOverviewData, setMonthOverviewData] = useState<MonthHistoryData[]>([]);
  const [yearOverviewData, setYearOverviewData] = useState<YearHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(false);
  const [yearLoading, setYearLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchStats = async (month: number, year: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/stats?month=${month}&year=${year}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const { data } = await response.json();
      setStats(data);
      console.log(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchYearOverviewData = async (year: number) => {
    try {
      setYearLoading(true);
      const response = await fetch(`/api/history/year-details?year=${year}`);
      if (!response.ok) {
        throw new Error('Failed to fetch year overview');
      }
      const { data } = await response.json();
      setYearOverviewData(data || []);
      console.log('Year overview data:', data);
    } catch (err) {
      console.error('Error fetching year overview:', err);
    } finally {
      setYearLoading(false);
    }
  };

  const fetchMonthOverviewData = async (month: number, year: number) => {
    try {
      setMonthLoading(true);
      const response = await fetch(`/api/history/month-details?month=${month}&year=${year}`);
      if (!response.ok) {
        throw new Error('Failed to fetch month overview');
      }
      const { data } = await response.json();
      setMonthOverviewData(data || []);
      console.log('Month overview data:', data);
    } catch (err) {
      console.error('Error fetching month overview:', err);
    } finally {
      setMonthLoading(false);
    }
  };

  // Fetch stats for the currently selected month/year
  useEffect(() => {
    fetchStats(currentMonth, currentYear);
  }, [currentMonth, currentYear]);

  // Fetch month overview data when the selected month or year changes
  useEffect(() => {
    fetchMonthOverviewData(currentMonth, currentYear);
  }, [currentMonth, currentYear]);

  // Fetch year overview data only once on component mount (empty dependency array)
  useEffect(() => {
    fetchYearOverviewData(currentYear);
  }, [currentYear]);

  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const handleExpenseSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(data.amount),
          date: data.date,
          description: data.description,
          category: data.category,
          category_id: data.category_id,
          type: data.type,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create transaction');
      }

      // show success toast
      setToast({ message: 'Transaction added successfully', type: 'success' });
      // auto-dismiss toast
      setTimeout(() => setToast(null), 3500);

      // Refresh stats to show new transaction
      fetchStats(currentMonth, currentYear);
      fetchMonthOverviewData(currentMonth, currentYear);
      fetchYearOverviewData(currentYear);
      setIsExpenseModalOpen(false);
    } catch (err) {
      // show error toast
      const msg = err instanceof Error ? err.message : 'Failed to create transaction';
      setToast({ message: msg, type: 'error' });
      setTimeout(() => setToast(null), 4500);
      throw err;
    }
  };

  // Removed global loader render: placeholders used inline instead

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="border border-rose-500/30 bg-rose-500/10 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-rose-400 mb-1">Error loading data</h3>
              <p className="text-gray-400">{error}</p>
              <p className="text-sm text-gray-500 mt-2">
                Make sure Supabase is configured correctly in your .env.local file
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const defaultStats = stats || {
    overview: { total_income: 0, total_expense: 0, balance: 0 },
    incomeByCategory: {},
    expenseByCategory: {},
    currency: 'INR'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-white">
              Hello 👋
            </h1>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              Add Transaction
            </button>
          </div>
          <p className="text-gray-400">
            Track your income and expenses at a glance
          </p>
        </div>

        {/* Expense Modal */}
        <ExpenseFormModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSubmit={handleExpenseSubmit}
        />

        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-50">
            <div
              className={`max-w-sm w-full px-4 py-3 rounded-lg shadow-lg text-white ${
                toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {toast.message}
            </div>
          </div>
        )}

        {/* Date Selector */}
        <div className="mb-8">
          <DateSelector onMonthChange={handleMonthChange} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <>
              <Skeleton className="p-6 h-28" rounded="lg" />
              <Skeleton className="p-6 h-28" rounded="lg" />
              <Skeleton className="p-6 h-28" rounded="lg" />
            </>
          ) : (
            <>
              <StatCard
                title="Total Income"
                amount={defaultStats.overview.total_income}
                icon={<TrendingUp className="w-8 h-8" />}
                color="income"
                currency={defaultStats.currency}
              />
              <StatCard
                title="Total Expense"
                amount={defaultStats.overview.total_expense}
                icon={<TrendingDown className="w-8 h-8" />}
                color="expense"
                currency={defaultStats.currency}
              />
              <StatCard
                title="Balance"
                amount={defaultStats.overview.balance}
                icon={<Wallet className="w-8 h-8" />}
                color="balance"
                currency={defaultStats.currency}
              />
            </>
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Month Overview Chart */}
          <MonthOverview
            data={monthOverviewData.map((item) => ({
              day: item.day,
              income: item.income,
              expense: item.expense,
            }))}
            loading={monthLoading}
          />

          {/* Year Overview Chart */}
          <YearOverview
            data={yearOverviewData.map((item) => ({
              month: item.month,
              income: item.income,
              expense: item.expense,
            }))}
            loading={yearLoading}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Income by Category */}
          {loading ? (
            <Skeleton className="p-6 h-64" rounded="lg" />
          ) : (
            <CategoryChart
              data={defaultStats.incomeByCategory}
              title="Income by Category"
              type="income"
              currency={defaultStats.currency}
            />
          )}

          {/* Expense by Category */}
          {loading ? (
            <Skeleton className="p-6 h-64" rounded="lg" />
          ) : (
            <CategoryChart
              data={defaultStats.expenseByCategory}
              title="Expense by Category"
              type="expense"
              currency={defaultStats.currency}
            />
          )}
        </div>

        {/* Quick Stats */}
        <div className="border border-gray-800 bg-black/40 rounded-lg p-6 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white mb-6">Quick Stats</h2>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                <span className="text-gray-400">Average Daily Expense</span>
                <span className="text-lg font-semibold text-rose-400">
                  {formatCurrency(defaultStats.overview.total_expense / 30, defaultStats.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                <span className="text-gray-400">Average Daily Income</span>
                <span className="text-lg font-semibold text-emerald-400">
                  {formatCurrency(defaultStats.overview.total_income / 30, defaultStats.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                <span className="text-gray-400">Save Rate</span>
                <span className="text-lg font-semibold text-blue-400">
                  {defaultStats.overview.total_income > 0
                    ? (
                        ((defaultStats.overview.total_income - defaultStats.overview.total_expense) /
                          defaultStats.overview.total_income) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                <span className="text-gray-400">Expense Ratio</span>
                <span className="text-lg font-semibold text-rose-400">
                  {defaultStats.overview.total_income > 0
                    ? (
                        (defaultStats.overview.total_expense /
                          defaultStats.overview.total_income) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          )}
        </div>

        
      </div>
    </div>
  );
}
