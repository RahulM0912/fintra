import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from 'lucide-react';
import { StatCard } from './StatCard';
import { HistoryChart } from './HistoryChart';
import { CategoryChart } from './CategoryChart';
import { DateSelector } from './DateSelector';

interface DashboardData {
  overview: {
    total_income: number;
    total_expense: number;
    balance: number;
  };
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
}

interface HistoryData {
  income: number;
  expense: number;
  month: number;
}

export function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [yearHistory, setYearHistory] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchYearHistory = async (year: number) => {
    try {
      const response = await fetch(`/api/history/year?year=${year}`);
      if (!response.ok) {
        throw new Error('Failed to fetch year history');
      }
      const { data } = await response.json();
      setYearHistory(data || []);
    } catch (err) {
      console.error('Error fetching year history:', err);
    }
  };

  useEffect(() => {
    fetchStats(currentMonth, currentYear);
    fetchYearHistory(currentYear);
  }, [currentMonth, currentYear]);

  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Hello, Dashboard 👋
          </h1>
          <p className="text-gray-400">
            Track your income and expenses at a glance
          </p>
        </div>

        {/* Date Selector */}
        <div className="mb-8">
          <DateSelector onMonthChange={handleMonthChange} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Income"
            amount={defaultStats.overview.total_income}
            icon={<TrendingUp className="w-8 h-8" />}
            color="income"
          />
          <StatCard
            title="Total Expense"
            amount={defaultStats.overview.total_expense}
            icon={<TrendingDown className="w-8 h-8" />}
            color="expense"
          />
          <StatCard
            title="Balance"
            amount={defaultStats.overview.balance}
            icon={<Wallet className="w-8 h-8" />}
            color="balance"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Year History Chart */}
          <HistoryChart
            data={yearHistory.map((item) => ({
              month: item.month,
              income: item.income,
              expense: item.expense,
            }))}
            title="Year Overview"
            isMonthly={true}
          />

          {/* Income by Category */}
          <CategoryChart
            data={defaultStats.incomeByCategory}
            title="Income by Category"
            type="income"
          />
        </div>

        {/* Expense by Category */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryChart
            data={defaultStats.expenseByCategory}
            title="Expense by Category"
            type="expense"
          />

          {/* Quick Stats */}
          <div className="border border-gray-800 bg-black/40 rounded-lg p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-6">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                <span className="text-gray-400">Average Daily Expense</span>
                <span className="text-lg font-semibold text-rose-400">
                  €{(defaultStats.overview.total_expense / 30).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                <span className="text-gray-400">Average Daily Income</span>
                <span className="text-lg font-semibold text-emerald-400">
                  €{(defaultStats.overview.total_income / 30).toFixed(2)}
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
          </div>
        </div>
      </div>
    </div>
  );
}
