"use client"

import { useMemo, useState, useEffect } from "react"
import { Transaction, TransactionType, ExpenseCategory, Budget } from "@jarvis/shared"
import { useFinances } from "@/hooks/useFinances"
import { useNetWorth } from "@/hooks/useNetWorth"
import { useFlightTraining } from "@/hooks/useFlightTraining"
import { useAccountHistory, AccountSnapshot } from "@/hooks/useAccountHistory"
import { formatDate } from "@jarvis/shared"
import NetWorthTracker from "./NetWorthTracker"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// Category styles will be generated dynamically based on category name
const getCategoryStyle = (categoryColor: string) => {
  return `border-gray-200`
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const currencyFormatterDetailed = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

type TimeRange = '1W' | '1M' | '3M' | 'YTD' | 'ALL'

// Helper function to parse date strings as local dates (avoiding timezone issues)
function parseLocalDate(dateStr: string): Date {
  // If date is in YYYY-MM-DD format, parse as local date
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateMatch) {
    const year = parseInt(dateMatch[1], 10)
    const month = parseInt(dateMatch[2], 10) - 1 // Month is 0-indexed
    const day = parseInt(dateMatch[3], 10)
    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0) // Normalize to midnight local time
    return date
  }
  // Otherwise, parse as-is and normalize to midnight
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  return date
}

function getNetWorthData(transactions: Transaction[], timeRange: TimeRange = '1M', currentNetWorth: number = 0) {
  const now = new Date()
  let months = 1
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  let useMockData = transactions.length === 0
  
  switch (timeRange) {
    case '1W':
      // Last 7 days
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const days = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
      
      if (useMockData) {
        const mockData = []
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate)
          date.setDate(startDate.getDate() + i)
          const progress = i / (days - 1 || 1)
          // Generate progressive net worth from lower to current value
          const startNetWorth = currentNetWorth - (Math.abs(currentNetWorth) * 0.15) // Start 15% lower
          const mockNetWorth = startNetWorth + ((currentNetWorth - startNetWorth) * progress) + (Math.random() * 30 - 15)
          mockData.push({
            month: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            net: Number(mockNetWorth.toFixed(2)),
          })
        }
        return mockData
      }
      
      const dayBuckets = Array.from({ length: days }, (_, idx) => {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + idx)
        return {
          key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
          label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          date: new Date(date),
        }
      })
      
      const dayBucketMap = dayBuckets.reduce<Record<string, { income: number; expense: number }>>(
        (acc, bucket) => {
          acc[bucket.key] = { income: 0, expense: 0 }
          return acc
        },
        {}
      )
      
      transactions.forEach((transaction) => {
        const date = new Date(transaction.date)
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        if (!dayBucketMap[key]) return
        if (transaction.type === "income") {
          dayBucketMap[key].income += transaction.amount
        } else if (transaction.type === "expense") {
          dayBucketMap[key].expense += transaction.amount
        }
      })
      
      let cumulative = currentNetWorth
      return dayBuckets.map((bucket) => {
        const entry = dayBucketMap[bucket.key]
        const netDelta = (entry?.income ?? 0) - (entry?.expense ?? 0)
        cumulative += netDelta
        return {
          month: bucket.label,
          net: Number(cumulative.toFixed(2)),
        }
      })
      
    case '1M':
      months = 1
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case '3M':
      months = 3
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      break
    case 'YTD':
      months = now.getMonth() + 1
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'ALL':
      // For mock data, show last 12 months
      if (useMockData) {
        months = 12
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      } else {
      // Find earliest transaction
      if (transactions.length > 0) {
        const earliest = transactions.reduce((earliest, t) => {
          const tDate = new Date(t.date)
          return tDate < earliest ? tDate : earliest
        }, new Date(transactions[0].date))
        const monthsDiff = (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth())
        months = Math.max(6, monthsDiff + 1)
        startDate = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
      } else {
        months = 6
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        }
      }
      break
  }
  
  const monthBuckets = Array.from({ length: months }, (_, idx) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + idx, 1)
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-US", { month: "short" }),
      year: date.getFullYear(),
      month: date.getMonth(),
    }
  })

  // Always generate mock data for now to ensure historical data is shown
  // Generate mock historical data
  const mockData = []
  for (let i = 0; i < months; i++) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 15)
    const progress = i / (months - 1 || 1)
    // Generate progressive net worth from lower to current value
    // For negative net worth, we need to handle it differently
    const startNetWorth = currentNetWorth < 0 
      ? currentNetWorth - (Math.abs(currentNetWorth) * 0.4) // Start more negative (e.g., -$3,224 -> -$4,514)
      : currentNetWorth - (currentNetWorth * 0.4) // Start 40% lower for positive values
    const mockNetWorth = startNetWorth + ((currentNetWorth - startNetWorth) * progress) + (Math.random() * 150 - 75)
    mockData.push({
      month: date.toLocaleDateString("en-US", { month: "short" }),
      income: 0,
      expense: 0,
      net: Number(mockNetWorth.toFixed(2)),
    })
  }
  return mockData
}

function getMonthlySpendingCalendar(transactions: Transaction[], month: Date) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  
  const spendingByDay: Record<string, number> = {}
  const incomeByDay: Record<string, number> = {}
  
  transactions
    .filter((t) => {
      const date = parseLocalDate(t.date)
      return (
        date.getFullYear() === year &&
        date.getMonth() === monthIndex
      )
    })
    .forEach((t) => {
      const tDate = parseLocalDate(t.date)
      const dateKey = `${tDate.getFullYear()}-${tDate.getMonth()}-${tDate.getDate()}`
      
      if (t.type === 'income' || (t.type === 'transfer' && t.amount > 0)) {
        // For income, use positive amount. For positive transfers, use the amount
        const amount = t.type === 'income' ? t.amount : t.amount
        incomeByDay[dateKey] = (incomeByDay[dateKey] || 0) + amount
      } else if (t.type === 'expense' || (t.type === 'transfer' && t.amount < 0)) {
        // For expenses, use positive amount. For transfers, use absolute value of negative amounts
        const amount = t.type === 'expense' ? t.amount : Math.abs(t.amount)
        spendingByDay[dateKey] = (spendingByDay[dateKey] || 0) + amount
      }
    })
  
  return { spendingByDay, incomeByDay, daysInMonth }
}

function get3MonthSpendingCalendar(transactions: Transaction[], startMonth: Date) {
  const spendingByDay: Record<string, number> = {}
  const incomeByDay: Record<string, number> = {}
  
  for (let i = 0; i < 3; i++) {
    const month = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1)
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
    
    transactions
      .filter((t) => {
        const date = parseLocalDate(t.date)
        return (
          date.getFullYear() === year &&
          date.getMonth() === monthIndex
        )
      })
      .forEach((t) => {
        const tDate = parseLocalDate(t.date)
        const dateKey = `${tDate.getFullYear()}-${tDate.getMonth()}-${tDate.getDate()}`
        
        if (t.type === 'income' || (t.type === 'transfer' && t.amount > 0)) {
          // For income, use positive amount. For positive transfers, use the amount
          const amount = t.type === 'income' ? t.amount : t.amount
          incomeByDay[dateKey] = (incomeByDay[dateKey] || 0) + amount
        } else if (t.type === 'expense' || (t.type === 'transfer' && t.amount < 0)) {
          // For expenses, use positive amount. For transfers, use absolute value of negative amounts
          const amount = t.type === 'expense' ? t.amount : Math.abs(t.amount)
          spendingByDay[dateKey] = (spendingByDay[dateKey] || 0) + amount
        }
      })
  }
  
  return { spendingByDay, incomeByDay }
}

function getYearlySpendingCalendar(transactions: Transaction[], year: number) {
  const spendingByDay: Record<string, number> = {}
  const incomeByDay: Record<string, number> = {}
  
  for (let month = 0; month < 12; month++) {
  transactions
    .filter((t) => {
        const date = parseLocalDate(t.date)
      return (
        date.getFullYear() === year &&
          date.getMonth() === month
      )
    })
    .forEach((t) => {
        const tDate = parseLocalDate(t.date)
        const dateKey = `${tDate.getFullYear()}-${tDate.getMonth()}-${tDate.getDate()}`
        
        if (t.type === 'income' || (t.type === 'transfer' && t.amount > 0)) {
          // For income, use positive amount. For positive transfers, use the amount
          const amount = t.type === 'income' ? t.amount : t.amount
          incomeByDay[dateKey] = (incomeByDay[dateKey] || 0) + amount
        } else if (t.type === 'expense' || (t.type === 'transfer' && t.amount < 0)) {
          // For expenses, use positive amount. For transfers, use absolute value if negative
          const amount = t.type === 'expense' ? t.amount : Math.abs(t.amount)
          spendingByDay[dateKey] = (spendingByDay[dateKey] || 0) + amount
        }
      })
  }
  
  return { spendingByDay, incomeByDay }
}

