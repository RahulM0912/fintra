"use client"
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { ExpenseFormModal } from './ExpenseFormModal';

interface ExpenseFormData {
  amount: string;
  date: string;
  description: string;
  category: string;
}

export function FloatingActionButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (data: ExpenseFormData) => {
    try {
      setIsCreating(true);
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
          type: 'expense',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create expense');
      }

      // Success - modal will close automatically
      window.location.reload(); // Refresh to show new expense
    } catch (err) {
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition hover:shadow-xl z-40"
        title="Add new expense"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal */}
      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
