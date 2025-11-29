// components/VisualizationCard.tsx
'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { VisualItem, GraphType } from '@/types/visualization';
import { parseGraphConfig } from '@/utils/visualization';

interface VisualizationCardProps {
  item: VisualItem;
}

const graphTypeLabel: Record<GraphType, string> = {
  bar: 'Bar',
  line: 'Line',
  pie: 'Pie',
  scatter: 'Scatter',
  table: 'Table',
  'grouped-bar': 'Grouped Bar',
  'stacked-bar': 'Stacked Bar',
};

export function VisualizationCard({ item }: VisualizationCardProps) {
  const [currentType, setCurrentType] = useState<GraphType>(item.defaultType);
  const { title, data } = parseGraphConfig(item.graphs);

  const renderChart = () => {
    switch (currentType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={100}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      case 'table':
        return (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Label</th>
                  <th className="px-4 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="px-4 py-2">{row.label}</td>
                    <td className="px-4 py-2 text-right">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      // basic fallbacks – you can specialize these later
      case 'scatter':
      case 'grouped-bar':
      case 'stacked-bar':
      default:
        return (
          <div className="text-sm text-muted-foreground">
            {currentType} visualization not implemented yet.
          </div>
        );
    }
  };

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>

        <div className="flex flex-wrap gap-1">
          {item.graphTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setCurrentType(type)}
              className={`rounded-full border px-3 py-1 text-xs ${
                currentType === type
                  ? 'bg-foreground text-background'
                  : 'bg-background'
              }`}
            >
              {graphTypeLabel[type]}
            </button>
          ))}
        </div>
      </div>

      {renderChart()}

      {/* Optional table view from tableData if you want separate from "table" type */}
      {item.tableData?.length > 0 && currentType !== 'table' && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer select-none text-muted-foreground">
            Show raw table data
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-[11px]">
            {JSON.stringify(item.tableData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
