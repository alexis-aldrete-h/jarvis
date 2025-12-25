import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Transaction, TransactionType, ExpenseCategory, Budget } from '@jarvis/shared'

const TRANSACTIONS_KEY = 'jarvis_transactions'
const BUDGETS_KEY = 'jarvis_budgets'

export function useFinances() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const storedTransactions = await AsyncStorage.getItem(TRANSACTIONS_KEY)
      const storedBudgets = await AsyncStorage.getItem(BUDGETS_KEY)
      
      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions))
      }
      
      if (storedBudgets) {
        setBudgets(JSON.parse(storedBudgets))
      }
    } catch (e) {
      console.error('Failed to load data:', e)
    }
  }

  const saveTransactions = async (newTransactions: Transaction[]) => {
    try {
      setTransactions(newTransactions)
      await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(newTransactions))
    } catch (e) {
      console.error('Failed to save transactions:', e)
    }
  }

  const saveBudgets = async (newBudgets: Budget[]) => {
    try {
      setBudgets(newBudgets)
      await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(newBudgets))
    } catch (e) {
      console.error('Failed to save budgets:', e)
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

  return {
    transactions,
    budgets,
    addTransaction,
    deleteTransaction,
    addBudget,
    deleteBudget,
    getFinancialSummary,
  }
}

