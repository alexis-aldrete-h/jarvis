'use client'

import { useState, useEffect } from 'react'
import { Transaction, TransactionType, ExpenseCategory, Budget } from '@jarvis/shared'
import { supabase } from '@/lib/supabase'

const TRANSACTIONS_KEY = 'jarvis_transactions'
const BUDGETS_KEY = 'jarvis_budgets'

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  return supabase !== null
}

// Load transactions from Supabase
const loadTransactionsFromSupabase = async (): Promise<Transaction[]> => {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error loading transactions from Supabase:', error)
      return []
    }

    if (!data) {
      return []
    }

    // Convert database format to Transaction format
    return data.map((row: any) => ({
      id: row.id,
      type: row.type as TransactionType,
      amount: parseFloat(row.amount),
      description: row.description,
      category: row.category as ExpenseCategory | undefined,
      date: row.date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tags: row.tags || undefined,
    }))
  } catch (error) {
    console.error('Exception loading transactions from Supabase:', error)
    return []
  }
}

// Load budgets from Supabase
const loadBudgetsFromSupabase = async (): Promise<Budget[]> => {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('finance_budgets')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Error loading budgets from Supabase:', error)
      return []
    }

    if (!data) {
      return []
    }

    // Convert database format to Budget format
    return data.map((row: any) => ({
      id: row.id,
      category: row.category as ExpenseCategory,
      limit: parseFloat(row.limit_amount),
      period: row.period as 'weekly' | 'monthly' | 'yearly',
      startDate: row.start_date,
      endDate: row.end_date || undefined,
    }))
  } catch (error) {
    console.error('Exception loading budgets from Supabase:', error)
    return []
  }
}

// Save transactions to Supabase
const saveTransactionsToSupabase = async (transactions: Transaction[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false
  }

  try {
    // Convert Transaction format to database format
    const transactionsToUpsert = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: t.category || null,
      date: typeof t.date === 'string' ? t.date : t.date.toISOString().split('T')[0],
      tags: t.tags || null,
      created_at: typeof t.createdAt === 'string' ? t.createdAt : t.createdAt.toISOString(),
      updated_at: typeof t.updatedAt === 'string' ? t.updatedAt : t.updatedAt.toISOString(),
    }))

    // Get all current IDs
    const currentIds = new Set(transactions.map(t => t.id))

    // Get all existing IDs from database
    const { data: existingData } = await supabase
      .from('finance_transactions')
      .select('id')

    // Delete orphaned records
    if (existingData) {
      const orphanedIds = existingData
        .filter(row => !currentIds.has(row.id))
        .map(row => row.id)

      if (orphanedIds.length > 0) {
        await supabase
          .from('finance_transactions')
          .delete()
          .in('id', orphanedIds)
      }
    }

    // Upsert all transactions
    if (transactionsToUpsert.length > 0) {
      const { error } = await supabase
        .from('finance_transactions')
        .upsert(transactionsToUpsert, { onConflict: 'id' })

      if (error) {
        console.error('Error saving transactions to Supabase:', error)
        return false
      }
    } else {
      // If no transactions, clear the table
      await supabase.from('finance_transactions').delete().neq('id', '')
    }

    return true
  } catch (error) {
    console.error('Exception saving transactions to Supabase:', error)
    return false
  }
}

// Save budgets to Supabase
const saveBudgetsToSupabase = async (budgets: Budget[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false
  }

  try {
    // Convert Budget format to database format
    const budgetsToUpsert = budgets.map((b) => ({
      id: b.id,
      category: b.category,
      limit_amount: b.limit,
      period: b.period,
      start_date: typeof b.startDate === 'string' ? b.startDate : b.startDate.toISOString().split('T')[0],
      end_date: b.endDate ? (typeof b.endDate === 'string' ? b.endDate : b.endDate.toISOString().split('T')[0]) : null,
    }))

    // Get all current IDs
    const currentIds = new Set(budgets.map(b => b.id))

    // Get all existing IDs from database
    const { data: existingData } = await supabase
      .from('finance_budgets')
      .select('id')

    // Delete orphaned records
    if (existingData) {
      const orphanedIds = existingData
        .filter(row => !currentIds.has(row.id))
        .map(row => row.id)

      if (orphanedIds.length > 0) {
        await supabase
          .from('finance_budgets')
          .delete()
          .in('id', orphanedIds)
      }
    }

    // Upsert all budgets
    if (budgetsToUpsert.length > 0) {
      const { error } = await supabase
        .from('finance_budgets')
        .upsert(budgetsToUpsert, { onConflict: 'id' })

      if (error) {
        console.error('Error saving budgets to Supabase:', error)
        return false
      }
    } else {
      // If no budgets, clear the table
      await supabase.from('finance_budgets').delete().neq('id', '')
    }

    return true
  } catch (error) {
    console.error('Exception saving budgets to Supabase:', error)
    return false
  }
}

