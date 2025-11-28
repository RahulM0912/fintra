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

interface HistoryChartProps {
  data: Array<{
    month: string | number;
    income: number;
    expense: number;
  }>;
  title: string;
  isMonthly?: boolean;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function HistoryChart({ data, title, isMonthly = true }: HistoryChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    month: isMonthly ? MONTH_NAMES[Number(item.month) - 1] : item.month,
  }));

  return (
    <div className="border border-gray-800 bg-black/40 rounded-lg p-6 backdrop-blur-sm">
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="month"
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
