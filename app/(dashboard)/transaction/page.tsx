"use client"
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { TransactionsTable } from '@/components/TransactionsTable';
import { ExpenseFormModal } from '@/components/ExpenseFormModal';

export default function TransactionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (data: any) => {
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

      setToast({ message: 'Transaction added successfully', type: 'success' });
      setTimeout(() => setToast(null), 3500);
      
      // Close modal and refresh table
      setIsModalOpen(false);
      // Trigger a refresh by reloading the page
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create transaction';
      setToast({ message: msg, type: 'error' });
      setTimeout(() => setToast(null), 4500);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-white">
              Transactions
            </h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              Add Transaction
            </button>
          </div>
          <p className="text-gray-400">
            View and manage all your income and expense transactions
          </p>
        </div>

        {/* Modal */}
        <ExpenseFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
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

        {/* Transactions Table */}
        <TransactionsTable limit={50} />
      </div>
    </div>
  );
}