// Migrate localStorage data to Supabase (one-time migration)
const migrateLocalStorageToSupabase = async (): Promise<void> => {
  if (!isSupabaseConfigured()) {
    return
  }

  try {
    // Check if migration has already been done
    const migrationKey = 'jarvis_finances_migrated_to_supabase'
    if (localStorage.getItem(migrationKey)) {
      return
    }

    // Load from localStorage
    const storedTransactions = localStorage.getItem(TRANSACTIONS_KEY)
    const storedBudgets = localStorage.getItem(BUDGETS_KEY)

    let transactionsToMigrate: Transaction[] = []
    let budgetsToMigrate: Budget[] = []

    if (storedTransactions) {
      try {
        transactionsToMigrate = JSON.parse(storedTransactions)
      } catch (e) {
        console.error('Failed to parse stored transactions:', e)
      }
    }

    if (storedBudgets) {
      try {
        budgetsToMigrate = JSON.parse(storedBudgets)
      } catch (e) {
        console.error('Failed to parse stored budgets:', e)
      }
    }

    // Only migrate if there's data and Supabase is empty
    if (transactionsToMigrate.length > 0 || budgetsToMigrate.length > 0) {
      const existingTransactions = await loadTransactionsFromSupabase()
      const existingBudgets = await loadBudgetsFromSupabase()

      // Only migrate if Supabase is empty
      if (existingTransactions.length === 0 && existingBudgets.length === 0) {
        if (transactionsToMigrate.length > 0) {
          await saveTransactionsToSupabase(transactionsToMigrate)
          console.log(`Migrated ${transactionsToMigrate.length} transactions to Supabase`)
        }
        if (budgetsToMigrate.length > 0) {
          await saveBudgetsToSupabase(budgetsToMigrate)
          console.log(`Migrated ${budgetsToMigrate.length} budgets to Supabase`)
        }
      }
    }

    // Mark migration as done
    localStorage.setItem(migrationKey, 'true')
  } catch (error) {
    console.error('Error migrating localStorage to Supabase:', error)
  }
}

export function useFinances() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      
      // Try to migrate localStorage data first
      await migrateLocalStorageToSupabase()

      // Load from Supabase if configured, otherwise fall back to localStorage
      if (isSupabaseConfigured()) {
        const loadedTransactions = await loadTransactionsFromSupabase()
        const loadedBudgets = await loadBudgetsFromSupabase()
        setTransactions(loadedTransactions)
        setBudgets(loadedBudgets)
      } else {
        // Fallback to localStorage
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
      }
      
      setIsLoading(false)
    }

    loadData()
  }, [])

  const saveTransactions = async (newTransactions: Transaction[]) => {
    setTransactions(newTransactions)
    
    if (isSupabaseConfigured()) {
      await saveTransactionsToSupabase(newTransactions)
    } else {
      // Fallback to localStorage
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(newTransactions))
    }
  }

  const saveBudgets = async (newBudgets: Budget[]) => {
    setBudgets(newBudgets)
    
    if (isSupabaseConfigured()) {
      await saveBudgetsToSupabase(newBudgets)
    } else {
      // Fallback to localStorage
      localStorage.setItem(BUDGETS_KEY, JSON.stringify(newBudgets))
    }
  }

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await saveTransactions([...transactions, newTransaction])
    return newTransaction
  }

  const deleteTransaction = async (id: string) => {
    await saveTransactions(transactions.filter((t) => t.id !== id))
  }

  const clearAllTransactions = async () => {
    setTransactions([])
    if (isSupabaseConfigured()) {
      await supabase.from('finance_transactions').delete().neq('id', '')
    } else {
      localStorage.removeItem(TRANSACTIONS_KEY)
    }
  }

  const addBudget = async (budget: Omit<Budget, 'id'>) => {
    const newBudget: Budget = {
      ...budget,
      id: Date.now().toString(),
    }
    await saveBudgets([...budgets, newBudget])
    return newBudget
  }

  const deleteBudget = async (id: string) => {
    await saveBudgets(budgets.filter((b) => b.id !== id))
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

  const clearAllFinanceData = async () => {
    // Clear transactions
    setTransactions([])
    if (isSupabaseConfigured()) {
      await supabase.from('finance_transactions').delete().neq('id', '')
    } else {
      localStorage.removeItem(TRANSACTIONS_KEY)
    }

    // Clear budgets
    setBudgets([])
    if (isSupabaseConfigured()) {
      await supabase.from('finance_budgets').delete().neq('id', '')
    } else {
      localStorage.removeItem(BUDGETS_KEY)
    }
  }

  const importTransactionsFromCSV = async (csvText: string): Promise<{ success: number; errors: string[] }> => {
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
      await saveTransactions([...transactions, ...fullTransactions])
    }

    return {
      success: newTransactions.length,
      errors,
    }
  }

  return {
    transactions,
    budgets,
    isLoading,
    addTransaction,
    deleteTransaction,
    clearAllTransactions,
    addBudget,
    deleteBudget,
    getFinancialSummary,
    clearAllFinanceData,
    importTransactionsFromCSV,
  }
}

