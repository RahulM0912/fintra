# Dashboard Implementation Guide

## Updated Schema Configuration

Your `month_history` table uses the following structure:
- `id` (UUID): Primary key
- `uuid` (UUID): User identifier
- `day` (int4): Day of month
- `month` (int4): Month (1-12)
- `year` (int4): Year
- `income` (numeric): Income for that day
- `expense` (numeric): Expense for that day

## Database Setup

### Create Required Tables

Execute this SQL in your Supabase SQL Editor:

```sql
-- month_history table (already exists based on your schema)
-- This table stores daily income/expense data aggregated by month

-- year_history table for yearly aggregation
CREATE TABLE IF NOT EXISTS year_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid UUID NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL,
  income NUMERIC DEFAULT 0,
  expense NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(uuid, month, year)
);

-- transaction_categories table for category breakdown
CREATE TABLE IF NOT EXISTS transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid UUID NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(uuid, category, type, month, year)
);

-- Create indexes for performance
CREATE INDEX idx_month_history_uuid ON month_history(uuid, year, month);
CREATE INDEX idx_year_history_uuid ON year_history(uuid, year);
CREATE INDEX idx_transaction_categories_uuid ON transaction_categories(uuid);
```

## Environment Configuration

Update `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
```

## API Endpoints

### Get Monthly Stats
```
GET /api/stats?month=4&year=2024

Response:
{
  "data": {
    "overview": {
      "total_income": 2303.00,
      "total_expense": 2260.00,
      "balance": 43.00
    },
    "incomeByCategory": {
      "Salary": 1500,
      "Freelance": 803
    },
    "expenseByCategory": {
      "Housing": 930,
      "Healthcare": 502,
      "Food": 483,
      "Transportation": 345
    }
  }
}
```

### Get Monthly History
```
GET /api/history/month?month=4&year=2024

Response:
{
  "data": {
    "total_income": 2303,
    "total_expense": 2260,
    "balance": 43
  }
}
```

### Get Yearly Overview
```
GET /api/history/year?year=2024

Response:
{
  "data": [
    { "month": 1, "income": 2100, "expense": 1950, ... },
    { "month": 2, "income": 2200, "expense": 2050, ... },
    { "month": 3, "income": 2050, "expense": 2100, ... },
    { "month": 4, "income": 2303, "expense": 2260, ... }
  ]
}
```

### Get All Transactions
```
GET /api/transactions?limit=10&offset=0

Response:
{
  "data": [
    {
      "id": "uuid",
      "user_id": "clerk_id",
      "amount": 150,
      "type": "expense",
      "category": "Food",
      "description": "Grocery shopping",
      "created_at": "2024-04-15T10:30:00Z"
    }
  ]
}
```

## Dashboard Features

### Overview Section
- **Total Income**: Sum of all income for selected month
- **Total Expense**: Sum of all expenses for selected month  
- **Balance**: Income minus Expenses

### Visualizations
1. **Year Overview Chart**: Bar chart showing monthly income vs. expenses
2. **Income by Category**: Pie chart breakdown of income sources
3. **Expense by Category**: Pie chart breakdown of expenses

### Quick Stats
- Average Daily Expense
- Average Daily Income
- Save Rate (percentage of income saved)
- Expense Ratio (percentage of income spent)

### Date Navigation
Navigate between months using the date selector at the top

## Color Scheme
- **Primary Background**: Black (`#000000`)
- **Income**: Emerald Green (`#10b981`)
- **Expense**: Rose Pink (`#f43f5e`)
- **Balance**: Blue (`#3b82f6`)
- **Secondary**: Cyan, Purple, Amber for category breakdown

## Data Flow

```
User navigates dashboard
    ↓
DateSelector triggers onMonthChange
    ↓
currentMonth & currentYear state updates
    ↓
useEffect fetches data via API endpoints
    ↓
/api/stats retrieves month_history + transaction_categories
    ↓
/api/history/year retrieves yearly overview
    ↓
Data aggregated and passed to chart components
    ↓
Charts render with real-time data
```

## Testing

1. Ensure Supabase tables are created with data
2. Configure `.env.local` with Supabase credentials
3. Run `npm run dev`
4. Navigate to `/` → Sign in → Dashboard
5. Use date selector to view different months
6. Charts should populate with data

## Troubleshooting

### Empty Dashboard
- Verify `month_history` table has data
- Check user `uuid` matches Clerk user ID
- Inspect browser console for API errors

### API Errors
- Confirm Supabase credentials in `.env.local`
- Verify table names match exactly
- Check that `uuid` column matches your user identifier

### Build Errors
- Run `npm run build` to check for TypeScript issues
- All ESLint warnings should be resolved
- Check that all dependencies are installed: `npm install`

## Technologies
- **Next.js 15**: React framework
- **TypeScript**: Type safety
- **Supabase**: PostgreSQL database
- **Clerk**: Authentication
- **Recharts**: Data visualization
- **Tailwind CSS**: Styling
- **Lucide React**: Icons
