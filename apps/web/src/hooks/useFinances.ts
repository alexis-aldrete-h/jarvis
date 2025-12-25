'use client'

import { useState, useEffect } from 'react'
import { Transaction, TransactionType, ExpenseCategory, Budget } from '@jarvis/shared'

const TRANSACTIONS_KEY = 'jarvis_transactions'
const BUDGETS_KEY = 'jarvis_budgets'

export function useFinances() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])

  useEffect(() => {
    const storedTransactions = localStorage.getItem(TRANSACTIONS_KEY)
    const storedBudgets = localStorage.getItem(BUDGETS_KEY)
    
    if (storedTransactions) {
      try {
        setTransactions(JSON.parse(storedTransactions))
      } catch (e) {
        console.error('Failed to load transactions:', e)
      }
    }
    
    if (storedBudgets) {
      try {
        setBudgets(JSON.parse(storedBudgets))
      } catch (e) {
        console.error('Failed to load budgets:', e)
      }
    }
  }, [])

  const saveTransactions = (newTransactions: Transaction[]) => {
    setTransactions(newTransactions)
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(newTransactions))
  }

  const saveBudgets = (newBudgets: Budget[]) => {
    setBudgets(newBudgets)
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(newBudgets))
  }

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveTransactions([...transactions, newTransaction])
    return newTransaction
  }

  const deleteTransaction = (id: string) => {
    saveTransactions(transactions.filter((t) => t.id !== id))
  }

  const clearAllTransactions = () => {
    setTransactions([])
    localStorage.removeItem(TRANSACTIONS_KEY)
  }

  const addBudget = (budget: Omit<Budget, 'id'>) => {
    const newBudget: Budget = {
      ...budget,
      id: Date.now().toString(),
    }
    saveBudgets([...budgets, newBudget])
    return newBudget
  }

  const deleteBudget = (id: string) => {
    saveBudgets(budgets.filter((b) => b.id !== id))
  }

  const getFinancialSummary = (startDate: Date, endDate: Date) => {
    const filtered = transactions.filter((t) => {
      const date = new Date(t.date)
      return date >= startDate && date <= endDate
    })

    const totalIncome = filtered
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = filtered
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      period: { start: startDate, end: endDate },
    }
  }

  const seedMockTransactions = () => {
    const now = new Date()
    const mockTransactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[] = []

    // Income transactions (salary, freelance, etc.)
    const incomeCategories = [
      { description: 'Salary', amount: 5500 },
      { description: 'Freelance Project', amount: 1200 },
      { description: 'Investment Dividends', amount: 350 },
      { description: 'Side Business', amount: 800 },
    ]

    // Expense categories with realistic amounts
    const expenseCategories: { description: string; amount: number; category: ExpenseCategory }[] = [
      { description: 'Grocery Shopping', amount: 85, category: 'food' },
      { description: 'Restaurant Dinner', amount: 45, category: 'food' },
      { description: 'Coffee & Breakfast', amount: 12, category: 'food' },
      { description: 'Uber Ride', amount: 25, category: 'transportation' },
      { description: 'Gas Station', amount: 60, category: 'transportation' },
      { description: 'Netflix Subscription', amount: 15, category: 'entertainment' },
      { description: 'Concert Tickets', amount: 120, category: 'entertainment' },
      { description: 'New Laptop', amount: 1299, category: 'shopping' },
      { description: 'Clothing', amount: 180, category: 'shopping' },
      { description: 'Electric Bill', amount: 95, category: 'bills' },
      { description: 'Internet Bill', amount: 75, category: 'bills' },
      { description: 'Rent', amount: 1800, category: 'bills' },
      { description: 'Gym Membership', amount: 50, category: 'healthcare' },
      { description: 'Doctor Visit', amount: 150, category: 'healthcare' },
      { description: 'Online Course', amount: 299, category: 'education' },
      { description: 'Flight Tickets', amount: 450, category: 'travel' },
      { description: 'Hotel Booking', amount: 320, category: 'travel' },
      { description: 'Miscellaneous', amount: 35, category: 'other' },
    ]

    // Generate transactions for the last 6 months
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
      
      // Add 1-2 income transactions per month
      const numIncomes = Math.floor(Math.random() * 2) + 1
      for (let i = 0; i < numIncomes; i++) {
        const income = incomeCategories[Math.floor(Math.random() * incomeCategories.length)]
        const day = Math.floor(Math.random() * 28) + 1
        mockTransactions.push({
          type: 'income',
          amount: income.amount + Math.random() * 200 - 100, // Add some variance
          description: income.description,
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day).toISOString().split('T')[0],
        })
      }

      // Add 8-15 expense transactions per month
      const numExpenses = Math.floor(Math.random() * 8) + 8
      for (let i = 0; i < numExpenses; i++) {
        const expense = expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
        const day = Math.floor(Math.random() * 28) + 1
        const variance = expense.amount * 0.2 // 20% variance
        mockTransactions.push({
          type: 'expense',
          amount: Math.max(5, expense.amount + (Math.random() * variance * 2 - variance)), // Ensure positive
          description: expense.description,
          category: expense.category,
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day).toISOString().split('T')[0],
        })
      }
    }

    // Add some recent transactions (last 7 days)
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date(now)
      date.setDate(date.getDate() - dayOffset)
      
      if (Math.random() > 0.3) { // 70% chance of a transaction
        const expense = expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
        mockTransactions.push({
          type: 'expense',
          amount: expense.amount + Math.random() * 50 - 25,
          description: expense.description,
          category: expense.category,
          date: date.toISOString().split('T')[0],
        })
      }
    }

    // Convert to full Transaction objects and save
    const fullTransactions: Transaction[] = mockTransactions.map((t, idx) => ({
      ...t,
      id: `mock-${Date.now()}-${idx}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    saveTransactions([...transactions, ...fullTransactions])
  }

  const importTransactionsFromCSV = (csvText: string): { success: number; errors: string[] } => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      return { success: 0, errors: ['CSV file is empty or has no data rows'] }
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const errors: string[] = []
    const newTransactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[] = []

    // Category mapping from CSV to ExpenseCategory
    const categoryMap: Record<string, ExpenseCategory> = {
      'groceries': 'food',
      'coffee': 'food',
      'drinks & dining': 'food',
      'food': 'food',
      'auto & transport': 'transportation',
      'transportation': 'transportation',
      'gasoline': 'transportation',
      'entertainment': 'entertainment',
      'suscriptions': 'entertainment',
      'shopping': 'shopping',
      'bills': 'bills',
      'household': 'bills',
      'electric bill': 'bills',
      'car insurance': 'bills',
      'phone bill': 'bills',
      'healthcare': 'healthcare',
      'pets': 'healthcare',
      'education': 'education',
      'travel & vacation': 'travel',
      'travel': 'travel',
      'piloto': 'education', // Flight training
      'one time expense': 'other',
      'unnecessary': 'other',
      'unexpected': 'other',
      'other': 'other',
    }

    // Helper to parse CSV line (handles quoted values)
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i])
        if (values.length < headers.length) {
          errors.push(`Row ${i + 1}: Not enough columns`)
          continue
        }

        const row: Record<string, string> = {}
        headers.forEach((header, idx) => {
          row[header] = values[idx] || ''
        })

        // Skip if essential fields are missing
        if (!row.date || !row.description || !row.type || !row.amount) {
          errors.push(`Row ${i + 1}: Missing required fields`)
          continue
        }

        // Parse date (handle YYYY-MM-DD format without timezone issues)
        const dateStr = row.date.trim()
        let formattedDate: string
        
        // Check if date is already in YYYY-MM-DD format - use it directly to avoid any parsing issues
        const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        if (dateMatch) {
          // Use the date string directly - no parsing needed!
          formattedDate = dateStr
        } else {
          // For other formats, parse and reformat
          let date: Date
          date = new Date(dateStr)
          if (isNaN(date.getTime())) {
            errors.push(`Row ${i + 1}: Invalid date format: ${dateStr}`)
            continue
          }
          // Format date as YYYY-MM-DD without timezone conversion
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          formattedDate = `${year}-${month}-${day}`
        }

        // Parse amount (remove $ and commas, handle negative)
        const amountStr = row.amount.toString().replace(/[$,]/g, '')
        const amount = parseFloat(amountStr)
        if (isNaN(amount)) {
          errors.push(`Row ${i + 1}: Invalid amount: ${row.amount}`)
          continue
        }

        // Map transaction type
        const typeStr = row.type.trim().toLowerCase()
        let type: TransactionType
        if (typeStr === 'income') {
          type = 'income'
        } else if (typeStr === 'expense') {
          type = 'expense'
        } else if (typeStr === 'transfer') {
          type = 'transfer'
        } else {
          errors.push(`Row ${i + 1}: Unknown transaction type: ${row.type}`)
          continue
        }

        // Map category
        let category: ExpenseCategory | undefined
        let originalCategory: string | undefined
        if (type === 'expense' && row.category) {
          const csvCategory = row.category.trim()
          originalCategory = csvCategory // Store original category name
          category = categoryMap[csvCategory.toLowerCase()] || 'other'
        }

        // Parse tags
        let tags: string[] | undefined
        if (row.tags && row.tags.trim()) {
          tags = row.tags.split(',').map(t => t.trim()).filter(t => t)
        }
        // Store original category in tags if it exists
        if (originalCategory) {
          tags = tags || []
          tags.push(`_originalCategory:${originalCategory}`)
        }

        // Build description (use Description, fallback to Statement description)
        const description = row.description?.trim() || row['statement description']?.trim() || 'Imported Transaction'
        
        // For expenses, ensure amount is positive (CSV might have negative)
        // For transfers, keep the sign (negative = outgoing, positive = incoming)
        // For income, keep positive
        const finalAmount = type === 'expense' ? Math.abs(amount) : amount
        
        newTransactions.push({
          type,
          amount: finalAmount,
          description,
          category,
          date: formattedDate,
          tags,
        })
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Add all valid transactions
    if (newTransactions.length > 0) {
      const fullTransactions: Transaction[] = newTransactions.map((t, idx) => ({
        ...t,
        id: `csv-${Date.now()}-${idx}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      saveTransactions([...transactions, ...fullTransactions])
    }

    return {
      success: newTransactions.length,
      errors,
    }
  }

  return {
    transactions,
    budgets,
    addTransaction,
    deleteTransaction,
    clearAllTransactions,
    addBudget,
    deleteBudget,
    getFinancialSummary,
    seedMockTransactions,
    importTransactionsFromCSV,
  }
}

