import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface StatCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  trend?: number;
  color: 'income' | 'expense' | 'balance';
  currency: string;
}

export function StatCard({ title, amount, icon, trend, color,currency }: StatCardProps) {
  const colorClasses = {
    income: 'border-emerald-500/30 bg-emerald-500/10',
    expense: 'border-rose-500/30 bg-rose-500/10',
    balance: 'border-blue-500/30 bg-blue-500/10',
  };

  const textColors = {
    income: 'text-emerald-400',
    expense: 'text-rose-400',
    balance: 'text-blue-400',
  };

  return (
    <div className={`border rounded-lg p-6 ${colorClasses[color]} backdrop-blur-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className={`text-3xl font-bold ${textColors[color]}`}>
              {formatCurrency(amount, currency)}
            </h3>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownLeft className="w-4 h-4" />
                )}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
        </div>
        <div className={`${textColors[color]} opacity-80`}>{icon}</div>
      </div>
    </div>
  );
}
