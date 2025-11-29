"use client"
import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ExpenseFormData {
  amount: string;
  date: string;
  description: string;
  category: string;
  category_id?: string;
  type: 'expense' | 'income';
}

interface Category {
  id: string;
  name: string;
  type?: 'expense' | 'income';
}

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  initialData?: ExpenseFormData;
  isEditing?: boolean;
}

export function ExpenseFormModal({ isOpen, onClose, onSubmit, initialData, isEditing = false }: ExpenseFormModalProps) {
  const [formData, setFormData] = useState<ExpenseFormData>(
    initialData || {
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      category: '',
      category_id: undefined,
      type: 'expense',
    }
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Update form when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (initialData.category) {
        setCategoryInput(initialData.category);
      }
    }
  }, [initialData, isOpen]);

  // Reset category when type changes and update filtered categories
  useEffect(() => {
    setFormData(prev => ({ ...prev, category: '' }));
    setCategoryInput('');
    // show categories for the newly selected type if available
    setFilteredCategories(categories.filter((cat) => cat.type === formData.type));
  }, [formData.type]);

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const { data } = await response.json();
      setCategories(data || []);
      console.log(data)
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleCategoryInputChange = (value: string) => {
    setCategoryInput(value);
    // typing clears any previously selected category_id
    setFormData({ ...formData, category: value, category_id: undefined });

    // Filter categories based on input and transaction type
    if (value.trim() === '') {
      // show all categories for the current type when input is empty
      setFilteredCategories(categories.filter((cat) => cat.type === formData.type));
    } else {
      const filtered = categories.filter((cat) =>
        cat.name.toLowerCase().includes(value.toLowerCase()) &&
        cat.type === formData.type
      );
      setFilteredCategories(filtered);
    }
  };

  const selectCategory = (cat: Category) => {
    setFormData({ ...formData, category: cat.name, category_id: cat.id });
    setCategoryInput(cat.name);
    setShowCategoryDropdown(false);
    setFilteredCategories([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.amount || !formData.date || !formData.category) {
      setError('Please fill in all required fields');
      return;
    }

    // Ensure a category_id is selected and it matches the selected type
    if (!formData.category_id) {
      setError('Please select a category from the dropdown (cannot create new categories)');
      return;
    }
    const matched = categories.some(
      (c) => c.id === formData.category_id && c.type === formData.type
    );
    if (!matched) {
      setError('Selected category is invalid for the chosen type');
      return;
    }

    if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      // Reset form only if not editing
      if (!isEditing) {
        setFormData({
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
          category: '',
          category_id: undefined,
          type: 'expense',
        });
        setCategoryInput('');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {isEditing ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition flex-shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Type *
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="expense"
                checked={formData.type === 'expense'}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'expense' | 'income' })
                }
                className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 focus:ring-blue-500"
              />
              <span className="text-gray-300">Expense</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="income"
                checked={formData.type === 'income'}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'expense' | 'income' })
                }
                className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 focus:ring-blue-500"
              />
              <span className="text-gray-300">Income</span>
            </label>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Category with Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category *
            </label>
            <div className="relative z-10">
              <input
                type="text"
                placeholder="Select or type a new category"
                value={categoryInput}
                onChange={(e) => {
                  handleCategoryInputChange(e.target.value);
                  setShowCategoryDropdown(true);
                }}
                onFocus={() => {
                  setShowCategoryDropdown(true);
                  // when focusing with empty input, show categories for current type
                  if (!categoryInput.trim()) {
                    setFilteredCategories(categories.filter((cat) => cat.type === formData.type));
                  }
                }}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
              />
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                  {isLoadingCategories ? (
                    <div className="p-3">
                      <Skeleton className="h-8" />
                    </div>
                  ) : filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => selectCategory(cat)}
                        className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 transition"
                      >
                        {cat.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-400 text-sm">
                      No categories found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              placeholder="Add a note (optional)"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {isEditing ? 'Update Transaction' : 'Add Expense'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
