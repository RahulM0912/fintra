import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface CategoryChartProps {
  data: Record<string, number>;
  title: string;
  type: 'income' | 'expense';
}

const COLORS = {
  income: ['#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#6366f1'],
  expense: ['#f43f5e', '#fb923c', '#eab308', '#ef4444', '#d946ef', '#fa8072'],
};

export function CategoryChart({ data, title, type }: CategoryChartProps) {
  const chartData = Object.entries(data).map(([category, amount]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    value: Math.round(amount * 100) / 100,
  }));

  if (chartData.length === 0) {
    return (
      <div className="border border-gray-800 bg-black/40 rounded-lg p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <div className="h-64 flex items-center justify-center text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-800 bg-black/40 rounded-lg p-6 backdrop-blur-sm">
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[type][index % COLORS[type].length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {chartData.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: COLORS[type][index % COLORS[type].length],
              }}
            />
            <span className="text-gray-300">{item.name}</span>
            <span className="text-gray-500 ml-auto">€{item.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
