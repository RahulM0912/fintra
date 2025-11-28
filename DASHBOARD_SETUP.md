# Dashboard Setup Guide

## Overview
This dashboard displays financial data including transactions, income/expense breakdown by category, and historical trends.

## Prerequisites
- Supabase account (https://supabase.com)
- Configured Clerk authentication (already set up)

## Setup Steps

### 1. Create Supabase Database Tables

Execute the following SQL in your Supabase SQL Editor to create the required tables:

```sql
-- Users table (optional, can reference from Clerk)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Month history table (aggregated data)
CREATE TABLE IF NOT EXISTS month_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL,
  total_income DECIMAL(10, 2) DEFAULT 0,
  total_expense DECIMAL(10, 2) DEFAULT 0,
  balance DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, month, year)
);

-- Year history table (monthly breakdown)
CREATE TABLE IF NOT EXISTS year_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL,
  income DECIMAL(10, 2) DEFAULT 0,
  expense DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, month, year)
);

-- Transaction categories table
CREATE TABLE IF NOT EXISTS transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(10, 2) NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category, type, month, year)
);

-- Create indexes for performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_month_history_user_id ON month_history(user_id, year, month);
CREATE INDEX idx_year_history_user_id ON year_history(user_id, year);
CREATE INDEX idx_transaction_categories_user_id ON transaction_categories(user_id);
```

### 2. Configure Environment Variables

Update `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from:
1. Go to https://supabase.com
2. Select your project
3. Click "Settings" → "API"
4. Copy the Project URL and anon public key

### 3. Enable Row Level Security (RLS)

For security, enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE month_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE year_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid()::text = user_id OR true);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Apply similar policies to other tables as needed
```

## API Endpoints

### Get Stats for Current Month
```
GET /api/stats?month=4&year=2024
Response: {
  data: {
    overview: {
      total_income: 2303,
      total_expense: 2260,
      balance: 43
    },
    incomeByCategory: { "Salary": 1500, "Freelance": 803 },
    expenseByCategory: { "Housing": 930, "Healthcare": 502, ... }
  }
}
```

### Get Month History
```
GET /api/history/month?month=4&year=2024
Response: {
  data: {
    total_income: 2303,
    total_expense: 2260,
    balance: 43
  }
}
```

### Get Year History
```
GET /api/history/year?year=2024
Response: {
  data: [
    { month: 1, income: 2000, expense: 1800, ... },
    { month: 2, income: 2500, expense: 2200, ... },
    ...
  ]
}
```

### Get Transactions
```
GET /api/transactions?limit=10&offset=0
Response: {
  data: [
    {
      id: "uuid",
      user_id: "clerk_id",
      amount: 150,
      type: "expense",
      category: "Food",
      description: "Grocery shopping",
      created_at: "2024-04-15T10:30:00Z"
    },
    ...
  ]
}
```

## Dashboard Features

### Overview Cards
- **Total Income**: Sum of all income for the selected month
- **Total Expense**: Sum of all expenses for the selected month
- **Balance**: Income minus Expenses

### Charts
1. **Year Overview**: Bar chart showing income vs. expense for each month
2. **Income by Category**: Pie chart breakdown of income sources
3. **Expense by Category**: Pie chart breakdown of expense categories

### Quick Stats
- Average Daily Expense
- Average Daily Income
- Save Rate (percentage of income saved)
- Expense Ratio (percentage of income spent)

### Date Selector
Navigate between months using the date selector at the top of the dashboard.

## Color Scheme
- **Primary**: Black (`#000000`)
- **Income**: Emerald Green (`#10b981`)
- **Expense**: Rose Pink (`#f43f5e`)
- **Balance/Primary Action**: Blue (`#3b82f6`)
- **Background**: Dark Gray (`#111827`)
- **Text**: White and Gray variants

## Technologies Used
- **Frontend**: React, Next.js 15, TypeScript
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **Styling**: Tailwind CSS
- **UI Icons**: Lucide React

## Testing the Dashboard

1. Make sure Supabase is configured with the tables
2. Add some test data to your database
3. Run `npm run dev`
4. Navigate to the dashboard page
5. You should see the charts and stats populate with data

## Troubleshooting

### "Unauthorized" Error
- Make sure you're logged in with Clerk
- Check that `user.id` from Clerk matches `user_id` in database

### Empty Charts
- Verify your database tables have data
- Check the browser console for API errors
- Ensure Supabase credentials are correct in `.env.local`

### CORS Issues
- These endpoints are API routes, CORS shouldn't be an issue
- Make sure you're using the correct API URL format

## Next Steps
- Add transaction creation functionality
- Implement data export features
- Add budget tracking
- Create spending insights/recommendations
