import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MonthOverviewProps {
  data: Array<{
    day: number;
    income: number;
    expense: number;
  }>;
  loading?: boolean;
}

export function MonthOverview({ data, loading = false }: MonthOverviewProps) {
  if (loading) {
    return (
      <div className="border border-gray-800 bg-black/40 rounded-lg p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-white mb-4">Month Overview</h2>
        <div className="h-72 rounded-md bg-gray-800/30 animate-pulse" />
      </div>
    );
  }

  const chartData = data.map((item) => ({
    day: `Day ${item.day}`,
    income: item.income,
    expense: item.expense,
  }));

  return (
    <div className="border border-gray-800 bg-black/40 rounded-lg p-6 backdrop-blur-sm">
      <h2 className="text-xl font-bold text-white mb-4">Month Overview</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="day"
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
            }}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar dataKey="income" fill="#10b981" radius={[8, 8, 0, 0]} />
          <Bar dataKey="expense" fill="#f43f5e" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
