'use client'

import { useMemo, useState, useEffect } from 'react'
import { Transaction, TransactionType, ExpenseCategory } from '@jarvis/shared'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ComposedChart,
  Line,
} from 'recharts'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const currencyFormatterDetailed = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

interface FinancialProjectionProps {
  transactions: Transaction[]
  currentNetWorth: number
  currentSavings: number
  currentInvestments: number
  currentRetirement: number
}

interface ProjectedTransaction {
  id: string
  type: 'income' | 'expense'
  description: string
  amount: number
  category?: ExpenseCategory
  month: number // 0-11
  year: number
  recurring: boolean // If true, applies to all months
  isFixed?: boolean // For fixed vs variable expenses
}

interface MonthlyProjection {
  month: string
  monthIndex: number
  year: number
  projectedIncome: number
  projectedExpenses: number
  projectedSavings: number
  cumulativeSavings: number
  cumulativeNetWorth: number
  transactions: ProjectedTransaction[]
}

const PROJECTED_TRANSACTIONS_KEY = 'jarvis_projected_transactions'

export default function FinancialProjection({
  transactions,
  currentNetWorth,
  currentSavings,
  currentInvestments,
  currentRetirement,
}: FinancialProjectionProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [projectedTransactions, setProjectedTransactions] = useState<ProjectedTransaction[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary')
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    description: '',
    amount: '',
    category: 'other' as ExpenseCategory,
    month: new Date().getMonth(),
    recurring: false,
    isFixed: true,
  })

  // Load projected transactions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(PROJECTED_TRANSACTIONS_KEY)
    if (stored) {
      try {
        setProjectedTransactions(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to load projected transactions:', e)
      }
    }
  }, [])

  // Save projected transactions to localStorage
  const saveProjectedTransactions = (newTransactions: ProjectedTransaction[]) => {
    setProjectedTransactions(newTransactions)
    localStorage.setItem(PROJECTED_TRANSACTIONS_KEY, JSON.stringify(newTransactions))
  }

  // Auto-populate from historical data if no projections exist
  useEffect(() => {
    if (projectedTransactions.length === 0 && transactions.length > 0) {
      const now = new Date()
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      
      const recentTransactions = transactions.filter((t) => {
        const date = new Date(t.date)
        return date >= sixMonthsAgo
      })

      const incomePatterns: Record<string, { amount: number; count: number }> = {}
      const expensePatterns: Record<string, { amount: number; count: number }> = {}

      recentTransactions.forEach((t) => {
        const key = `${t.description.toLowerCase().trim()}`
        if (t.type === 'income') {
          if (!incomePatterns[key]) {
            incomePatterns[key] = { amount: 0, count: 0 }
          }
          incomePatterns[key].amount += t.amount
          incomePatterns[key].count += 1
        } else if (t.type === 'expense') {
          if (!expensePatterns[key]) {
            expensePatterns[key] = { amount: 0, count: 0 }
          }
          expensePatterns[key].amount += t.amount
          expensePatterns[key].count += 1
        }
      })

      const autoProjections: ProjectedTransaction[] = []

      Object.entries(incomePatterns).forEach(([desc, data]) => {
        if (data.count >= 3) {
          const avgAmount = data.amount / data.count
          autoProjections.push({
            id: `auto-income-${desc}`,
            type: 'income',
            description: desc,
            amount: Math.round(avgAmount * 100) / 100,
            month: 0,
            year: selectedYear,
            recurring: true,
          })
        }
      })

      Object.entries(expensePatterns).forEach(([desc, data]) => {
        if (data.count >= 3) {
          const avgAmount = data.amount / data.count
          autoProjections.push({
            id: `auto-expense-${desc}`,
            type: 'expense',
            description: desc,
            amount: Math.round(avgAmount * 100) / 100,
            category: recentTransactions.find(t => t.description.toLowerCase().trim() === desc)?.category || 'other',
            month: 0,
            year: selectedYear,
            recurring: true,
            isFixed: true,
          })
        }
      })

      if (autoProjections.length > 0) {
        saveProjectedTransactions(autoProjections)
      }
    }
  }, [transactions, selectedYear])

  // Get transactions for a specific month
  const getMonthTransactions = (monthIndex: number, year: number): ProjectedTransaction[] => {
    return projectedTransactions.filter((t) => {
      if (t.recurring) {
        return t.year === year
      }
      return t.month === monthIndex && t.year === year
    })
  }

  // Get actual transactions for a month
  const getActualTransactionsForMonth = (monthIndex: number): Transaction[] => {
    const currentDate = new Date()
    if (selectedYear === currentDate.getFullYear() && monthIndex <= currentDate.getMonth()) {
      return transactions.filter((t) => {
        const date = new Date(t.date)
        return date.getFullYear() === selectedYear && date.getMonth() === monthIndex
      })
    }
    return []
  }

  // Generate monthly projections
  const monthlyProjections = useMemo(() => {
    const projections: MonthlyProjection[] = []
    const currentDate = new Date()
    const isCurrentYear = selectedYear === currentDate.getFullYear()
    const currentMonthIndex = currentDate.getMonth()

    let cumulativeSavings = isCurrentYear ? currentSavings : currentSavings * 1.1
    let cumulativeNetWorth = isCurrentYear ? currentNetWorth : currentNetWorth * 1.1

    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(selectedYear, month, 1)
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' })

      const monthTransactions = getMonthTransactions(month, selectedYear)
      
      let actualTransactions: Transaction[] = []
      if (isCurrentYear && month <= currentMonthIndex) {
        actualTransactions = getActualTransactionsForMonth(month)
      }

      const projectedIncome = monthTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0) +
        (isCurrentYear && month <= currentMonthIndex
          ? actualTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
          : 0)

      const projectedExpenses = monthTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0) +
        (isCurrentYear && month <= currentMonthIndex
          ? actualTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
          : 0)

      const projectedSavings = projectedIncome - projectedExpenses
      cumulativeSavings += projectedSavings
      const investmentGrowth = cumulativeSavings * 0.01
      cumulativeNetWorth += projectedSavings + investmentGrowth

      projections.push({
        month: monthName,
        monthIndex: month,
        year: selectedYear,
        projectedIncome,
        projectedExpenses,
        projectedSavings,
        cumulativeSavings,
        cumulativeNetWorth,
        transactions: monthTransactions,
      })
    }

    return projections
  }, [selectedYear, projectedTransactions, transactions, currentSavings, currentNetWorth])

  // Calculate yearly totals
  const yearlyTotals = useMemo(() => {
    return monthlyProjections.reduce(
      (acc, month) => ({
        totalIncome: acc.totalIncome + month.projectedIncome,
        totalExpenses: acc.totalExpenses + month.projectedExpenses,
        totalSavings: acc.totalSavings + month.projectedSavings,
      }),
      { totalIncome: 0, totalExpenses: 0, totalSavings: 0 }
    )
  }, [monthlyProjections])

  // Prepare chart data
  const chartData = monthlyProjections.map((proj) => ({
    month: proj.month,
    Income: Math.round(proj.projectedIncome),
    Expenses: Math.round(proj.projectedExpenses),
    Savings: Math.round(proj.projectedSavings),
    'Cumulative Savings': Math.round(proj.cumulativeSavings),
    'Net Worth': Math.round(proj.cumulativeNetWorth),
  }))

  // Get all unique transactions across all months
  const getAllTransactions = () => {
    const allTransactions: ProjectedTransaction[] = []
    const seen = new Set<string>()

    monthlyProjections.forEach((proj) => {
      const actualTransactions = getActualTransactionsForMonth(proj.monthIndex)
      
      // Add projected transactions
      proj.transactions.forEach((t) => {
        const key = `${t.type}-${t.description}-${t.amount}`
        if (!seen.has(key) || t.recurring) {
          if (t.recurring || !seen.has(key)) {
            allTransactions.push(t)
            if (!t.recurring) seen.add(key)
          }
        }
      })

      // Add actual transactions
      actualTransactions.forEach((t) => {
        const key = `actual-${t.id}`
        if (!seen.has(key)) {
          allTransactions.push({
            id: t.id,
            type: t.type as 'income' | 'expense',
            description: t.description,
            amount: t.amount,
            category: t.category,
            month: proj.monthIndex,
            year: proj.year,
            recurring: false,
          })
          seen.add(key)
        }
      })
    })

    return allTransactions
  }

  // Get amount for a transaction in a specific month
  const getTransactionAmount = (transaction: ProjectedTransaction, monthIndex: number): number => {
    if (transaction.recurring) {
      return transaction.amount
    }
    if (transaction.month === monthIndex) {
      return transaction.amount
    }
    return 0
  }

  // Group transactions by type and category
  const groupedTransactions = useMemo(() => {
    const all = getAllTransactions()
    const fixedExpenses: ProjectedTransaction[] = []
    const variableExpenses: ProjectedTransaction[] = []
    const income: ProjectedTransaction[] = []

    all.forEach((t) => {
      if (t.type === 'expense') {
        if (t.isFixed || t.recurring) {
          fixedExpenses.push(t)
        } else {
          variableExpenses.push(t)
        }
      } else {
        income.push(t)
      }
    })

    return { fixedExpenses, variableExpenses, income }
  }, [monthlyProjections])

  // Add projected transaction
  const handleAddTransaction = () => {
    if (!formData.description || !formData.amount) return

    const newTransaction: ProjectedTransaction = {
      id: `proj-${Date.now()}-${Math.random()}`,
      type: formData.type,
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.type === 'expense' ? formData.category : undefined,
      month: formData.recurring ? 0 : formData.month,
      year: selectedYear,
      recurring: formData.recurring,
      isFixed: formData.type === 'expense' ? formData.isFixed : undefined,
    }

    const updated = [...projectedTransactions, newTransaction]
    saveProjectedTransactions(updated)
    
    setFormData({
      type: 'income',
      description: '',
      amount: '',
      category: 'other',
      month: new Date().getMonth(),
      recurring: false,
      isFixed: true,
    })
    setShowAddForm(false)
  }

  // Delete projected transaction
  const handleDeleteTransaction = (id: string) => {
    const updated = projectedTransactions.filter((t) => t.id !== id)
    saveProjectedTransactions(updated)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Financial Projection</h1>
          <p className="text-gray-600">
            Projected income, expenses, and savings for {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-5 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors"
          >
            Add Transaction
          </button>
        </div>
      </div>

      {/* Add Transaction Form */}
      {showAddForm && (
        <div className="panel p-8 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">New Transaction</h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Transaction description"
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            {formData.type === 'expense' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="food">Food</option>
                    <option value="transportation">Transportation</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="shopping">Shopping</option>
                    <option value="bills">Bills</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="travel">Travel</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isFixed"
                    checked={formData.isFixed}
                    onChange={(e) => setFormData({ ...formData, isFixed: e.target.checked })}
                    className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                  />
                  <label htmlFor="isFixed" className="text-sm text-gray-700">
                    Fixed monthly expense
                  </label>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <select
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                disabled={formData.recurring}
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date(selectedYear, i, 1)
                  return (
                    <option key={i} value={i}>
                      {date.toLocaleDateString('en-US', { month: 'long' })}
                    </option>
                  )
                })}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recurring"
                checked={formData.recurring}
                onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
              />
              <label htmlFor="recurring" className="text-sm text-gray-700">
                Recurring every month
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-8">
            <button
              onClick={handleAddTransaction}
              className="px-6 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors"
            >
              Add Transaction
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setFormData({
                  type: 'income',
                  description: '',
                  amount: '',
                  category: 'other',
                  month: new Date().getMonth(),
                  recurring: false,
                  isFixed: true,
                })
              }}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Year Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="panel p-6 border-l-4 border-green-600">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Annual Income</p>
          <p className="text-3xl font-semibold text-gray-900">
            {currencyFormatter.format(yearlyTotals.totalIncome)}
          </p>
        </div>
        <div className="panel p-6 border-l-4 border-red-600">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Annual Expenses</p>
          <p className="text-3xl font-semibold text-gray-900">
            {currencyFormatter.format(yearlyTotals.totalExpenses)}
          </p>
        </div>
        <div className="panel p-6 border-l-4 border-blue-600">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Annual Savings</p>
          <p className="text-3xl font-semibold text-gray-900">
            {currencyFormatter.format(yearlyTotals.totalSavings)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="panel p-8 border border-gray-200">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Financial Overview</h2>
          <p className="text-sm text-gray-600">Monthly income, expenses, and cumulative savings</p>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" tickFormatter={(value) => `$${value / 1000}k`} />
            <Tooltip
              formatter={(value: number) => currencyFormatter.format(value)}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            />
            <Legend />
            <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="Savings" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
            <Area
              type="monotone"
              dataKey="Cumulative Savings"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900">Monthly Breakdown</h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('summary')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'summary'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'detailed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Detailed
          </button>
        </div>
      </div>

      {/* Summary View */}
      {viewMode === 'summary' && (
        <div className="space-y-3">
          {monthlyProjections.map((proj) => {
            const isCurrentMonth = new Date().getFullYear() === selectedYear && 
                                   proj.monthIndex === new Date().getMonth()
            const isPastMonth = new Date().getFullYear() === selectedYear && 
                               proj.monthIndex < new Date().getMonth()

            return (
              <div
                key={proj.monthIndex}
                className={`panel p-5 border transition-colors ${
                  isCurrentMonth
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16">
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        {proj.month}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(selectedYear, proj.monthIndex, 1).toLocaleDateString('en-US', { month: 'long' })}
                      </p>
                    </div>
                    {isCurrentMonth && (
                      <span className="text-xs font-medium text-gray-700 bg-gray-200 px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                    {isPastMonth && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Past
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-12">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Income</p>
                      <p className="text-base font-semibold text-gray-900">
                        {currencyFormatter.format(proj.projectedIncome)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Expenses</p>
                      <p className="text-base font-semibold text-gray-900">
                        {currencyFormatter.format(proj.projectedExpenses)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Net</p>
                      <p className={`text-lg font-semibold ${
                        proj.projectedSavings >= 0 ? 'text-gray-900' : 'text-red-600'
                      }`}>
                        {proj.projectedSavings >= 0 ? '+' : ''}
                        {currencyFormatter.format(proj.projectedSavings)}
                      </p>
                    </div>
                    <div className="text-right border-l border-gray-200 pl-8">
                      <p className="text-xs text-gray-500 mb-1">Cumulative</p>
                      <p className="text-base font-semibold text-gray-900">
                        {currencyFormatter.format(proj.cumulativeSavings)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detailed Spreadsheet View */}
      {viewMode === 'detailed' && (
        <div className="panel p-6 overflow-x-auto border border-gray-200">
          <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Note:</span> Fixed expenses repeat monthly. Variable expenses appear only in specified months. Scroll horizontally to view all months.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white border-b-2 border-gray-300 px-4 py-3 text-left font-semibold text-gray-900 z-10 min-w-[220px]">
                  Transaction
                </th>
                {monthlyProjections.map((proj) => (
                  <th
                    key={proj.monthIndex}
                    className="border-b-2 border-gray-300 px-3 py-3 text-center font-semibold text-gray-900 min-w-[110px] bg-gray-50"
                  >
                    {proj.month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Fixed Expenses Section */}
              <tr>
                <td
                  colSpan={13}
                  className="bg-gray-100 font-semibold text-gray-900 px-4 py-3 border-b-2 border-gray-300 uppercase tracking-wide text-xs"
                >
                  Fixed Expenses
                </td>
              </tr>
              {groupedTransactions.fixedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-4 text-gray-400 text-center text-sm">
                    No fixed expenses
                  </td>
                </tr>
              ) : (
                groupedTransactions.fixedExpenses.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="sticky left-0 bg-white border-b border-gray-200 px-4 py-2.5 text-gray-700 z-10">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{t.description}</span>
                        {t.id.startsWith('proj-') && (
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors ml-2"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    {monthlyProjections.map((proj) => (
                      <td
                        key={proj.monthIndex}
                        className="border-b border-gray-200 px-3 py-2.5 text-right text-gray-900"
                      >
                        {getTransactionAmount(t, proj.monthIndex) > 0
                          ? currencyFormatterDetailed.format(getTransactionAmount(t, proj.monthIndex))
                          : '—'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
              <tr className="bg-gray-100">
                <td className="sticky left-0 bg-gray-100 border-b-2 border-gray-300 px-4 py-2.5 font-semibold text-gray-900 z-10">
                  Subtotal Fixed Expenses
                </td>
                {monthlyProjections.map((proj) => (
                  <td
                    key={proj.monthIndex}
                    className="border-b-2 border-gray-300 px-3 py-2.5 text-right font-semibold text-gray-900 bg-gray-100"
                  >
                    {currencyFormatterDetailed.format(
                      groupedTransactions.fixedExpenses.reduce((sum, t) => sum + getTransactionAmount(t, proj.monthIndex), 0)
                    )}
                  </td>
                ))}
              </tr>

              {/* Variable Expenses Section */}
              <tr>
                <td
                  colSpan={13}
                  className="bg-gray-100 font-semibold text-gray-900 px-4 py-3 border-b-2 border-gray-300 uppercase tracking-wide text-xs"
                >
                  Variable Expenses
                </td>
              </tr>
              {groupedTransactions.variableExpenses.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-4 text-gray-400 text-center text-sm">
                    No variable expenses
                  </td>
                </tr>
              ) : (
                groupedTransactions.variableExpenses.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="sticky left-0 bg-white border-b border-gray-200 px-4 py-2.5 text-gray-700 z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t.description}</span>
                          {t.category && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {t.category}
                            </span>
                          )}
                        </div>
                        {t.id.startsWith('proj-') && (
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors ml-2"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    {monthlyProjections.map((proj) => (
                      <td
                        key={proj.monthIndex}
                        className="border-b border-gray-200 px-3 py-2.5 text-right text-gray-900"
                      >
                        {getTransactionAmount(t, proj.monthIndex) > 0
                          ? currencyFormatterDetailed.format(getTransactionAmount(t, proj.monthIndex))
                          : '—'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
              <tr className="bg-gray-100">
                <td className="sticky left-0 bg-gray-100 border-b-2 border-gray-300 px-4 py-2.5 font-semibold text-gray-900 z-10">
                  Subtotal Variable Expenses
                </td>
                {monthlyProjections.map((proj) => (
                  <td
                    key={proj.monthIndex}
                    className="border-b-2 border-gray-300 px-3 py-2.5 text-right font-semibold text-gray-900 bg-gray-100"
                  >
                    {currencyFormatterDetailed.format(
                      groupedTransactions.variableExpenses.reduce((sum, t) => sum + getTransactionAmount(t, proj.monthIndex), 0)
                    )}
                  </td>
                ))}
              </tr>

              {/* Total Expenses */}
              <tr className="bg-gray-200">
                <td className="sticky left-0 bg-gray-200 border-b-2 border-gray-400 px-4 py-3 font-bold text-gray-900 z-10">
                  Total Expenses
                </td>
                {monthlyProjections.map((proj) => (
                  <td
                    key={proj.monthIndex}
                    className="border-b-2 border-gray-400 px-3 py-3 text-right font-bold text-gray-900 bg-gray-200"
                  >
                    {currencyFormatterDetailed.format(proj.projectedExpenses)}
                  </td>
                ))}
              </tr>

              {/* Income Section */}
              <tr>
                <td
                  colSpan={13}
                  className="bg-gray-100 font-semibold text-gray-900 px-4 py-3 border-b-2 border-gray-300 uppercase tracking-wide text-xs"
                >
                  Income Sources
                </td>
              </tr>
              {groupedTransactions.income.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-4 text-gray-400 text-center text-sm">
                    No income sources
                  </td>
                </tr>
              ) : (
                groupedTransactions.income.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="sticky left-0 bg-white border-b border-gray-200 px-4 py-2.5 text-gray-700 z-10">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{t.description}</span>
                        {t.id.startsWith('proj-') && (
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors ml-2"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    {monthlyProjections.map((proj) => (
                      <td
                        key={proj.monthIndex}
                        className="border-b border-gray-200 px-3 py-2.5 text-right text-gray-900"
                      >
                        {getTransactionAmount(t, proj.monthIndex) > 0
                          ? currencyFormatterDetailed.format(getTransactionAmount(t, proj.monthIndex))
                          : '—'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
              <tr className="bg-gray-200">
                <td className="sticky left-0 bg-gray-200 border-b-2 border-gray-400 px-4 py-3 font-bold text-gray-900 z-10">
                  Total Income
                </td>
                {monthlyProjections.map((proj) => (
                  <td
                    key={proj.monthIndex}
                    className="border-b-2 border-gray-400 px-3 py-3 text-right font-bold text-gray-900 bg-gray-200"
                  >
                    {currencyFormatterDetailed.format(proj.projectedIncome)}
                  </td>
                ))}
              </tr>

              {/* Summary Section */}
              <tr>
                <td
                  colSpan={13}
                  className="bg-gray-100 font-semibold text-gray-900 px-4 py-3 border-b-2 border-gray-300 uppercase tracking-wide text-xs"
                >
                  Summary
                </td>
              </tr>
              <tr className="bg-white">
                <td className="sticky left-0 bg-white border-b border-gray-300 px-4 py-2.5 font-medium text-gray-900 z-10">
                  Expenses
                </td>
                {monthlyProjections.map((proj) => (
                  <td
                    key={proj.monthIndex}
                    className="border-b border-gray-300 px-3 py-2.5 text-right font-medium text-gray-900"
                  >
                    {currencyFormatterDetailed.format(proj.projectedExpenses)}
                  </td>
                ))}
              </tr>
              <tr className="bg-white">
                <td className="sticky left-0 bg-white border-b border-gray-300 px-4 py-2.5 font-medium text-gray-900 z-10">
                  Income
                </td>
                {monthlyProjections.map((proj) => (
                  <td
                    key={proj.monthIndex}
                    className="border-b border-gray-300 px-3 py-2.5 text-right font-medium text-gray-900"
                  >
                    {currencyFormatterDetailed.format(proj.projectedIncome)}
                  </td>
                ))}
              </tr>
              <tr className="bg-white">
                <td className="sticky left-0 bg-white border-b border-gray-300 px-4 py-2.5 font-medium text-gray-900 z-10">
                  Net
                </td>
                {monthlyProjections.map((proj) => (
                  <td
                    key={proj.monthIndex}
                    className={`border-b border-gray-300 px-3 py-2.5 text-right font-medium ${
                      proj.projectedSavings >= 0 ? 'text-gray-900' : 'text-red-600'
                    }`}
                  >
                    {proj.projectedSavings >= 0 ? '+' : ''}
                    {currencyFormatterDetailed.format(proj.projectedSavings)}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-900">
                <td className="sticky left-0 bg-gray-900 border-b-2 border-gray-700 px-4 py-3 font-bold text-white z-10">
                  Cumulative Savings
                </td>
                {monthlyProjections.map((proj) => (
                  <td
                    key={proj.monthIndex}
                    className="border-b-2 border-gray-700 px-3 py-3 text-right font-bold text-white bg-gray-900"
                  >
                    {currencyFormatterDetailed.format(proj.cumulativeSavings)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
