"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUp, ArrowDown, Search, X, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpenseFormModal } from '@/components/ExpenseFormModal';

interface Transaction {
  id: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  description: string;
  category: {
    id: string;
    name: string;
    icon?: string;
  } | null;
}

interface TransactionsTableProps {
  limit?: number;
}

interface Filters {
  description: string;
  category: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  amountFrom: string;
  amountTo: string;
}

export function TransactionsTable({ limit = 20 }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    description: '',
    category: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    amountFrom: '',
    amountTo: '',
  });
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; show: boolean }>({ id: '', show: false });
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/transactions?limit=${limit}&offset=0`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const { data } = await response.json();
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    // Apply filters
    if (filters.description) {
      result = result.filter(t =>
        t.description?.toLowerCase().includes(filters.description.toLowerCase())
      );
    }

    if (filters.category) {
      result = result.filter(t =>
        t.category?.name?.toLowerCase().includes(filters.category.toLowerCase())
      );
    }

    if (filters.type) {
      result = result.filter(t => t.type === filters.type);
    }

    if (filters.dateFrom) {
      result = result.filter(t => new Date(t.date) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      result = result.filter(t => new Date(t.date) <= new Date(filters.dateTo));
    }

    if (filters.amountFrom) {
      result = result.filter(t => t.amount >= parseFloat(filters.amountFrom));
    }

    if (filters.amountTo) {
      result = result.filter(t => t.amount <= parseFloat(filters.amountTo));
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any = sortBy === 'date' ? new Date(a.date) : a.amount;
      let bValue: any = sortBy === 'date' ? new Date(b.date) : b.amount;

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return result;
  }, [transactions, filters, sortBy, sortOrder]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      description: '',
      category: '',
      type: '',
      dateFrom: '',
      dateTo: '',
      amountFrom: '',
      amountTo: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const toggleSort = (column: 'date' | 'amount') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowEditModal(true);
  };

  const handleDeleteClick = (transactionId: string) => {
    setDeleteConfirm({ id: transactionId, show: true });
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`/api/transactions/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      setTransactions(prev => prev.filter(t => t.id !== deleteConfirm.id));
      setToastMessage({ text: 'Transaction deleted successfully', type: 'success' });
      
      setTimeout(() => {
        setToastMessage(null);
      }, 3500);
    } catch (err) {
      setToastMessage({
        text: err instanceof Error ? err.message : 'Failed to delete transaction',
        type: 'error',
      });
      setTimeout(() => {
        setToastMessage(null);
      }, 4500);
    } finally {
      setDeleteConfirm({ id: '', show: false });
    }
  };

  const handleUpdateTransaction = async (data: any) => {
    try {
      const response = await fetch(`/api/transactions/${editingTransaction?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }

      const { data: updatedTransaction } = await response.json();
      setTransactions(prev =>
        prev.map(t => (t.id === editingTransaction?.id ? updatedTransaction : t))
      );

      setShowEditModal(false);
      setEditingTransaction(null);
      setToastMessage({ text: 'Transaction updated successfully', type: 'success' });
      
      setTimeout(() => {
        setToastMessage(null);
      }, 3500);
    } catch (err) {
      setToastMessage({
        text: err instanceof Error ? err.message : 'Failed to update transaction',
        type: 'error',
      });
      setTimeout(() => {
        setToastMessage(null);
      }, 4500);
    }
  };

  if (loading) {
    return (
      <div className="border border-gray-800 bg-black/40 rounded-lg overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Description</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-800/50 ${
                    index % 2 === 0 ? 'bg-transparent' : 'bg-gray-900/20'
                  }`}
                >
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-24" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-32" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-20" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-24 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-rose-500/30 bg-rose-500/10 rounded-lg p-4">
        <p className="text-rose-400 text-sm">{error}</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="border border-gray-800 bg-black/40 rounded-lg p-8 text-center">
        <p className="text-gray-400">No transactions yet. Create your first transaction to get started!</p>
      </div>
    );
  }

  return (
    <>
        <div className="border border-gray-800 bg-black/40 rounded-lg overflow-hidden backdrop-blur-sm">
      {/* Filter Toggle Button */}
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition text-sm"
        >
          <Search className="w-4 h-4" />
          Filters
        </button>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition text-sm"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1 block">Description</label>
            <input
              type="text"
              placeholder="Search..."
              value={filters.description}
              onChange={(e) => handleFilterChange('description', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1 block">Category</label>
            <input
              type="text"
              placeholder="Filter..."
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1 block">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-1 block">Amount From</label>
              <input
                type="number"
                placeholder="Min"
                value={filters.amountFrom}
                onChange={(e) => handleFilterChange('amountFrom', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-1 block">Amount To</label>
              <input
                type="number"
                placeholder="Max"
                value={filters.amountTo}
                onChange={(e) => handleFilterChange('amountTo', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1 block">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1 block">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => toggleSort('date')}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-blue-400 transition"
                >
                  Date
                  {sortBy === 'date' && (
                    sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Category</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Description</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
              <th className="px-6 py-4 text-right">
                <button
                  onClick={() => toggleSort('amount')}
                  className="flex items-center gap-2 ml-auto text-sm font-semibold text-gray-300 hover:text-blue-400 transition"
                >
                  Amount
                  {sortBy === 'amount' && (
                    sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTransactions.map((transaction, index) => (
              <tr
                key={transaction.id}
                className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition ${
                  index % 2 === 0 ? 'bg-transparent' : 'bg-gray-900/20'
                }`}
              >
                <td className="px-6 py-4 text-sm text-gray-300">{formatDate(transaction.date)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{transaction.category?.icon || '💰'}</span>
                    <span className="text-sm text-gray-300">{transaction.category?.name || 'Uncategorized'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">{transaction.description || '-'}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    {transaction.type === 'income' ? (
                      <>
                        <ArrowUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-400">Income</span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="w-4 h-4 text-rose-400" />
                        <span className="text-sm font-medium text-rose-400">Expense</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span
                    className={`text-sm font-semibold ${
                      transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount, 'INR')}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEdit(transaction)}
                      className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition"
                      title="Edit transaction"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(transaction.id)}
                      className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedTransactions.length === 0 && (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-400">No transactions match your filters.</p>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg text-sm font-medium transition-opacity duration-500 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
          }`}
        >
          {toastMessage.text}
        </div>
      )}
    </div>

            {/* Edit Modal */}
      {showEditModal && editingTransaction && (
        <ExpenseFormModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingTransaction(null);
          }}
          onSubmit={handleUpdateTransaction}
          initialData={{
            type: editingTransaction.type,
            category: editingTransaction.category?.name || '',
            category_id: editingTransaction.category?.id,
            description: editingTransaction.description || '',
            amount: String(editingTransaction.amount),
            date: editingTransaction.date,
          }}
          isEditing={true}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">Delete Transaction?</h3>
            <p className="text-gray-400 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm({ id: '', show: false })}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition text-sm font-medium"
              >
                No, Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition text-sm font-medium border border-rose-500/50"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </>
    
  );
}