export default function FinanceManager() {
  const {
    transactions,
    budgets,
    addTransaction,
    deleteTransaction,
    clearAllTransactions,
    addBudget,
    deleteBudget,
    getFinancialSummary,
    importTransactionsFromCSV,
  } = useFinances()

  // Clear all transactions on mount to ensure clean start
  useEffect(() => {
    if (transactions.length > 0) {
      clearAllTransactions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { getNetWorthSummary } = useNetWorth()
  const { getSummary: getFlightTrainingSummary } = useFlightTraining()
  const { snapshots, isLoaded: historyLoaded, addSnapshot, getHistoricalData, seedMockHistoricalData } = useAccountHistory()

  const [activeView, setActiveView] = useState<'dashboard' | 'net-worth'>('dashboard')
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('1M')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [chartView, setChartView] = useState<'net-worth' | 'account-history'>('net-worth')
  const [accountHistoryGranularity, setAccountHistoryGranularity] = useState<'yearly' | 'monthly' | 'weekly'>('yearly')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    return startOfWeek
  })
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, boolean>>({
    'Savings': true,
    'Investments': true,
    'Debt': true,
    'Flight Training': true,
    'Retirement': true,
  })
  const [spendingView, setSpendingView] = useState<'monthly' | '3month' | 'yearly'>('monthly')
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [csvImportResult, setCsvImportResult] = useState<{ success: number; errors: string[] } | null>(null)
  const [transactionForm, setTransactionForm] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    description: '',
    category: 'other' as ExpenseCategory,
    date: new Date().toISOString().split('T')[0],
  })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const summary = getFinancialSummary(monthStart, monthEnd)

  // Get current account values
  const netWorthSummary = getNetWorthSummary()
  const flightTrainingSummary = getFlightTrainingSummary()
  
  const currentAccounts = useMemo(() => {
    return {
      savings: netWorthSummary.totalSavingsUSD,
      investments: netWorthSummary.totalInvestmentsUSD,
      debt: -Math.abs(netWorthSummary.netDebtUSD), // Negative for debt
      flightTraining: -flightTrainingSummary.netTotalUSD, // Inverted as per requirements
      retirement: netWorthSummary.totalRetirementUSD,
    }
  }, [netWorthSummary, flightTrainingSummary])

  // Calculate current net worth from accounts (sum of all accounts)
  const currentNetWorth = useMemo(() => {
    return currentAccounts.savings + 
           currentAccounts.investments + 
           currentAccounts.retirement + 
           currentAccounts.debt + 
           currentAccounts.flightTraining
  }, [currentAccounts])

  // Auto-seeding removed - users should import CSV data

  // Capture current snapshot daily
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const lastSnapshot = snapshots[snapshots.length - 1]
    
    // Only add snapshot if we don't have one for today and we have actual data
    if ((!lastSnapshot || lastSnapshot.date.split('T')[0] !== today) && 
        (currentAccounts.savings !== 0 || currentAccounts.investments !== 0 || 
         currentAccounts.debt !== 0 || currentAccounts.flightTraining !== 0 || 
         currentAccounts.retirement !== 0)) {
      addSnapshot({
        date: new Date().toISOString(),
        ...currentAccounts,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccounts.savings, currentAccounts.investments, currentAccounts.debt, currentAccounts.flightTraining, currentAccounts.retirement])

  const netWorthData = useMemo(() => getNetWorthData(transactions, timeRange, currentNetWorth), [transactions, timeRange, currentNetWorth])
  const latestNetWorth = netWorthData[netWorthData.length - 1]?.net ?? currentNetWorth
  const previousNetWorth = netWorthData[netWorthData.length - 2]?.net ?? latestNetWorth
  const netWorthChange = latestNetWorth - previousNetWorth
  const netWorthChangePct =
    previousNetWorth !== 0 ? (netWorthChange / Math.abs(previousNetWorth)) * 100 : 0

  // Get historical data for accounts chart based on granularity
  const accountHistoryData = useMemo(() => {
    // Filter snapshots based on granularity
    let filteredSnapshots = snapshots
    
    if (accountHistoryGranularity === 'yearly') {
      // Show all 12 months of selected year
      filteredSnapshots = snapshots.filter(s => {
        const date = new Date(s.date)
        return date.getFullYear() === selectedYear
      })
      
      // Group by month and average values
      const monthlyGroups: Record<number, AccountSnapshot[]> = {}
      filteredSnapshots.forEach(snapshot => {
        const date = new Date(snapshot.date)
        const month = date.getMonth()
        if (!monthlyGroups[month]) {
          monthlyGroups[month] = []
        }
        monthlyGroups[month].push(snapshot)
      })
      
      // Create entries for all 12 months
      const result = []
      for (let month = 0; month < 12; month++) {
        const group = monthlyGroups[month] || []
        const date = new Date(selectedYear, month, 15)
        
        if (group.length > 0) {
          const avg = group.reduce((acc, s) => ({
            savings: acc.savings + s.savings,
            investments: acc.investments + s.investments,
            debt: acc.debt + s.debt,
            flightTraining: acc.flightTraining + s.flightTraining,
            retirement: acc.retirement + s.retirement,
          }), { savings: 0, investments: 0, debt: 0, flightTraining: 0, retirement: 0 })
          
          const count = group.length
          result.push({
            date: date.toLocaleDateString("en-US", { month: "short" }),
            Savings: Math.round((avg.savings / count) * 100) / 100,
            Investments: Math.round((avg.investments / count) * 100) / 100,
            Debt: Math.round((avg.debt / count) * 100) / 100,
            'Flight Training': Math.round((avg.flightTraining / count) * 100) / 100,
            Retirement: Math.round((avg.retirement / count) * 100) / 100,
          })
        } else {
          // No data for this month - show 0 or use previous month's value
          const prevMonthData = result[result.length - 1]
          result.push({
            date: date.toLocaleDateString("en-US", { month: "short" }),
            Savings: prevMonthData?.Savings || 0,
            Investments: prevMonthData?.Investments || 0,
            Debt: prevMonthData?.Debt || 0,
            'Flight Training': prevMonthData?.['Flight Training'] || 0,
            Retirement: prevMonthData?.Retirement || 0,
          })
        }
      }
      
      return result
    } else if (accountHistoryGranularity === 'monthly') {
      // Show all days of selected month
      filteredSnapshots = snapshots.filter(s => {
        const date = new Date(s.date)
        return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth
      })
      
      // Group by day
      const dailyGroups: Record<number, AccountSnapshot[]> = {}
      filteredSnapshots.forEach(snapshot => {
        const date = new Date(snapshot.date)
        const day = date.getDate()
        if (!dailyGroups[day]) {
          dailyGroups[day] = []
        }
        dailyGroups[day].push(snapshot)
      })
      
      // Get number of days in the month
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
      
      // Create entries for all days of the month
      const result = []
      for (let day = 1; day <= daysInMonth; day++) {
        const group = dailyGroups[day] || []
        const date = new Date(selectedYear, selectedMonth, day)
        
        if (group.length > 0) {
          const avg = group.reduce((acc, s) => ({
            savings: acc.savings + s.savings,
            investments: acc.investments + s.investments,
            debt: acc.debt + s.debt,
            flightTraining: acc.flightTraining + s.flightTraining,
            retirement: acc.retirement + s.retirement,
          }), { savings: 0, investments: 0, debt: 0, flightTraining: 0, retirement: 0 })
          
          const count = group.length
          result.push({
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            Savings: Math.round((avg.savings / count) * 100) / 100,
            Investments: Math.round((avg.investments / count) * 100) / 100,
            Debt: Math.round((avg.debt / count) * 100) / 100,
            'Flight Training': Math.round((avg.flightTraining / count) * 100) / 100,
            Retirement: Math.round((avg.retirement / count) * 100) / 100,
          })
        } else {
          // No data for this day - use previous day's value
          const prevDayData = result[result.length - 1]
          result.push({
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            Savings: prevDayData?.Savings || 0,
            Investments: prevDayData?.Investments || 0,
            Debt: prevDayData?.Debt || 0,
            'Flight Training': prevDayData?.['Flight Training'] || 0,
            Retirement: prevDayData?.Retirement || 0,
          })
        }
      }
      
      return result
    } else {
      // Weekly - show 7 days of selected week
      const weekEnd = new Date(selectedWeekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999) // Include entire end day
      
      filteredSnapshots = snapshots.filter(s => {
        const date = new Date(s.date)
        date.setHours(0, 0, 0, 0)
        const start = new Date(selectedWeekStart)
        start.setHours(0, 0, 0, 0)
        const end = new Date(weekEnd)
        end.setHours(23, 59, 59, 999)
        return date >= start && date <= end
      })
      
      // Group by day
      const dailyGroups: Record<string, AccountSnapshot[]> = {}
      filteredSnapshots.forEach(snapshot => {
        const date = new Date(snapshot.date)
        const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        if (!dailyGroups[dayKey]) {
          dailyGroups[dayKey] = []
        }
        dailyGroups[dayKey].push(snapshot)
      })
      
      // Create entries for all 7 days, even if no data
      const result = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(selectedWeekStart)
        date.setDate(date.getDate() + i)
        const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        const group = dailyGroups[dayKey] || []
        
        if (group.length > 0) {
          const avg = group.reduce((acc, s) => ({
            savings: acc.savings + s.savings,
            investments: acc.investments + s.investments,
            debt: acc.debt + s.debt,
            flightTraining: acc.flightTraining + s.flightTraining,
            retirement: acc.retirement + s.retirement,
          }), { savings: 0, investments: 0, debt: 0, flightTraining: 0, retirement: 0 })
          
          const count = group.length
          result.push({
            date: date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
            Savings: Math.round((avg.savings / count) * 100) / 100,
            Investments: Math.round((avg.investments / count) * 100) / 100,
            Debt: Math.round((avg.debt / count) * 100) / 100,
            'Flight Training': Math.round((avg.flightTraining / count) * 100) / 100,
            Retirement: Math.round((avg.retirement / count) * 100) / 100,
          })
        } else {
          // No data for this day - use previous day's value
          const prevDayData = result[result.length - 1]
          result.push({
            date: date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
            Savings: prevDayData?.Savings || 0,
            Investments: prevDayData?.Investments || 0,
            Debt: prevDayData?.Debt || 0,
            'Flight Training': prevDayData?.['Flight Training'] || 0,
            Retirement: prevDayData?.Retirement || 0,
          })
        }
      }
      
      return result
    }
  }, [snapshots, accountHistoryGranularity, selectedYear, selectedMonth, selectedWeekStart])

  const monthlySpending = useMemo(
    () => getMonthlySpendingCalendar(transactions, currentMonth),
    [transactions, currentMonth]
  )

  const threeMonthSpending = useMemo(
    () => get3MonthSpendingCalendar(transactions, currentMonth),
    [transactions, currentMonth]
  )

  const yearlySpending = useMemo(
    () => getYearlySpendingCalendar(transactions, currentMonth.getFullYear()),
    [transactions, currentMonth]
  )

  // Get transactions for a specific day
  const getDayTransactions = (date: Date) => {
    // Normalize the date to midnight to ensure consistent matching
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    normalizedDate.setHours(0, 0, 0, 0)
    
    const targetYear = normalizedDate.getFullYear()
    const targetMonth = normalizedDate.getMonth()
    const targetDay = normalizedDate.getDate()
    
    // Use the same dateKey format as the calendar for consistency
    const targetDateKey = `${targetYear}-${targetMonth}-${targetDay}`
    
    return transactions.filter(t => {
      const tDate = parseLocalDate(t.date)
      // Normalize transaction date to midnight
      tDate.setHours(0, 0, 0, 0)
      const tDateKey = `${tDate.getFullYear()}-${tDate.getMonth()}-${tDate.getDate()}`
      // Use the same dateKey matching as calendar
      return tDateKey === targetDateKey
    }).sort((a, b) => {
      // Sort by type (income first) then by amount
      if (a.type !== b.type) {
        return a.type === 'income' ? -1 : 1
      }
      return b.amount - a.amount
    })
  }

  const allTransactionsSorted = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  // Show only the 10 most recent transactions
  const recentTransactions = allTransactionsSorted.slice(0, 10)

  const currentBudget = budgets.find((b) => b.period === 'monthly')
  const budgetSpent = transactions
    .filter((t) => {
      const date = new Date(t.date)
      return (
        date >= monthStart &&
        date <= monthEnd &&
        t.type === 'expense'
      )
    })
    .reduce((sum, t) => sum + t.amount, 0)
  const budgetProgress = currentBudget ? (budgetSpent / currentBudget.limit) * 100 : 0

  // Mock credit score (in a real app, this would come from an API)
  const creditScore = 775
  const creditScoreChange = 0

  // Helper to get category display name
  const getCategoryName = (category: ExpenseCategory): string => {
    const names: Record<ExpenseCategory, string> = {
      food: 'Food',
      transportation: 'Transportation',
      entertainment: 'Entertainment',
      shopping: 'Shopping',
      bills: 'Bills',
      healthcare: 'Healthcare',
      education: 'Education',
      travel: 'Travel',
      other: 'Other',
    }
    return names[category]
  }

  // Icon library - all available icons (defined before useMemo)
  const iconLibrary: Record<string, JSX.Element> = {
    house: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    airplane: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
    car: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2a1 1 0 011 1v8m-6 0h6" />
      </svg>
    ),
    grocery: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    coffee: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-5.857L5 13l2.286-2.143L13 5z" />
      </svg>
    ),
    document: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    shield: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    play: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    shopping: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    heart: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    book: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    globe: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    tag: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    receipt: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    food: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    drink: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2v-1m0 0V5a2 2 0 112 2v1m0 0v13m-6 0h12a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    creditcard: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    thumbsdown: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17.293 13m-7 10v-5a2 2 0 012-2h.096M17.293 13l-1.293-1.293a1 1 0 00-1.414 0l-1.586 1.586a1 1 0 01-1.414 0l-1.586-1.586a1 1 0 00-1.414 0L8.293 13m7 0v5a2 2 0 01-2 2h-.096M8.293 13H4.236a2 2 0 00-1.789 2.894l3.5 7A2 2 0 008.736 21h4.018a2 2 0 00.485-.06l3.76-.94" />
      </svg>
    ),
  }

  // Extended color palette for more variety
  const categoryColorPalette = [
    '#60A5FA', // blue
    '#A78BFA', // purple
    '#34D399', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#2DD4BF', // teal
    '#818CF8', // indigo
    '#F97316', // orange
    '#EC4899', // pink
    '#14B8A6', // cyan
    '#8B5CF6', // violet
    '#06B6D4', // sky
    '#10B981', // emerald
    '#F43F5E', // rose
    '#6366F1', // indigo
    '#84CC16', // lime
  ]

  // Map specific category names to colors
  const getCategoryColor = (categoryName: string, mappedCategory: ExpenseCategory): string => {
    const name = categoryName.toLowerCase()
    
    // Specific color mappings for common categories
    if (name.includes('household') || name.includes('home') || name.includes('rent')) {
      return '#3B82F6' // blue
    }
    if (name.includes('piloto') || name.includes('flight') || name.includes('aviation')) {
      return '#8B5CF6' // violet
    }
    if (name.includes('car') || name.includes('auto') || name.includes('vehicle')) {
      return '#6366F1' // indigo
    }
    if (name.includes('insurance')) {
      return '#1E40AF' // deep blue
    }
    if (name.includes('grocery') || name.includes('food')) {
      return '#10B981' // emerald
    }
    if (name.includes('coffee') || name.includes('cafe')) {
      return '#92400E' // brown/amber
    }
    if (name.includes('restaurant') || name.includes('dining')) {
      return '#F59E0B' // amber
    }
    if (name.includes('subscription') || name.includes('suscription') || name.includes('streaming')) {
      return '#EC4899' // pink
    }
    if (name.includes('shopping') || name.includes('store')) {
      return '#F97316' // orange
    }
    if (name.includes('health') || name.includes('medical')) {
      return '#2DD4BF' // teal
    }
    if (name.includes('education') || name.includes('school') || name.includes('course')) {
      return '#818CF8' // indigo
    }
    if (name.includes('travel') || name.includes('vacation') || name.includes('hotel')) {
      return '#06B6D4' // sky
    }
    if (name.includes('one time') || name.includes('unnecessary')) {
      return '#94A3B8' // slate
    }
    if (name.includes('payment') || name.includes('bill')) {
      return '#475569' // slate
    }
    
    // Generate color from category name hash for variety
    let hash = 0
    for (let i = 0; i < categoryName.length; i++) {
      hash = categoryName.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % categoryColorPalette.length
    return categoryColorPalette[index]
  }

  // Get icon type identifier (for uniqueness tracking)
  const getCategoryIconType = (categoryName: string, mappedCategory: ExpenseCategory): string => {
    const name = categoryName.toLowerCase()
    
    // Specific category mappings as requested
    if (name.includes('household') || name.includes('home') || name.includes('rent')) return 'house'
    if (name.includes('piloto') || name.includes('flight') || name.includes('aviation')) return 'airplane'
    if (name.includes('car insurance') || (name.includes('car') && name.includes('insurance'))) return 'car'
    if (name.includes('groceries') || name.includes('grocery')) return 'grocery'
    if (name.includes('auto & transport') || name.includes('auto and transport') || name.includes('transport')) return 'car'
    if (name.includes('coffee')) return 'coffee'
    if (name.includes('drinks & dining') || name.includes('drinks and dining') || name.includes('dining') || name.includes('drinks')) return 'drink'
    if (name.includes('santander cc payment') || name.includes('santander') || name.includes('credit card payment')) return 'creditcard'
    if (name.includes('unnecessary')) return 'thumbsdown'
    
    // Additional mappings for other categories
    if (name.includes('car') || name.includes('auto') || name.includes('vehicle')) return 'car'
    if (name.includes('insurance')) return 'shield'
    if (name.includes('subscription') || name.includes('suscription') || name.includes('streaming')) return 'play'
    if (name.includes('shopping') || name.includes('store')) return 'shopping'
    if (name.includes('health') || name.includes('medical')) return 'heart'
    if (name.includes('education') || name.includes('school') || name.includes('course')) return 'book'
    if (name.includes('travel') || name.includes('vacation') || name.includes('hotel')) return 'globe'
    if (name.includes('one time')) return 'tag'
    if (name.includes('payment') || name.includes('bill')) return 'receipt'
    if (name.includes('food') || name.includes('restaurant')) return 'food'
    
    // Fallback to mapped category
    return mappedCategory
  }

  // Calculate category breakdown for current month using original CSV category names
  const categoryBreakdown = useMemo(() => {
    const monthExpenses = transactions.filter((t) => {
      const date = parseLocalDate(t.date)
      return (
        date >= monthStart &&
        date <= monthEnd &&
        t.type === 'expense'
      )
    })

    // Helper to extract original category from tags
    const getOriginalCategory = (t: Transaction): string => {
      if (t.tags) {
        const originalCategoryTag = t.tags.find(tag => tag.startsWith('_originalCategory:'))
        if (originalCategoryTag) {
          return originalCategoryTag.replace('_originalCategory:', '')
        }
      }
      // Fallback to mapped category name
      return getCategoryName(t.category || 'other')
    }

    // Group by original category name
    const categoryTotals: Record<string, number> = {}

    monthExpenses.forEach((t) => {
      const categoryName = getOriginalCategory(t)
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + t.amount
    })

    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0)

    const categories = Object.entries(categoryTotals)
      .map(([categoryName, amount]) => ({
        categoryName,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        // Get mapped category for color/icon fallback
        mappedCategory: monthExpenses.find(t => getOriginalCategory(t) === categoryName)?.category || 'other' as ExpenseCategory,
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)

    // Assign unique colors and icons to each category
    const usedColors = new Set<string>()
    const usedIconTypes = new Set<string>()
    const availableIconTypes = Object.keys(iconLibrary)
    let iconIndex = 0
    
    return categories.map((item, index) => {
      // Get unique color
      let color = getCategoryColor(item.categoryName, item.mappedCategory)
      let attempts = 0
      while (usedColors.has(color) && attempts < categoryColorPalette.length) {
        const hash = (item.categoryName.charCodeAt(0) + index + attempts) % categoryColorPalette.length
        color = categoryColorPalette[hash]
        attempts++
      }
      usedColors.add(color)

      // Get unique icon type
      let iconType = getCategoryIconType(item.categoryName, item.mappedCategory)
      // If icon type already used, find next available
      if (usedIconTypes.has(iconType)) {
        while (usedIconTypes.has(iconType) && iconIndex < availableIconTypes.length) {
          iconType = availableIconTypes[iconIndex % availableIconTypes.length]
          iconIndex++
        }
        // If still no unique icon, use mapped category as fallback
        if (usedIconTypes.has(iconType)) {
          iconType = item.mappedCategory
        }
      }
      usedIconTypes.add(iconType)

      return {
        ...item,
        color,
        iconType,
      }
    })
  }, [transactions, monthStart, monthEnd])

  const totalSpentThisMonth = useMemo(() => {
    return categoryBreakdown.reduce((sum, item) => sum + item.amount, 0)
  }, [categoryBreakdown])


  // Get icon based on icon type
  const getCategoryIconByName = (iconType: string, mappedCategory: ExpenseCategory) => {
    if (iconLibrary[iconType]) {
      return iconLibrary[iconType]
    }
    // Fallback to mapped category icon
    return getCategoryIcon(mappedCategory)
  }

  // Category icons - get icon based on mapped category (fallback)
  const getCategoryIcon = (mappedCategory: ExpenseCategory) => {
    const category = mappedCategory
    const icons: Record<ExpenseCategory, JSX.Element> = {
      food: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      transportation: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      entertainment: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      shopping: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      bills: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      healthcare: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      education: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      travel: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      other: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    }
    return icons[category]
  }

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!transactionForm.amount || !transactionForm.description) return

    addTransaction({
      type: transactionForm.type,
      amount: parseFloat(transactionForm.amount),
      description: transactionForm.description,
      category: transactionForm.category,
      date: transactionForm.date,
    })

    setTransactionForm({
      type: 'expense',
      amount: '',
      description: '',
      category: 'other',
      date: new Date().toISOString().split('T')[0],
    })
    setShowTransactionForm(false)
  }

  // Get calendar grid based on view
  const getCalendarDays = () => {
    if (spendingView === 'monthly') {
    const year = currentMonth.getFullYear()
    const monthIndex = currentMonth.getMonth()
    const firstDay = new Date(year, monthIndex, 1)
    const lastDay = new Date(year, monthIndex + 1, 0)
    const daysInMonth = lastDay.getDate()
      const startingDayOfWeek = firstDay.getDay()
    
      const days: Array<{ day: number | null; date: Date | null; monthLabel?: string }> = []
    
    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        days.push({ day: null, date: null })
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        // Create date at midnight local time to ensure consistent dateKey matching
        const dayDate = new Date(year, monthIndex, i)
        dayDate.setHours(0, 0, 0, 0)
        days.push({ day: i, date: dayDate })
      }
      
      return { days, monthLabel: currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }) }
    } else if (spendingView === '3month') {
      const days: Array<{ day: number | null; date: Date | null; monthLabel?: string }> = []
      
      for (let m = 0; m < 3; m++) {
        const month = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + m, 1)
        const year = month.getFullYear()
        const monthIndex = month.getMonth()
        const firstDay = new Date(year, monthIndex, 1)
        const lastDay = new Date(year, monthIndex + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()
        
        // Add month label for each month
        days.push({ 
          day: null, 
          date: null, 
          monthLabel: month.toLocaleDateString("en-US", { month: "long", year: "numeric" }) 
        })
        
        // Add empty cells for days before the month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
          days.push({ day: null, date: null })
        }
        
        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
          // Create date at midnight local time to ensure consistent dateKey matching
          const dayDate = new Date(year, monthIndex, i)
          dayDate.setHours(0, 0, 0, 0)
          days.push({ day: i, date: dayDate })
        }
      }
      
      return { days, monthLabel: null }
    } else {
      // Yearly view - show all 12 months
      const days: Array<{ day: number | null; date: Date | null; monthLabel?: string }> = []
      const year = currentMonth.getFullYear()
      
      for (let m = 0; m < 12; m++) {
        const month = new Date(year, m, 1)
        const monthIndex = m
        const firstDay = new Date(year, monthIndex, 1)
        const lastDay = new Date(year, monthIndex + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()
        
        // Add month label
        days.push({ 
          day: null, 
          date: null, 
          monthLabel: month.toLocaleDateString("en-US", { month: "long" }) 
        })
        
        // Add empty cells for days before the month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
          days.push({ day: null, date: null })
        }
        
        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
          // Create date at midnight local time to ensure consistent dateKey matching
          const dayDate = new Date(year, monthIndex, i)
          dayDate.setHours(0, 0, 0, 0)
          days.push({ day: i, date: dayDate })
        }
      }
      
      return { days, monthLabel: null }
    }
  }

  const calendarData = getCalendarDays()
  const totalSpent = useMemo(() => {
    if (spendingView === 'monthly') {
      return Object.values(monthlySpending.spendingByDay).reduce((sum, amount) => sum + amount, 0)
    } else if (spendingView === '3month') {
      return Object.values(threeMonthSpending.spendingByDay).reduce((sum, amount) => sum + amount, 0)
    } else {
      return Object.values(yearlySpending.spendingByDay).reduce((sum, amount) => sum + amount, 0)
    }
  }, [spendingView, monthlySpending, threeMonthSpending, yearlySpending])

  return (
    <div className="space-y-6 mb-0 pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Financial Dashboard</h1>
          <p className="text-sm text-gray-500 mt-2">Track your income, expenses, and financial trajectory.</p>
        </div>
        <div className="flex items-center gap-3">
          {transactions.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete all transactions? This action cannot be undone.')) {
                  clearAllTransactions()
                }
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 smooth-transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          )}
          <button
            onClick={() => setShowCSVImport(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 smooth-transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import CSV
          </button>
          <button
            onClick={() => setShowTransactionForm(!showTransactionForm)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 smooth-transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Transaction
          </button>
        </div>
      </div>

      {/* View Menu */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`px-6 py-2.5 text-sm font-semibold rounded-xl smooth-transition ${
            activeView === 'dashboard'
              ? 'bg-gray-900 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveView('net-worth')}
          className={`px-6 py-2.5 text-sm font-semibold rounded-xl smooth-transition ${
            activeView === 'net-worth'
              ? 'bg-gray-900 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
          }`}
        >
          Net Worth
        </button>
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <>
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="xl:col-span-2 space-y-6">
          {/* Combined Historical Charts Panel */}
          <div className="panel p-6 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Historical Data</h2>
                <p className="text-sm text-gray-600">
                  Visualize your financial journey
                </p>
                </div>
            </div>

            {/* Chart Type Selector */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setChartView('net-worth')}
                className={`px-6 py-3 text-sm font-semibold rounded-full smooth-transition flex items-center gap-2 ${
                  chartView === 'net-worth'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-900 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Net Worth
              </button>
              <button
                onClick={() => setChartView('account-history')}
                className={`px-6 py-3 text-sm font-semibold rounded-full smooth-transition flex items-center gap-2 ${
                  chartView === 'account-history'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-900 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                $ Accounts
              </button>
            </div>

            {/* Net Worth View */}
            {chartView === 'net-worth' && (
              <>
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Current Net Worth</h3>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                  {currencyFormatter.format(latestNetWorth)}
                </p>
                  <div className="flex items-center gap-2">
                    {netWorthChange >= 0 ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    )}
                    <span className={`text-sm font-semibold ${
                      netWorthChange >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {netWorthChange >= 0 ? '+' : ''}{currencyFormatterDetailed.format(netWorthChange)}
                  </span>
                    <span className={`text-sm font-semibold ${
                      netWorthChange >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    ({netWorthChangePct >= 0 ? '+' : ''}{netWorthChangePct.toFixed(2)}%)
                  </span>
              </div>
            </div>

            {/* Time Range Selectors */}
                <div className="flex items-center gap-2 mb-6">
              {(['1W', '1M', '3M', 'YTD', 'ALL'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                      className={`px-4 py-2 text-xs font-semibold rounded-full smooth-transition ${
                    timeRange === range
                          ? 'bg-gray-900 text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Net Worth Chart */}
                <div className="h-96 mt-4">
                  {netWorthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={netWorthData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <defs>
                      <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#9333EA" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#EC4899" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
                    <XAxis
                      dataKey="month"
                          stroke="#6B7280"
                      tickLine={false}
                      axisLine={false}
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                    />
                    <YAxis
                          stroke="#6B7280"
                          tickFormatter={(value) => {
                            if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                            return `$${value.toFixed(0)}`
                          }}
                      tickLine={false}
                      axisLine={false}
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                    />
                    <Tooltip
                      contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            border: "1px solid rgba(147, 51, 234, 0.2)",
                        borderRadius: "12px",
                        color: "#1a1a1a",
                            boxShadow: "0 8px 24px rgba(147, 51, 234, 0.15)",
                            padding: "12px 16px",
                          }}
                          formatter={(value: number) => [
                            currencyFormatter.format(value),
                            'Net Worth'
                          ]}
                          labelFormatter={(label) => label}
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                          stroke="#9333EA"
                          strokeWidth={3}
                      fill="url(#netWorthGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-500 text-sm mb-3">Add transactions to see your net worth</p>
                        <div className="text-center">
                          <p className="text-gray-500 text-sm mb-3">Import a CSV file to see your net worth</p>
                    <button
                            onClick={() => setShowCSVImport(true)}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 smooth-transition"
                    >
                            Import CSV
                    </button>
                        </div>
                  </div>
                </div>
              )}
            </div>
              </>
            )}

            {/* Account History View */}
            {chartView === 'account-history' && (
              <>
                {/* Granularity Selector */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    {(['yearly', 'monthly', 'weekly'] as const).map((granularity) => (
                      <button
                        key={granularity}
                        onClick={() => setAccountHistoryGranularity(granularity)}
                        className={`px-4 py-2 text-xs font-semibold rounded-full smooth-transition ${
                          accountHistoryGranularity === granularity
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/20'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-gray-900'
                        }`}
                      >
                        {granularity.charAt(0).toUpperCase() + granularity.slice(1)}
            </button>
                    ))}
                  </div>

                  {/* Period Selector */}
                  {accountHistoryGranularity === 'yearly' && (
                    <div className="flex items-center gap-2 ml-auto">
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-2 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-purple-300 hover:border-purple-300"
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {accountHistoryGranularity === 'monthly' && (
                    <div className="flex items-center gap-2 ml-auto">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="px-3 py-2 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-purple-300 hover:border-purple-300"
                      >
                        {Array.from({ length: 12 }, (_, i) => i).map(month => (
                          <option key={month} value={month}>
                            {new Date(2024, month, 1).toLocaleDateString("en-US", { month: "long" })}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-2 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-purple-300 hover:border-purple-300"
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {accountHistoryGranularity === 'weekly' && (
                    <div className="flex items-center gap-2 ml-auto">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <button
                        onClick={() => {
                          const newStart = new Date(selectedWeekStart)
                          newStart.setDate(newStart.getDate() - 7)
                          setSelectedWeekStart(newStart)
                        }}
                        className="px-2 py-2 text-xs rounded-full border border-gray-200 bg-white text-gray-900 hover:border-purple-300 hover:bg-purple-50/50"
                      >
                        ←
                      </button>
                      <span className="text-xs font-medium text-gray-900 px-2">
                        {selectedWeekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(selectedWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <button
                        onClick={() => {
                          const newStart = new Date(selectedWeekStart)
                          newStart.setDate(newStart.getDate() + 7)
                          setSelectedWeekStart(newStart)
                        }}
                        className="px-2 py-2 text-xs rounded-full border border-gray-200 bg-white text-gray-900 hover:border-purple-300 hover:bg-purple-50/50"
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>

                {/* Account Selection */}
                <div className="flex items-center gap-4 flex-wrap mb-6">
                  {[
                    { key: 'Savings', color: '#10B981', label: 'Savings' },
                    { key: 'Investments', color: '#6366F1', label: 'Investments' },
                    { key: 'Debt', color: '#EF4444', label: 'Debt' },
                    { key: 'Flight Training', color: '#9333EA', label: 'Flight Training' },
                    { key: 'Retirement', color: '#F59E0B', label: 'Retirement' },
                  ].map((account) => (
                    <button
                      key={account.key}
                      onClick={() => {
                        setSelectedAccounts(prev => ({
                          ...prev,
                          [account.key]: !(prev[account.key] ?? true)
                        }))
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full smooth-transition ${
                        selectedAccounts[account.key] !== false
                          ? 'bg-white border border-gray-200 hover:border-purple-300'
                          : 'bg-gray-100 border border-gray-200 opacity-50'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: account.color }}
                      ></div>
                      <span className="text-sm text-gray-900 font-medium">{account.label}</span>
                    </button>
                  ))}
                </div>

                {/* Account History Chart */}
                <div className="h-[500px]">
              {accountHistoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accountHistoryData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      stroke="#6B7280"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      angle={accountHistoryGranularity === 'yearly' ? 0 : accountHistoryGranularity === 'monthly' ? -45 : -45}
                      textAnchor={accountHistoryGranularity === 'yearly' ? 'middle' : 'end'}
                      height={accountHistoryGranularity === 'yearly' ? 50 : 80}
                      interval={accountHistoryGranularity === 'monthly' ? Math.max(0, Math.floor(accountHistoryData.length / 15)) : 0}
                    />
                    <YAxis
                      stroke="#6B7280"
                      tickFormatter={(value) => {
                        if (value < 0) return `-$${Math.abs(value / 1000).toFixed(0)}k`
                        return `$${(value / 1000).toFixed(0)}k`
                      }}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.98)",
                        border: "1px solid rgba(147, 51, 234, 0.2)",
                        borderRadius: "12px",
                        color: "#1a1a1a",
                        boxShadow: "0 8px 24px rgba(147, 51, 234, 0.15)",
                        padding: "12px 16px",
                      }}
                      formatter={(value: number, name: string) => {
                        if (selectedAccounts[name] !== false) {
                          return [currencyFormatter.format(value), name]
                        }
                        return null
                      }}
                    />
                    {selectedAccounts['Savings'] !== false && (
                      <Line
                        type="monotone"
                        dataKey="Savings"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#10B981", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6, stroke: "#10B981", strokeWidth: 2 }}
                      />
                    )}
                    {selectedAccounts['Investments'] !== false && (
                      <Line
                        type="monotone"
                        dataKey="Investments"
                        stroke="#6366F1"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#6366F1", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6, stroke: "#6366F1", strokeWidth: 2 }}
                      />
                    )}
                    {selectedAccounts['Debt'] !== false && (
                      <Line
                        type="monotone"
                        dataKey="Debt"
                        stroke="#EF4444"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#EF4444", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6, stroke: "#EF4444", strokeWidth: 2 }}
                      />
                    )}
                    {selectedAccounts['Flight Training'] !== false && (
                      <Line
                        type="monotone"
                        dataKey="Flight Training"
                        stroke="#9333EA"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#9333EA", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6, stroke: "#9333EA", strokeWidth: 2 }}
                      />
                    )}
                    {selectedAccounts['Retirement'] !== false && (
                      <Line
                        type="monotone"
                        dataKey="Retirement"
                        stroke="#F59E0B"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#F59E0B", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6, stroke: "#F59E0B", strokeWidth: 2 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-500 text-sm mb-3">No historical data available</p>
                      <div className="text-center">
                        <p className="text-gray-500 text-sm mb-3">Import transactions to see historical data</p>
                        <button
                          onClick={() => setShowCSVImport(true)}
                          className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 smooth-transition"
                        >
                          Import CSV
                        </button>
                      </div>
                  </div>
                </div>
              )}
                </div>
              </>
            )}
          </div>

          {/* Spent in Current Month */}
          <div className="panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {spendingView === 'monthly' 
                    ? `SPENT IN ${currentMonth.toLocaleDateString("en-US", { month: "long" }).toUpperCase()}`
                    : spendingView === '3month'
                    ? `SPENT IN 3 MONTHS`
                    : `SPENT IN ${currentMonth.getFullYear()}`
                  }
                </h2>
                <span className="text-gray-500">›</span>
              </div>
              <div className="flex items-center gap-2">
                {spendingView === 'monthly' && (
                  <>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                >
                  →
                </button>
                  </>
                )}
                {spendingView === '3month' && (
                  <>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 3))}
                      className="px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setCurrentMonth(new Date())}
                      className="px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 3))}
                      className="px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    >
                      →
                    </button>
                  </>
                )}
                {spendingView === 'yearly' && (
                  <>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1))}
                      className="px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setCurrentMonth(new Date())}
                      className="px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1))}
                      className="px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    >
                      →
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* View Selector */}
            <div className="flex items-center gap-2">
              {(['monthly', '3month', 'yearly'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setSpendingView(view)}
                  className={`px-4 py-2 text-xs font-semibold rounded-full smooth-transition ${
                    spendingView === view
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/20'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-gray-900'
                  }`}
                >
                  {view === 'monthly' ? 'Monthly' : view === '3month' ? '3 Months' : 'Yearly'}
                </button>
              ))}
            </div>

            <div>
              <p className="text-2xl font-bold text-gray-900">{currencyFormatter.format(totalSpent)}</p>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-4">
              {(() => {
                // Group days by month for multi-month views
                if (spendingView === 'monthly') {
                  return (
                    <div className="space-y-2">
                      {/* Month title for monthly view */}
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                        <p className="text-base font-bold text-gray-900 px-3">{calendarData.monthLabel}</p>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      </div>
                      
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={idx} className="text-center">
                  <p className="text-xs text-gray-500 font-medium">{day}</p>
                </div>
              ))}
              
              {/* Calendar days */}
                        {calendarData.days.map((item, idx) => {
                          if (item.day === null || item.date === null) {
                  return <div key={idx} />
                }
                
                          const dateKey = `${item.date.getFullYear()}-${item.date.getMonth()}-${item.date.getDate()}`
                          const spending = monthlySpending.spendingByDay[dateKey] || 0
                          const income = monthlySpending.incomeByDay[dateKey] || 0
                          const hasBoth = spending > 0 && income > 0
                          
                const isToday = 
                            item.day === now.getDate() &&
                            item.date.getMonth() === now.getMonth() &&
                            item.date.getFullYear() === now.getFullYear()
                
                const netAmount = income - spending
                const hasTransactions = spending > 0 || income > 0
                
                return (
                  <div
                    key={idx}
                            onClick={() => {
                              setSelectedDay(item.date)
                            }}
                    className={`text-center p-3 rounded-lg smooth-transition cursor-pointer hover:opacity-80 ${
                      isToday
                        ? hasBoth
                          ? 'bg-yellow-500/20 border-2 border-yellow-500/40'
                          : income > 0
                          ? 'bg-green-500/20 border-2 border-green-500/40'
                          : spending > 0
                          ? 'bg-orange-500/20 border-2 border-orange-500/40'
                          : 'bg-blue-500/20 border-2 border-blue-500/40'
                        : hasBoth
                        ? 'bg-yellow-500/10 border border-yellow-500/30'
                        : income > 0
                        ? 'bg-green-500/10 border border-green-500/30'
                        : spending > 0
                        ? 'bg-orange-500/10 border border-orange-500/30'
                        : 'bg-gray-100/60 border border-gray-200'
                    }`}
                  >
                    <p className={`text-sm font-semibold mb-1 ${
                      hasTransactions ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                                {item.day}
                    </p>
                    {hasTransactions ? (
                      <p className={`text-xs font-medium ${
                        hasBoth 
                          ? 'text-yellow-800'
                          : income > 0 
                          ? 'text-green-800' 
                          : 'text-orange-800'
                      }`}>
                        {hasBoth 
                          ? currencyFormatter.format(Math.abs(netAmount))
                          : income > 0 
                          ? currencyFormatter.format(income)
                          : currencyFormatter.format(spending)
                        }
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600">-</p>
                    )}
                  </div>
                )
              })}
            </div>
                    </div>
                  )
                } else {
                  // Multi-month view (3 months or yearly)
                  const months: Array<{ label: string; days: Array<{ day: number | null; date: Date | null }> }> = []
                  let currentMonth: { label: string; days: Array<{ day: number | null; date: Date | null }> } | null = null
                  
                  calendarData.days.forEach((item) => {
                    if (item.monthLabel) {
                      if (currentMonth) {
                        months.push(currentMonth)
                      }
                      currentMonth = { label: item.monthLabel, days: [] }
                    } else if (currentMonth) {
                      currentMonth.days.push({ day: item.day, date: item.date })
                    }
                  })
                  if (currentMonth) {
                    months.push(currentMonth)
                  }
                  
                  return months.map((month, monthIdx) => (
                    <div key={monthIdx} className="space-y-2">
                      {/* Month separator and label */}
                      {monthIdx > 0 && (
                        <div className="h-px bg-gray-200 my-4"></div>
                      )}
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                        <p className="text-base font-bold text-gray-900 px-3">{month.label}</p>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      </div>
                      
                      {/* Calendar grid for this month */}
                      <div className="grid grid-cols-7 gap-2">
                        {/* Day headers */}
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                          <div key={idx} className="text-center">
                            <p className="text-xs text-gray-500 font-medium">{day}</p>
                          </div>
                        ))}
                        
                        {/* Calendar days */}
                        {month.days.map((item, idx) => {
                          if (item.day === null || item.date === null) {
                            return <div key={idx} />
                          }
                          
                          const dateKey = `${item.date.getFullYear()}-${item.date.getMonth()}-${item.date.getDate()}`
                          let spending = 0
                          let income = 0
                          if (spendingView === '3month') {
                            spending = threeMonthSpending.spendingByDay[dateKey] || 0
                            income = threeMonthSpending.incomeByDay[dateKey] || 0
                          } else {
                            spending = yearlySpending.spendingByDay[dateKey] || 0
                            income = yearlySpending.incomeByDay[dateKey] || 0
                          }
                          const hasBoth = spending > 0 && income > 0
                          
                    const isToday = 
                            item.day === now.getDate() &&
                            item.date.getMonth() === now.getMonth() &&
                            item.date.getFullYear() === now.getFullYear()
                          
                          return (
                            <div
                              key={idx}
                            onClick={() => {
                              setSelectedDay(item.date)
                            }}
                              className={`text-center p-3 rounded-lg smooth-transition cursor-pointer hover:opacity-80 ${
                                isToday
                                  ? hasBoth
                                    ? 'bg-yellow-500/20 border-2 border-yellow-500/40'
                                    : income > 0
                                    ? 'bg-green-500/20 border-2 border-green-500/40'
                                    : spending > 0
                                    ? 'bg-orange-500/20 border-2 border-orange-500/40'
                                    : 'bg-blue-500/20 border-2 border-blue-500/40'
                                  : hasBoth
                                  ? 'bg-yellow-500/10 border border-yellow-500/30'
                                  : income > 0
                                  ? 'bg-green-500/10 border border-green-500/30'
                                  : spending > 0
                                  ? 'bg-orange-500/10 border border-orange-500/30'
                                  : 'bg-gray-100/60 border border-gray-200'
                              }`}
                            >
                              {(() => {
                                const netAmount = income - spending
                                const hasTransactions = spending > 0 || income > 0
                                
                                return (
                                  <>
                              <p className={`text-sm font-semibold mb-1 ${
                                      hasTransactions ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {item.day}
                              </p>
                                    {hasTransactions ? (
                                      <p className={`text-xs font-medium ${
                                        hasBoth 
                                          ? 'text-yellow-800'
                                          : income > 0 
                                          ? 'text-green-800' 
                                          : 'text-orange-800'
                                      }`}>
                                        {hasBoth 
                                          ? currencyFormatter.format(Math.abs(netAmount))
                                          : income > 0 
                                          ? currencyFormatter.format(income)
                                          : currencyFormatter.format(spending)
                                        }
                                      </p>
                                    ) : (
                                      <p className="text-xs text-gray-600">-</p>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          )
              })}
                      </div>
                    </div>
                  ))
                }
              })()}
            </div>

            {/* Recent Transactions / Selected Day Transactions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  {selectedDay 
                    ? `${selectedDay.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} TRANSACTIONS`
                    : 'RECENT TRANSACTIONS'
                  }
                </h3>
                <div className="flex items-center gap-2">
                {selectedDay && (
                  <button
                    onClick={() => setSelectedDay(null)}
                      className="text-xs text-gray-500 hover:text-gray-900 smooth-transition flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear
                  </button>
                )}
                </div>
              </div>
              <div className="space-y-3">
                {(() => {
                  const transactionsToShow = selectedDay ? getDayTransactions(selectedDay) : recentTransactions
                  
                  // Debug: Calculate what the calendar should show for this day
                  let calendarSpending = 0
                  let calendarIncome = 0
                  if (selectedDay) {
                    const dateKey = `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`
                    calendarSpending = monthlySpending.spendingByDay[dateKey] || 0
                    calendarIncome = monthlySpending.incomeByDay[dateKey] || 0
                  }
                  
                  if (transactionsToShow.length === 0) {
                    return (
                      <p className="text-gray-500 text-sm text-center py-4">
                        {selectedDay ? 'No transactions on this day' : 'No recent transactions'}
                      </p>
                    )
                  }
                  
                  // Separate income and expenses (include transfers as income/expense based on amount)
                  const incomeTransactions = transactionsToShow.filter(t => 
                    t.type === 'income' || (t.type === 'transfer' && t.amount > 0)
                  )
                  const expenseTransactions = transactionsToShow.filter(t => 
                    t.type === 'expense' || (t.type === 'transfer' && t.amount < 0)
                  )
                  
                  // Also include all transactions (including transfers that don't fit income/expense)
                  const allTransactionsForDay = transactionsToShow
                  
                  // Calculate totals (handle transfers correctly - match calendar logic)
                  const totalIncome = incomeTransactions.reduce((sum, t) => {
                    if (t.type === 'income') return sum + t.amount
                    if (t.type === 'transfer' && t.amount > 0) return sum + t.amount
                    return sum
                  }, 0)
                  const totalExpenses = expenseTransactions.reduce((sum, t) => {
                    if (t.type === 'expense') return sum + t.amount
                    if (t.type === 'transfer' && t.amount < 0) return sum + Math.abs(t.amount)
                    return sum
                  }, 0)
                  const netTotal = totalIncome - totalExpenses
                  
                  // Debug info - show if there's a mismatch
                  const hasMismatch = selectedDay && (
                    Math.abs(calendarIncome - totalIncome) > 0.01 || 
                    Math.abs(calendarSpending - totalExpenses) > 0.01
                  )
                  
                  return (
                    <>
                      {/* Income Transactions */}
                      {incomeTransactions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-green-600 mb-2">INCOME</p>
                          {incomeTransactions.map((transaction) => {
                            const transactionDate = new Date(transaction.date)
                            
                            // Get category name and color
                            let categoryName = transaction.category || 'Income'
                            if (transaction.tags) {
                              const originalCategoryTag = transaction.tags.find(tag => tag.startsWith('_originalCategory:'))
                              if (originalCategoryTag) {
                                categoryName = originalCategoryTag.replace('_originalCategory:', '')
                              }
                            }
                            
                            const categoryColor = getCategoryColor(categoryName, transaction.category as ExpenseCategory || 'other')
                            const iconType = getCategoryIconType(categoryName, transaction.category as ExpenseCategory || 'other')
                            const categoryIcon = iconLibrary[iconType] || iconLibrary['tag']
                            
                    return (
                      <div
                        key={transaction.id}
                                className="flex items-center justify-between p-3 rounded-lg backdrop-blur-sm border smooth-transition group"
                                style={{ 
                                  backgroundColor: `${categoryColor}15`, 
                                  borderColor: `${categoryColor}30`,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = `${categoryColor}25`
                                  e.currentTarget.style.borderColor = `${categoryColor}40`
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = `${categoryColor}15`
                                  e.currentTarget.style.borderColor = `${categoryColor}30`
                                }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div 
                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                                    style={{ 
                                      backgroundColor: `${categoryColor}20`, 
                                      borderColor: `${categoryColor}40`,
                                      color: categoryColor 
                                    }}
                                  >
                                    {categoryIcon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{transaction.description}</p>
                                    <p className="text-xs text-gray-500">
                                      {transactionDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} • {categoryName}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <p className="text-sm font-semibold text-green-600">
                                    +{currencyFormatterDetailed.format(transaction.amount)}
                          </p>
                          <button
                            onClick={() => deleteTransaction(transaction.id)}
                                    className="opacity-0 group-hover:opacity-100 smooth-transition text-gray-500 hover:text-red-500 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                          </button>
                        </div>
                      </div>
                    )
                          })}
                        </div>
                      )}
                      
                      {/* Expense Transactions */}
                      {expenseTransactions.length > 0 && (
                        <div className="space-y-2">
                          {incomeTransactions.length > 0 && <div className="h-2"></div>}
                          <p className="text-xs font-semibold text-orange-600 mb-2">EXPENSES</p>
                          {expenseTransactions.map((transaction) => {
                            const transactionDate = new Date(transaction.date)
                            const amount = transaction.type === 'transfer' && transaction.amount < 0 ? Math.abs(transaction.amount) : transaction.amount
                            
                            // Get category name and color
                            let categoryName = transaction.category || 'Expense'
                            if (transaction.tags) {
                              const originalCategoryTag = transaction.tags.find(tag => tag.startsWith('_originalCategory:'))
                              if (originalCategoryTag) {
                                categoryName = originalCategoryTag.replace('_originalCategory:', '')
                              }
                            }
                            
                            const categoryColor = getCategoryColor(categoryName, transaction.category as ExpenseCategory || 'other')
                            const iconType = getCategoryIconType(categoryName, transaction.category as ExpenseCategory || 'other')
                            const categoryIcon = iconLibrary[iconType] || iconLibrary['tag']
                            
                            return (
                              <div
                                key={transaction.id}
                                className="flex items-center justify-between p-3 rounded-lg backdrop-blur-sm border smooth-transition group"
                                style={{ 
                                  backgroundColor: `${categoryColor}15`, 
                                  borderColor: `${categoryColor}30`,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = `${categoryColor}25`
                                  e.currentTarget.style.borderColor = `${categoryColor}40`
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = `${categoryColor}15`
                                  e.currentTarget.style.borderColor = `${categoryColor}30`
                                }}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div 
                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                                    style={{ 
                                      backgroundColor: `${categoryColor}20`, 
                                      borderColor: `${categoryColor}40`,
                                      color: categoryColor 
                                    }}
                                  >
                                    {categoryIcon}
                          </div>
                          <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{transaction.description}</p>
                                    <p className="text-xs text-gray-500">
                                      {transactionDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} • {categoryName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                                  <p className="text-sm font-semibold text-orange-600">
                                    -{currencyFormatterDetailed.format(amount)}
                          </p>
                          <button
                            onClick={() => deleteTransaction(transaction.id)}
                                    className="opacity-0 group-hover:opacity-100 smooth-transition text-gray-500 hover:text-red-500 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                          })}
                        </div>
                )}
                      
                      {/* Total Summary - Only show for selected day */}
                      {selectedDay && transactionsToShow.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          {hasMismatch && (
                            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                              <p>⚠️ Mismatch detected: Calendar shows different amounts than transactions found.</p>
                              <p className="mt-1">Calendar: Income ${calendarIncome.toFixed(2)}, Expenses ${calendarSpending.toFixed(2)}</p>
                              <p>Found: Income ${totalIncome.toFixed(2)}, Expenses ${totalExpenses.toFixed(2)}</p>
                              <p className="mt-1 text-gray-600">Total transactions found: {allTransactionsForDay.length}</p>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              {totalIncome > 0 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-600">Total Income:</span>
                                  <span className="text-sm font-semibold text-green-600">
                                    +{currencyFormatterDetailed.format(totalIncome)}
                                  </span>
                                </div>
                              )}
                              {totalExpenses > 0 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-600">Total Expenses:</span>
                                  <span className="text-sm font-semibold text-orange-600">
                                    -{currencyFormatterDetailed.format(totalExpenses)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-1">Net Total</p>
                              <p className={`text-lg font-bold ${
                                netTotal >= 0 ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {netTotal >= 0 ? '+' : ''}{currencyFormatterDetailed.format(netTotal)}
                              </p>
                            </div>
                          </div>
                        </div>
                )}
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Widgets */}
        <div className="space-y-6">
          {/* Budget Widget */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">BUDGET IN {currentMonth.toLocaleDateString("en-US", { month: "long" }).toUpperCase()}</h3>
                <span className="text-gray-500">›</span>
              </div>
              <button className="text-gray-500 hover:text-gray-900">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
            {currentBudget ? (
              <>
                <p className="text-lg font-semibold text-gray-900">
                  {currencyFormatter.format(budgetSpent)} of {currencyFormatter.format(currentBudget.limit)}
                </p>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full smooth-transition ${
                      budgetProgress > 100
                        ? 'bg-red-400'
                        : budgetProgress > 80
                        ? 'bg-amber-400'
                        : 'bg-blue-400'
                    }`}
                    style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {budgetProgress.toFixed(1)}% of budget used
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-500 text-sm">No budget set for this month</p>
                <button
                  onClick={() => {
                    // You can add a budget form modal here
                  }}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-gradient-orange/20 bg-white text-gray-900 hover:border-gradient-bluePurple/40 smooth-transition"
                >
                  Set Budget
                </button>
              </div>
            )}
          </div>

          {/* Credit Score Widget */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">CREDIT SCORE</h3>
                <span className="text-gray-500">›</span>
              </div>
              <button className="text-gray-500 hover:text-gray-900">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {creditScore}
                {creditScoreChange !== 0 && (
                  <span className={`text-sm font-medium ml-2 ${
                    creditScoreChange > 0 ? 'text-gradient-bluePurple' : 'text-gradient-orangeRed'
                  }`}>
                    {creditScoreChange > 0 ? '+' : ''}{creditScoreChange} this month
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">Very Good</p>
            </div>
            {/* Credit score indicator bar */}
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-700"
                style={{ width: `${(creditScore / 850) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">You</p>
          </div>

          {/* Category Breakdown Widget */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">CATEGORY BREAKDOWN</h3>
                <span className="text-gray-500">›</span>
              </div>
              <button className="text-gray-500 hover:text-gray-900">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>

            {categoryBreakdown.length > 0 ? (
              <>
                {/* Donut Chart */}
                <div className="relative w-full h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="amount"
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => currencyFormatterDetailed.format(value)}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          borderRadius: '8px',
                          padding: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {currencyFormatter.format(totalSpentThisMonth)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Spent this month</p>
                    </div>
                  </div>
                </div>

                {/* Category List */}
                <div className="space-y-2">
                  {categoryBreakdown.map((item) => {
                    return (
                      <div
                        key={item.categoryName}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/40 smooth-transition"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-200"
                          style={{ backgroundColor: `${item.color}15` }}
                        >
                          <div style={{ color: item.color }}>
                            {getCategoryIconByName(item.iconType, item.mappedCategory)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.categoryName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.percentage.toFixed(1)}% of expenses
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {currencyFormatter.format(item.amount)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No expenses this month</p>
              </div>
            )}
          </div>

          {/* Additional Widgets Placeholder */}
          <div className="panel p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Your weekly recap</h3>
            <p className="text-xs text-gray-500">
              {formatDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))} to {formatDate(now)}
            </p>
          </div>

          <div className="panel p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Daily market brief</h3>
            <p className="text-xs text-gray-600">
              Markets start December cautiously amid Fed uncertainty...
            </p>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Net Worth View */}
      {activeView === 'net-worth' && (
        <div className="mt-6">
          <NetWorthTracker />
        </div>
      )}

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTransactionForm(false)
              setTransactionForm({
                type: 'expense',
                amount: '',
                description: '',
                category: 'other',
                date: new Date().toISOString().split('T')[0],
              })
            }
          }}
        >
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <form
            onSubmit={handleAddTransaction}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 panel animate-fade border border-gray-200 w-full max-w-md bg-white shadow-xl"
          >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Transaction</h2>
              <button
                type="button"
                onClick={() => {
                  setShowTransactionForm(false)
                  setTransactionForm({
                    type: 'expense',
                    amount: '',
                    description: '',
                    category: 'other',
                    date: new Date().toISOString().split('T')[0],
                  })
                }}
                className="text-gray-500 hover:text-gray-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTransactionForm({ ...transactionForm, type: 'income' })}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium smooth-transition ${
                    transactionForm.type === 'income'
                      ? 'bg-blue-50 border-2 border-blue-400 text-gray-900'
                      : 'bg-white/60 border border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionForm({ ...transactionForm, type: 'expense' })}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium smooth-transition ${
                    transactionForm.type === 'expense'
                      ? 'bg-red-50 border-2 border-red-400 text-gray-900'
                      : 'bg-white/60 border border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  Expense
                </button>
              </div>

              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={transactionForm.amount}
                onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-gray-400 focus:bg-white focus:ring-1 focus:ring-gray-300 smooth-transition"
                required
              />

              <input
                type="text"
                placeholder="Description"
                value={transactionForm.description}
                onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-gray-400 focus:bg-white focus:ring-1 focus:ring-gray-300 smooth-transition"
                required
              />

              {transactionForm.type === 'expense' && (
                <select
                  value={transactionForm.category}
                  onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value as ExpenseCategory })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-gray-400 focus:bg-white focus:ring-1 focus:ring-gray-300 smooth-transition appearance-none cursor-pointer"
                >
                  {Object.keys(categoryStyles).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="date"
                value={transactionForm.date}
                onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white text-gray-900 focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white focus:ring-1 focus:ring-gray-300 smooth-transition"
              />

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransactionForm(false)
                    setTransactionForm({
                      type: 'expense',
                      amount: '',
                      description: '',
                      category: 'other',
                      date: new Date().toISOString().split('T')[0],
                    })
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900 smooth-transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 smooth-transition"
                >
                  Add Transaction
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCSVImport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => {
          setShowCSVImport(false)
          setCsvImportResult(null)
        }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Import Transactions from CSV</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Upload a CSV file with your transaction data
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCSVImport(false)
                  setCsvImportResult(null)
                }}
                className="text-gray-500 hover:text-gray-900 smooth-transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Select CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const csvText = event.target?.result as string
                          const result = importTransactionsFromCSV(csvText)
                          setCsvImportResult(result)
                          // Calendar will automatically update via useMemo dependencies on transactions
                        }
                        reader.readAsText(file)
                      }
                    }}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-slate-700 file:to-slate-900 file:text-white hover:file:from-slate-800 hover:file:to-slate-950"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Expected CSV format: Date, Description, Statement description, Type, Category, Amount, Account, Tags, Notes
                  </p>
                </div>

                {csvImportResult && (
                  <div className={`p-4 rounded-lg border ${
                    csvImportResult.success > 0 && csvImportResult.errors.length === 0
                      ? 'bg-green-50 border-green-200'
                      : csvImportResult.errors.length > 0
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {csvImportResult.success > 0 && csvImportResult.errors.length === 0 ? (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      <p className={`text-sm font-semibold ${
                        csvImportResult.success > 0 && csvImportResult.errors.length === 0
                          ? 'text-green-700'
                          : 'text-yellow-700'
                      }`}>
                        {csvImportResult.success > 0 && csvImportResult.errors.length === 0
                          ? `Successfully imported ${csvImportResult.success} transaction${csvImportResult.success !== 1 ? 's' : ''}`
                          : `Imported ${csvImportResult.success} transaction${csvImportResult.success !== 1 ? 's' : ''}${csvImportResult.errors.length > 0 ? ` with ${csvImportResult.errors.length} error${csvImportResult.errors.length !== 1 ? 's' : ''}` : ''}`
                        }
                      </p>
                    </div>
                    {csvImportResult.errors.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-yellow-700 mb-2">Errors:</p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {csvImportResult.errors.map((error, idx) => (
                            <p key={idx} className="text-xs text-yellow-600">{error}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCSVImport(false)
                      setCsvImportResult(null)
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900 smooth-transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day Details Modal */}
      {selectedDay && (() => {
        const dayTransactions = getDayTransactions(selectedDay)
        const incomeTransactions = dayTransactions.filter(t => 
          t.type === 'income' || (t.type === 'transfer' && t.amount > 0)
        )
        const expenseTransactions = dayTransactions.filter(t => 
          t.type === 'expense' || (t.type === 'transfer' && t.amount < 0)
        )
        
        const totalIncome = incomeTransactions.reduce((sum, t) => {
          if (t.type === 'income') return sum + t.amount
          if (t.type === 'transfer' && t.amount > 0) return sum + t.amount
          return sum
        }, 0)
        const totalExpenses = expenseTransactions.reduce((sum, t) => {
          if (t.type === 'expense') return sum + t.amount
          if (t.type === 'transfer' && t.amount < 0) return sum + Math.abs(t.amount)
          return sum
        }, 0)
        const netTotal = totalIncome - totalExpenses
        
        const dayLabel = selectedDay.toLocaleDateString("en-US", { 
          month: "long", 
          day: "numeric",
          year: "numeric"
        })
        
        // Get category icon for each transaction
        const getTransactionIcon = (transaction: Transaction) => {
          let categoryName = transaction.category || 'other'
          if (transaction.tags) {
            const originalCategoryTag = transaction.tags.find(tag => tag.startsWith('_originalCategory:'))
            if (originalCategoryTag) {
              categoryName = originalCategoryTag.replace('_originalCategory:', '')
            }
          }
          const iconType = getCategoryIconType(categoryName, transaction.category as ExpenseCategory || 'other')
          return iconLibrary[iconType] || iconLibrary['tag']
        }
        
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDay(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">DETAILS</h2>
                    <p className="text-sm text-gray-400 mt-1">{dayLabel}</p>
                  </div>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {/* Total */}
                <div className="mt-4">
                  <p className="text-3xl font-bold text-white">
                    {currencyFormatterDetailed.format(Math.abs(netTotal))}
                  </p>
                </div>
              </div>
              
              {/* Transactions List */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {dayTransactions.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No transactions on this day</p>
                ) : (
                  <div className="space-y-2">
                    {dayTransactions.map((transaction) => {
                      const transactionDate = new Date(transaction.date)
                      const isIncome = transaction.type === 'income' || (transaction.type === 'transfer' && transaction.amount > 0)
                      const amount = isIncome ? transaction.amount : (transaction.type === 'transfer' && transaction.amount < 0 ? Math.abs(transaction.amount) : transaction.amount)
                      
                      // Get category name
                      let categoryName = transaction.category || (isIncome ? 'Income' : 'Expense')
                      if (transaction.tags) {
                        const originalCategoryTag = transaction.tags.find(tag => tag.startsWith('_originalCategory:'))
                        if (originalCategoryTag) {
                          categoryName = originalCategoryTag.replace('_originalCategory:', '')
                        }
                      }
                      
                      // Get category color
                      const categoryColor = getCategoryColor(categoryName, transaction.category as ExpenseCategory || 'other')
                      
                      return (
                        <div
                          key={transaction.id}
                          className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                        >
                          {/* Icon */}
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
                          >
                            {getTransactionIcon(transaction)}
                          </div>
                          
                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {transaction.description}
                            </p>
                            <p className="text-xs text-gray-400">
                              {transactionDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} • {categoryName}
                            </p>
                          </div>
                          
                          {/* Amount */}
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${
                              isIncome ? 'text-green-400' : 'text-orange-400'
                            }`}>
                              {isIncome ? '+' : '-'}{currencyFormatterDetailed.format(amount)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
