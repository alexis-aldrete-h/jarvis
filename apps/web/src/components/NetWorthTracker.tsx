"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { BankAccount, Cash, Investment, Debt, RetirementAccount } from "@jarvis/shared"
import { useNetWorth } from "@/hooks/useNetWorth"
import { useFlightTraining } from "@/hooks/useFlightTraining"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Legend,
  RadialBarChart,
  RadialBar,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const currencyFormatterMXN = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export default function NetWorthTracker() {
  const {
    bankAccounts,
    cash,
    investments,
    debts,
    retirementAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addCash,
    updateCash,
    deleteCash,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addDebt,
    updateDebt,
    deleteDebt,
    addRetirementAccount,
    updateRetirementAccount,
    deleteRetirementAccount,
    getNetWorthSummary,
    clearAllNetWorthData,
  } = useNetWorth()

  const [activeSection, setActiveSection] = useState<'savings' | 'investments' | 'debt' | 'flight-training' | 'retirement' | 'summary'>('summary')
  const [editingItem, setEditingItem] = useState<{ type: string; id: string | null }>({ type: '', id: null })
  const [showForm, setShowForm] = useState<{ type: string; visible: boolean }>({ type: '', visible: false })
  const [activeFlightTrainingTab, setActiveFlightTrainingTab] = useState<'cfi' | 'plane-rental' | 'others' | 'income'>('cfi')
  const [flightTrainingPage, setFlightTrainingPage] = useState(1)
  const [flightTrainingItemsPerPage, setFlightTrainingItemsPerPage] = useState<15 | 25 | 50 | 'all'>(25)
  const [selectedAssets, setSelectedAssets] = useState<Record<string, boolean>>({
    'Savings': true,
    'Investments': true,
    'Debt': true,
    'Flight Training': true,
    'Retirement': true,
  })

  const summary = getNetWorthSummary()
  const { 
    getSummary: getFlightTrainingSummary,
    cfiTransactions,
    planeRentalTransactions,
    extrasTransactions,
    incomeTransactions,
    clearAllFlightTrainingData,
    deleteCFI,
    deletePlaneRental,
    deleteExtras,
    deleteIncome,
  } = useFlightTraining()
  const flightTrainingSummary = getFlightTrainingSummary()
  
  // Calculate Flight Training as negative (it's an expense/investment)
  const flightTrainingUSD = -Math.abs(flightTrainingSummary.netTotalUSD)
  const flightTrainingMXN = -Math.abs(flightTrainingSummary.netTotalMXN)

  // Group bank accounts by bank name
  const banksByBank = useMemo(() => {
    const grouped: Record<string, BankAccount[]> = {}
    bankAccounts.forEach(account => {
      if (!grouped[account.bankName]) {
        grouped[account.bankName] = []
      }
      grouped[account.bankName].push(account)
    })
    return grouped
  }, [bankAccounts])

  // Group investments by type (excluding 401k which goes to retirement)
  const investmentsByType = useMemo(() => {
    const grouped: Record<string, Investment[]> = {
      etf: [],
      crypto: [],
      other: [],
    }
    investments.forEach(inv => {
      if (inv.type === 'etf') {
        grouped.etf.push(inv)
      } else if (inv.type === 'crypto') {
        grouped.crypto.push(inv)
      } else if (inv.type !== '401k') {
        grouped.other.push(inv)
      }
    })
    return grouped
  }, [investments])

  // Separate 401k investments for retirement section
  const retirementInvestments = useMemo(() => {
    return investments.filter(inv => inv.type === '401k')
  }, [investments])

  // Separate debts
  const debtIOwe = debts.filter(d => d.type === 'i-owe')
  const debtOwedToMe = debts.filter(d => d.type === 'owed-to-me')

  // Chart data for summary
  const chartData = useMemo(() => {
    return [
      {
        name: 'Savings',
        value: summary.totalSavingsUSD,
        color: '#F97316', // gradient-orange
      },
      {
        name: 'Debt',
        value: summary.netDebtUSD,
        color: summary.netDebtUSD < 0 ? '#FF6B35' : '#A855F7', // orangeRed or magenta
      },
      {
        name: 'Net Worth (Savings)',
        value: summary.netWorthFromSavingsUSD,
        color: summary.netWorthFromSavingsUSD >= 0 ? '#6366F1' : '#FF6B35', // bluePurple or orangeRed
      },
      {
        name: 'Investments',
        value: summary.totalInvestmentsUSD,
        color: '#F59E0B', // gradient-yellowOrange
      },
      {
        name: 'Net Worth (Total)',
        value: summary.netWorthWithInvestmentsUSD,
        color: summary.netWorthWithInvestmentsUSD >= 0 ? '#6366F1' : '#FF6B35', // bluePurple or orangeRed
      },
      {
        name: 'Retirement',
        value: summary.totalRetirementUSD,
        color: '#FEF3C7', // gradient-cream
      },
      {
        name: 'Total Net Worth',
        value: summary.totalNetWorthUSD,
        color: summary.totalNetWorthUSD >= 0 ? '#1E40AF' : '#FF6B35', // deepBlue or orangeRed
      },
    ]
  }, [summary])

  const hasData = cash.length > 0 || bankAccounts.length > 0 || investments.length > 0 || debts.length > 0 || retirementAccounts.length > 0

  return (
    <div className="space-y-6 mb-0 pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Net Worth Tracker</h2>
          <p className="text-sm text-text-secondary mt-1">Track your assets, investments, and debts to calculate your net worth.</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-2 border-b border-gradient-magenta/20 pb-0">
        {[
          { 
            id: 'summary', 
            label: 'Summary', 
            icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="12" width="4" height="6" fill="#000000" rx="1"/>
                <rect x="10" y="8" width="4" height="10" fill="#000000" rx="1"/>
                <rect x="16" y="4" width="4" height="14" fill="#000000" rx="1"/>
              </svg>
            )
          },
          { 
            id: 'savings', 
            label: 'Savings', 
            icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Money bag shape */}
                <path d="M12 3C9.24 3 7 5.24 7 8c0 1.5.5 2.9 1.4 4L8 20h8l-.4-8c.9-1.1 1.4-2.5 1.4-4 0-2.76-2.24-5-5-5z" fill="#000000"/>
                <path d="M12 3c-1.1 0-2 .9-2 2v1c0 .55.45 1 1 1s1-.45 1-1V5c0-.55.45-1 1-1s1 .45 1 1v1c0 .55.45 1 1 1s1-.45 1-1V5c0-1.1-.9-2-2-2z" fill="#000000" opacity="0.7"/>
                {/* Dollar sign */}
                <path d="M12 8v8M10 10h4M10 14h4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="1" fill="#FFFFFF"/>
              </svg>
            )
          },
          { 
            id: 'investments', 
            label: 'Investments', 
            icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Upward trending line */}
                <polyline points="3,18 7,12 11,14 21,4" stroke="#000000" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                {/* Grid lines */}
                <line x1="3" y1="18" x2="21" y2="18" stroke="#E5E7EB" strokeWidth="1"/>
                <line x1="3" y1="12" x2="21" y2="12" stroke="#E5E7EB" strokeWidth="1"/>
                <line x1="3" y1="6" x2="21" y2="6" stroke="#E5E7EB" strokeWidth="1"/>
                <line x1="3" y1="18" x2="3" y2="4" stroke="#E5E7EB" strokeWidth="1"/>
                <line x1="12" y1="18" x2="12" y2="4" stroke="#E5E7EB" strokeWidth="1"/>
                <line x1="21" y1="18" x2="21" y2="4" stroke="#E5E7EB" strokeWidth="1"/>
              </svg>
            )
          },
          { 
            id: 'debt', 
            label: 'Debt', 
            icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Credit card */}
                <rect x="3" y="6" width="18" height="12" rx="1.5" fill="#000000"/>
                <rect x="3" y="6" width="18" height="4" fill="#000000" opacity="0.6"/>
                {/* Magnetic stripe */}
                <rect x="4" y="12" width="16" height="2" fill="#FFFFFF" rx="0.5"/>
                {/* Card numbers/text */}
                <rect x="4" y="15" width="3" height="1" fill="#FFFFFF" rx="0.5"/>
                <rect x="8" y="15" width="3" height="1" fill="#FFFFFF" rx="0.5"/>
                <rect x="12" y="15" width="3" height="1" fill="#FFFFFF" rx="0.5"/>
                <rect x="16" y="15" width="3" height="1" fill="#FFFFFF" rx="0.5"/>
                {/* Chip */}
                <rect x="4" y="8" width="4" height="3" fill="#FFFFFF" rx="0.5"/>
              </svg>
            )
          },
          { 
            id: 'flight-training', 
            label: 'Flight Training', 
            icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Airplane icon */}
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="#000000"/>
              </svg>
            )
          },
          { 
            id: 'retirement', 
            label: 'Retirement', 
            icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Retirement/401k icon - building or shield */}
                <path d="M12 2L4 7v10c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" fill="#000000"/>
                <path d="M12 2L4 7v10c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" fill="#000000" opacity="0.3"/>
                <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
                <path d="M12 9v6M9 12h6" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium smooth-transition border-b-2 ${
              activeSection === tab.id
                ? 'border-gradient-orangeRed text-text-primary font-semibold'
                : 'border-transparent text-text-tertiary hover:text-text-primary hover:border-gradient-magenta/40'
            }`}
          >
            <span className={`${activeSection === tab.id ? 'opacity-100' : 'opacity-60'}`}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Savings Section */}
      {activeSection === 'savings' && (
        <div className="space-y-8">
          {/* Total Savings Hero Card */}
          <div className="panel p-6 bg-gradient-to-br from-gradient-bluePurple/10 via-gradient-orange/5 to-white border-2 border-gradient-bluePurple/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-text-tertiary uppercase tracking-wider mb-1">Total Savings</p>
                <h2 className="text-3xl font-bold text-text-primary">
                  {currencyFormatter.format(summary.totalSavingsUSD)}
                </h2>
                <p className="text-sm text-text-secondary mt-1">{currencyFormatterMXN.format(summary.totalSavingsMXN)} MXN</p>
              </div>
              <div className="flex gap-2">
            <button
              onClick={() => setShowForm({ type: 'cash', visible: true })}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-gradient-orangeRed/60 to-gradient-bluePurple/60 text-white hover:from-gradient-orangeRed/70 hover:to-gradient-bluePurple/70 smooth-transition"
            >
              + Add Cash
            </button>
                <button
                  onClick={() => setShowForm({ type: 'bank', visible: true })}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary hover:border-gradient-bluePurple/40 smooth-transition"
                >
                  + Add Account
            </button>
              </div>
          </div>

            {/* Quick Breakdown */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gradient-orange/20">
              <div>
                <p className="text-xs text-text-tertiary mb-1">Cash</p>
                <p className="text-lg font-semibold text-text-primary">{currencyFormatter.format(summary.totalCashUSD)}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Bank Accounts</p>
                <p className="text-lg font-semibold text-text-primary">
                  {currencyFormatter.format(summary.totalSavingsUSD - summary.totalCashUSD)}
                </p>
              </div>
            </div>
          </div>

          {/* Savings Breakdown Chart - Enhanced */}
          {(summary.totalCashUSD > 0 || (summary.totalSavingsUSD - summary.totalCashUSD) > 0) && (
            <div className="panel p-8 bg-gradient-to-br from-white via-gradient-orange/5 to-gradient-bluePurple/5 border-2 border-gradient-orange/20 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-orange/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-bluePurple/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                      <span className="text-2xl">💰</span>
                      Cash vs Bank Accounts
                    </h3>
                    <p className="text-sm text-text-tertiary mt-1">Visual breakdown of your savings portfolio</p>
                  </div>
                  <div className="text-right bg-white/60 backdrop-blur-sm px-4 py-3 rounded-xl border border-gradient-orange/20">
                    <p className="text-xs text-text-tertiary">Total Savings</p>
                    <p className="text-lg font-bold text-text-primary">{currencyFormatter.format(summary.totalSavingsUSD)}</p>
                    <p className="text-xs text-text-secondary">{currencyFormatterMXN.format(summary.totalSavingsMXN)} MXN</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Donut Chart */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          <linearGradient id="cashGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F97316" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#FB923C" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="bankGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#6366F1" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#818CF8" stopOpacity={1}/>
                          </linearGradient>
                        </defs>
                        <Pie
                          data={[
                            { name: 'Cash', value: Math.max(0, summary.totalCashUSD), fill: 'url(#cashGradient)', mxn: summary.totalCashMXN },
                            { name: 'Bank Accounts', value: Math.max(0, summary.totalSavingsUSD - summary.totalCashUSD), fill: 'url(#bankGradient)', mxn: summary.totalSavingsMXN - summary.totalCashMXN },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={6}
                          dataKey="value"
                          label={({ name }) => name}
                          labelLine={false}
                        >
                          {[
                            { name: 'Cash', value: Math.max(0, summary.totalCashUSD), fill: 'url(#cashGradient)' },
                            { name: 'Bank Accounts', value: Math.max(0, summary.totalSavingsUSD - summary.totalCashUSD), fill: 'url(#bankGradient)' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="#ffffff" strokeWidth={3} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const mxnValue = props.payload?.mxn || 0
                            return [
                              <div key="tooltip" className="space-y-1">
                                <p className="font-bold text-lg">{currencyFormatter.format(value)}</p>
                                <p className="text-sm text-text-tertiary">{currencyFormatterMXN.format(mxnValue)} MXN</p>
                                <p className="text-xs text-text-secondary">{name}</p>
                              </div>,
                              ''
                            ]
                          }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            border: "2px solid rgba(249, 115, 22, 0.3)",
                            borderRadius: "16px",
                            padding: "16px",
                            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.15)"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Bar Chart Comparison */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Cash', value: Math.max(0, summary.totalCashUSD), mxn: summary.totalCashMXN, fill: '#F97316' },
                          { name: 'Bank Accounts', value: Math.max(0, summary.totalSavingsUSD - summary.totalCashUSD), mxn: summary.totalSavingsMXN - summary.totalCashMXN, fill: '#6366F1' },
                        ].filter(item => item.value > 0)}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F97316" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#FB923C" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#818CF8" stopOpacity={0.6}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxis 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          axisLine={{ stroke: '#d1d5db' }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                        />
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const mxnValue = props.payload?.mxn || 0
                            return [
                              <div key="tooltip" className="space-y-1">
                                <p className="font-bold">{currencyFormatter.format(value)}</p>
                                <p className="text-sm text-text-tertiary">{currencyFormatterMXN.format(mxnValue)} MXN</p>
                              </div>,
                              ''
                            ]
                          }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            border: "2px solid rgba(249, 115, 22, 0.3)",
                            borderRadius: "12px",
                            padding: "12px",
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)"
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[12, 12, 0, 0]}
                        >
                          {[
                            { name: 'Cash', value: Math.max(0, summary.totalCashUSD), fill: 'url(#barGradient1)' },
                            { name: 'Bank Accounts', value: Math.max(0, summary.totalSavingsUSD - summary.totalCashUSD), fill: 'url(#barGradient2)' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cash Section - Table Format */}
          {cash.length > 0 && (
          <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-orange-500 to-orange-600 rounded"></div>
                  <div>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Cash</h3>
                    <p className="text-xs text-text-tertiary">Physical currency holdings</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForm({ type: 'cash', visible: true })}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-gradient-orangeRed/60 to-gradient-bluePurple/60 text-white hover:from-gradient-orangeRed/70 hover:to-gradient-bluePurple/70 smooth-transition"
                >
                  + Add
                </button>
              </div>
              <div className="panel overflow-hidden border border-gradient-orange/20">
            <div className="overflow-x-auto">
              <table className="w-full">
                    <thead className="bg-gradient-orange/5 border-b border-gradient-orange/20">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">ASSET</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TYPE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TOTAL VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">MXN VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">%</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">ACTIONS</th>
                  </tr>
                </thead>
                    <tbody className="divide-y divide-gradient-orange/10">
                      {cash.map((item) => {
                        const cashTotal = summary.totalCashUSD
                        const percentage = cashTotal > 0 ? (item.amountUSD / cashTotal) * 100 : 0
                        const isNegative = item.amountUSD < 0
                        
                        return (
                          <tr key={item.id} className="hover:bg-gradient-orange/5 smooth-transition group">
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-text-primary">{item.name}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-text-tertiary capitalize">{item.type}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className={`text-sm font-semibold ${isNegative ? 'text-red-600' : 'text-text-primary'}`}>
                                {currencyFormatter.format(item.amountUSD)}
                              </span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className={`text-sm ${isNegative ? 'text-red-600' : 'text-text-secondary'}`}>
                                {currencyFormatterMXN.format(item.amountMXN)} MXN
                              </span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-orange-600">{percentage.toFixed(1)}%</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                          <button
                            onClick={() => {
                              setEditingItem({ type: 'cash', id: item.id })
                              setShowForm({ type: 'cash', visible: true })
                            }}
                                  className="text-text-tertiary hover:text-gradient-bluePurple text-xs px-2 py-1 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteCash(item.id)}
                                  className="text-text-tertiary hover:text-gradient-orangeRed text-xs px-2 py-1 rounded"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                        )
                      })}
                      {/* Total Row */}
                      <tr className="bg-gradient-orange/10 font-semibold">
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-primary">Cash Total</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-tertiary">—</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className={`text-sm ${summary.totalCashUSD < 0 ? 'text-red-600' : 'text-text-primary'}`}>
                            {currencyFormatter.format(summary.totalCashUSD)}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className={`text-sm ${summary.totalCashMXN < 0 ? 'text-red-600' : 'text-text-secondary'}`}>
                            {currencyFormatterMXN.format(summary.totalCashMXN)} MXN
                          </span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-orange-600">100.0%</span>
                        </td>
                        <td className="px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
            </div>
          )}

          {cash.length === 0 && (
            <div className="panel p-8 text-center bg-white/50 border border-dashed border-gradient-orange/30 rounded-xl">
              <p className="text-text-tertiary text-sm mb-3">No cash entries</p>
              <button
                onClick={() => setShowForm({ type: 'cash', visible: true })}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-gradient-orangeRed/60 to-gradient-bluePurple/60 text-white hover:from-gradient-orangeRed/70 hover:to-gradient-bluePurple/70 smooth-transition"
              >
                + Add Cash
              </button>
            </div>
          )}

          {/* Bank Accounts Section - Table Format */}
          <div className="space-y-6 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-blue-600 rounded"></div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Bank Accounts</h3>
                  <p className="text-xs text-text-tertiary">Accounts organized by bank</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm({ type: 'bank', visible: true })}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary hover:border-gradient-bluePurple/40 smooth-transition"
              >
                + Add
              </button>
            </div>

            {Object.entries(banksByBank).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(banksByBank).map(([bankName, accounts]) => {
                  const bankTotal = accounts.reduce((sum, a) => sum + a.balanceUSD, 0)
                  const bankTotalMXN = accounts.reduce((sum, a) => sum + a.balanceMXN, 0)
                  
                  const getAccountIcon = (accountType: string) => {
                    if (accountType === 'credit-card') {
                      return (
                        <svg className="w-4 h-4 text-gradient-orangeRed" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      )
                    } else if (accountType === 'savings') {
                      return (
                        <svg className="w-4 h-4 text-gradient-bluePurple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )
                    } else {
                      return (
                        <svg className="w-4 h-4 text-gradient-bluePurple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      )
                    }
                  }
                  
                  return (
                    <div key={bankName} className="space-y-4">
                      <h4 className="text-sm font-bold text-text-primary uppercase">{bankName}</h4>
                      <div className="panel overflow-hidden border border-gradient-bluePurple/20">
                <div className="overflow-x-auto">
                  <table className="w-full">
                            <thead className="bg-gradient-bluePurple/5 border-b border-gradient-bluePurple/20">
                              <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">ASSET</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TYPE</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TOTAL VALUE</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">MXN VALUE</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">%</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">ACTIONS</th>
                      </tr>
                    </thead>
                            <tbody className="divide-y divide-gradient-bluePurple/10">
                              {accounts.map((account) => {
                                const percentage = bankTotal !== 0 ? (account.balanceUSD / bankTotal) * 100 : 0
                                const isNegative = account.balanceUSD < 0
                                
                                return (
                                  <tr key={account.id} className="hover:bg-gradient-bluePurple/5 smooth-transition group">
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        {getAccountIcon(account.accountType)}
                                        <span className="text-sm font-semibold text-text-primary uppercase">{account.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="text-sm text-text-tertiary capitalize">{account.accountType.replace('-', ' ')}</span>
                                    </td>
                                    <td className="text-right px-4 py-3">
                                      <span className={`text-sm font-semibold ${isNegative ? 'text-red-600' : 'text-text-primary'}`}>
                                        {currencyFormatter.format(account.balanceUSD)}
                                      </span>
                                    </td>
                                    <td className="text-right px-4 py-3">
                                      <span className={`text-sm ${isNegative ? 'text-red-600' : 'text-text-secondary'}`}>
                                        {currencyFormatterMXN.format(account.balanceMXN)} MXN
                                      </span>
                                    </td>
                                    <td className="text-right px-4 py-3">
                                      <span className="text-sm font-semibold text-blue-600">{percentage.toFixed(1)}%</span>
                                    </td>
                                    <td className="text-right px-4 py-3">
                                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                              <button
                                onClick={() => {
                                  setEditingItem({ type: 'bank', id: account.id })
                                  setShowForm({ type: 'bank', visible: true })
                                }}
                                          className="text-text-tertiary hover:text-gradient-bluePurple text-xs px-2 py-1 rounded"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteBankAccount(account.id)}
                                          className="text-text-tertiary hover:text-gradient-orangeRed text-xs px-2 py-1 rounded"
                              >
                                ×
                              </button>
                            </div>
                          </td>
                        </tr>
                                )
                              })}
                              {/* Bank Total Row */}
                              <tr className="bg-gradient-bluePurple/10 font-semibold">
                                <td className="px-4 py-3">
                                  <span className="text-sm text-text-primary">{bankName} Total</span>
                        </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-text-tertiary">—</span>
                        </td>
                                <td className="text-right px-4 py-3">
                                  <span className={`text-sm ${bankTotal < 0 ? 'text-red-600' : 'text-text-primary'}`}>
                                    {currencyFormatter.format(bankTotal)}
                                  </span>
                                </td>
                                <td className="text-right px-4 py-3">
                                  <span className={`text-sm ${bankTotalMXN < 0 ? 'text-red-600' : 'text-text-secondary'}`}>
                                    {currencyFormatterMXN.format(bankTotalMXN)} MXN
                                  </span>
                                </td>
                                <td className="text-right px-4 py-3">
                                  <span className="text-sm text-blue-600">100.0%</span>
                                </td>
                                <td className="px-4 py-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
                </div>
                  )
                })}
              </div>
            ) : (
              <div className="panel p-8 text-center bg-white/50 border border-dashed border-gradient-bluePurple/30 rounded-xl">
                <p className="text-text-tertiary text-sm mb-3">No bank accounts</p>
                <button
                  onClick={() => setShowForm({ type: 'bank', visible: true })}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary hover:border-gradient-bluePurple/40 smooth-transition"
                >
                  + Add Account
                </button>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Investments Section */}
      {activeSection === 'investments' && (
        <div className="space-y-6">
          {/* Total Investments Hero Card */}
          <div className="panel p-6 bg-gradient-to-br from-gradient-yellowOrange/10 via-gradient-cream/5 to-white border-2 border-gradient-yellowOrange/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-text-tertiary uppercase tracking-wider mb-1">Total Investments</p>
                <h2 className="text-3xl font-bold text-text-primary">
                  {currencyFormatter.format(summary.totalInvestmentsUSD)}
                </h2>
                <p className="text-sm text-text-secondary mt-1">{currencyFormatterMXN.format(summary.totalInvestmentsMXN)} MXN</p>
              </div>
            <button
              onClick={() => setShowForm({ type: 'investment', visible: true })}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-gradient-orangeRed/60 to-gradient-bluePurple/60 text-white hover:from-gradient-orangeRed/70 hover:to-gradient-bluePurple/70 smooth-transition"
            >
              + Add Investment
            </button>
          </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gradient-orange/20">
              <div>
                <p className="text-xs text-text-tertiary mb-1">ETFs</p>
                <p className="text-lg font-semibold text-text-primary">
                  {currencyFormatter.format(investmentsByType.etf.reduce((sum, i) => sum + i.valueUSD, 0))}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Cryptocurrencies</p>
                <p className="text-lg font-semibold text-text-primary">
                  {currencyFormatter.format(investmentsByType.crypto.reduce((sum, i) => sum + i.valueUSD, 0))}
                </p>
              </div>
            </div>
          </div>

          {/* Investments Breakdown Chart - Enhanced */}
          {summary.totalInvestmentsUSD > 0 && (
            <div className="panel p-8 bg-gradient-to-br from-white via-gradient-yellowOrange/5 to-gradient-purple/5 border-2 border-gradient-yellowOrange/20 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-yellowOrange/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-purple/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                      <span className="text-2xl">📈</span>
                      ETFs vs Cryptocurrencies
                    </h3>
                    <p className="text-sm text-text-tertiary mt-1">Portfolio allocation across investment types</p>
                  </div>
                  <div className="text-right bg-white/60 backdrop-blur-sm px-4 py-3 rounded-xl border border-gradient-yellowOrange/20">
                    <p className="text-xs text-text-tertiary">Total Investments</p>
                    <p className="text-lg font-bold text-text-primary">{currencyFormatter.format(summary.totalInvestmentsUSD)}</p>
                    <p className="text-xs text-text-secondary">{currencyFormatterMXN.format(summary.totalInvestmentsMXN)} MXN</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Donut Chart */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          <linearGradient id="etfGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F59E0B" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#FBBF24" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="cryptoGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#A855F7" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#C084FC" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="otherGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#A78BFA" stopOpacity={1}/>
                          </linearGradient>
                        </defs>
                        <Pie
                          data={[
                            { name: 'ETFs', value: Math.max(0, investmentsByType.etf.reduce((sum, i) => sum + i.valueUSD, 0)), fill: 'url(#etfGradient)', mxn: investmentsByType.etf.reduce((sum, i) => sum + i.valueMXN, 0) },
                            { name: 'Cryptocurrencies', value: Math.max(0, investmentsByType.crypto.reduce((sum, i) => sum + i.valueUSD, 0)), fill: 'url(#cryptoGradient)', mxn: investmentsByType.crypto.reduce((sum, i) => sum + i.valueMXN, 0) },
                            { name: 'Other', value: Math.max(0, investmentsByType.other.reduce((sum, i) => sum + i.valueUSD, 0)), fill: 'url(#otherGradient)', mxn: investmentsByType.other.reduce((sum, i) => sum + i.valueMXN, 0) },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={6}
                          dataKey="value"
                          label={({ name }) => name}
                          labelLine={false}
                        >
                          {[
                            { name: 'ETFs', value: Math.max(0, investmentsByType.etf.reduce((sum, i) => sum + i.valueUSD, 0)), fill: 'url(#etfGradient)' },
                            { name: 'Cryptocurrencies', value: Math.max(0, investmentsByType.crypto.reduce((sum, i) => sum + i.valueUSD, 0)), fill: 'url(#cryptoGradient)' },
                            { name: 'Other', value: Math.max(0, investmentsByType.other.reduce((sum, i) => sum + i.valueUSD, 0)), fill: 'url(#otherGradient)' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="#ffffff" strokeWidth={3} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const mxnValue = props.payload?.mxn || 0
                            return [
                              <div key="tooltip" className="space-y-1">
                                <p className="font-bold text-lg">{currencyFormatter.format(value)}</p>
                                <p className="text-sm text-text-tertiary">{currencyFormatterMXN.format(mxnValue)} MXN</p>
                                <p className="text-xs text-text-secondary">{name}</p>
                              </div>,
                              ''
                            ]
                          }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            border: "2px solid rgba(245, 158, 11, 0.3)",
                            borderRadius: "16px",
                            padding: "16px",
                            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.15)"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Bar Chart Comparison */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'ETFs', value: Math.max(0, investmentsByType.etf.reduce((sum, i) => sum + i.valueUSD, 0)), mxn: investmentsByType.etf.reduce((sum, i) => sum + i.valueMXN, 0), fill: '#F59E0B' },
                          { name: 'Cryptocurrencies', value: Math.max(0, investmentsByType.crypto.reduce((sum, i) => sum + i.valueUSD, 0)), mxn: investmentsByType.crypto.reduce((sum, i) => sum + i.valueMXN, 0), fill: '#A855F7' },
                          { name: 'Other', value: Math.max(0, investmentsByType.other.reduce((sum, i) => sum + i.valueUSD, 0)), mxn: investmentsByType.other.reduce((sum, i) => sum + i.valueMXN, 0), fill: '#8B5CF6' },
                        ].filter(item => item.value > 0)}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#FBBF24" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#A855F7" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#C084FC" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="barGradient3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.6}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxis 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          axisLine={{ stroke: '#d1d5db' }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                        />
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const mxnValue = props.payload?.mxn || 0
                            return [
                              <div key="tooltip" className="space-y-1">
                                <p className="font-bold">{currencyFormatter.format(value)}</p>
                                <p className="text-sm text-text-tertiary">{currencyFormatterMXN.format(mxnValue)} MXN</p>
                              </div>,
                              ''
                            ]
                          }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            border: "2px solid rgba(245, 158, 11, 0.3)",
                            borderRadius: "12px",
                            padding: "12px",
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)"
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[12, 12, 0, 0]}
                        >
                          {[
                            { name: 'ETFs', value: Math.max(0, investmentsByType.etf.reduce((sum, i) => sum + i.valueUSD, 0)), fill: 'url(#barGradient1)' },
                            { name: 'Cryptocurrencies', value: Math.max(0, investmentsByType.crypto.reduce((sum, i) => sum + i.valueUSD, 0)), fill: 'url(#barGradient2)' },
                            { name: 'Other', value: Math.max(0, investmentsByType.other.reduce((sum, i) => sum + i.valueUSD, 0)), fill: 'url(#barGradient3)' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETFs Section - Table Format */}
          {investmentsByType.etf.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-green-500 to-green-600 rounded"></div>
                ETFs
              </h3>
              <div className="panel overflow-hidden border border-gradient-orange/20">
              <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gradient-orange/5 border-b border-gradient-orange/20">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">ASSET</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">SHARES</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">PRICE/SHARE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TOTAL VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">MXN VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">%</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">ACTIONS</th>
                    </tr>
                  </thead>
                    <tbody className="divide-y divide-gradient-orange/10">
                      {investmentsByType.etf.map((inv) => {
                        const calculatedValue = (inv.quantity || 0) * (inv.pricePerShare || 0)
                        const displayValue = inv.valueUSD || calculatedValue
                        const etfTotal = investmentsByType.etf.reduce((sum, i) => {
                          const calc = (i.quantity || 0) * (i.pricePerShare || 0)
                          return sum + (i.valueUSD || calc)
                        }, 0)
                        const percentage = etfTotal > 0 ? (displayValue / etfTotal) * 100 : 0
                        
                        return (
                          <tr key={inv.id} className="hover:bg-gradient-orange/5 smooth-transition group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-text-primary">{inv.name}</span>
                              </div>
                            </td>
                            <td className="text-right px-4 py-3">
                              {inv.quantity ? (
                                <span className="text-sm text-text-primary">{inv.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>
                              ) : (
                                <span className="text-sm text-text-tertiary">—</span>
                              )}
                            </td>
                            <td className="text-right px-4 py-3">
                              {inv.pricePerShare ? (
                                <span className="text-sm text-text-primary">{currencyFormatter.format(inv.pricePerShare)}</span>
                              ) : (
                                <span className="text-sm text-text-tertiary">—</span>
                              )}
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-text-primary">{currencyFormatter.format(displayValue)}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(inv.valueMXN || displayValue * EXCHANGE_RATE)}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-green-600">{percentage.toFixed(1)}%</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                            <button
                              onClick={() => {
                                setEditingItem({ type: 'investment', id: inv.id })
                                setShowForm({ type: 'investment', visible: true })
                              }}
                                  className="text-text-tertiary hover:text-gradient-bluePurple text-xs px-2 py-1 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteInvestment(inv.id)}
                                  className="text-text-tertiary hover:text-gradient-orangeRed text-xs px-2 py-1 rounded"
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </tr>
                        )
                      })}
                      {/* Total Row */}
                      <tr className="bg-gradient-orange/10 font-semibold">
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-primary">ETFs Total</span>
                      </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-tertiary">—</span>
                      </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-tertiary">—</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-primary">{currencyFormatter.format(investmentsByType.etf.reduce((sum, i) => {
                            const calculatedValue = (i.quantity || 0) * (i.pricePerShare || 0)
                            return sum + (i.valueUSD || calculatedValue)
                          }, 0))}</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(investmentsByType.etf.reduce((sum, i) => {
                            const calculatedValue = (i.quantity || 0) * (i.pricePerShare || 0)
                            const valueUSD = i.valueUSD || calculatedValue
                            return sum + (i.valueMXN || valueUSD * EXCHANGE_RATE)
                          }, 0))}</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-green-600">100.0%</span>
                        </td>
                        <td className="px-4 py-3"></td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* Cryptocurrencies Section - Table Format */}
          {investmentsByType.crypto.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-purple-600 rounded"></div>
                Cryptocurrencies
              </h3>
              <div className="panel overflow-hidden border border-gradient-cream/20">
              <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gradient-cream/5 border-b border-gradient-cream/20">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">ASSET</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">SHARES</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">PRICE/SHARE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TOTAL VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">MXN VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">%</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">ACTIONS</th>
                    </tr>
                  </thead>
                    <tbody className="divide-y divide-gradient-cream/10">
                      {investmentsByType.crypto.map((inv) => {
                        const calculatedValue = (inv.quantity || 0) * (inv.pricePerShare || 0)
                        const displayValue = inv.valueUSD || calculatedValue
                        const cryptoTotal = investmentsByType.crypto.reduce((sum, i) => {
                          const calc = (i.quantity || 0) * (i.pricePerShare || 0)
                          return sum + (i.valueUSD || calc)
                        }, 0)
                        const percentage = cryptoTotal > 0 ? (displayValue / cryptoTotal) * 100 : 0
                        
                        return (
                          <tr key={inv.id} className="hover:bg-gradient-cream/5 smooth-transition group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-text-primary">{inv.name}</span>
                                {inv.name.toUpperCase().includes('BTC') || inv.name.toLowerCase() === 'bitcoin' ? (
                                  <span className="text-xs text-text-tertiary">(BTC)</span>
                                ) : inv.name.toUpperCase().includes('ETH') || inv.name.toLowerCase() === 'ethereum' ? (
                                  <span className="text-xs text-text-tertiary">(ETH)</span>
                                ) : inv.name.toUpperCase().includes('XRP') || inv.name.toLowerCase() === 'ripple' ? (
                                  <span className="text-xs text-text-tertiary">(XRP)</span>
                                ) : inv.name.toUpperCase().includes('DOGE') || inv.name.toLowerCase() === 'dogecoin' ? (
                                  <span className="text-xs text-text-tertiary">(DOGE)</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="text-right px-4 py-3">
                              {inv.quantity ? (
                                <span className="text-sm text-text-primary">{inv.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>
                              ) : (
                                <span className="text-sm text-text-tertiary">—</span>
                              )}
                            </td>
                            <td className="text-right px-4 py-3">
                              {inv.pricePerShare ? (
                                <span className="text-sm text-text-primary">{currencyFormatter.format(inv.pricePerShare)}</span>
                              ) : (
                                <span className="text-sm text-text-tertiary">—</span>
                              )}
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-text-primary">{currencyFormatter.format(displayValue)}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(inv.valueMXN || displayValue * EXCHANGE_RATE)}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-purple-600">{percentage.toFixed(1)}%</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                            <button
                              onClick={() => {
                                setEditingItem({ type: 'investment', id: inv.id })
                                setShowForm({ type: 'investment', visible: true })
                              }}
                                  className="text-text-tertiary hover:text-gradient-bluePurple text-xs px-2 py-1 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteInvestment(inv.id)}
                                  className="text-text-tertiary hover:text-gradient-orangeRed text-xs px-2 py-1 rounded"
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </tr>
                        )
                      })}
                      {/* Total Row */}
                      <tr className="bg-gradient-cream/10 font-semibold">
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-primary">Cryptocurrencies Total</span>
                      </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-tertiary">—</span>
                      </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-tertiary">—</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-primary">{currencyFormatter.format(investmentsByType.crypto.reduce((sum, i) => {
                            const calculatedValue = (i.quantity || 0) * (i.pricePerShare || 0)
                            return sum + (i.valueUSD || calculatedValue)
                          }, 0))}</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(investmentsByType.crypto.reduce((sum, i) => {
                            const calculatedValue = (i.quantity || 0) * (i.pricePerShare || 0)
                            const valueUSD = i.valueUSD || calculatedValue
                            return sum + (i.valueMXN || valueUSD * EXCHANGE_RATE)
                          }, 0))}</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-purple-600">100.0%</span>
                        </td>
                        <td className="px-4 py-3"></td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {investments.length === 0 && (
            <div className="panel p-12 text-center">
              <p className="text-text-tertiary text-sm mb-4">No investments yet</p>
              <button
                onClick={() => setShowForm({ type: 'investment', visible: true })}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-gradient-orangeRed/60 to-gradient-bluePurple/60 text-white hover:from-gradient-orangeRed/70 hover:to-gradient-bluePurple/70 smooth-transition"
              >
                + Add Investment
              </button>
            </div>
          )}
        </div>
      )}

      {/* Debt Section */}
      {activeSection === 'debt' && (
        <div className="space-y-6">
          {/* Net Debt Hero Card */}
          <div className={`panel p-6 border-2 ${
            summary.netDebtUSD < 0
              ? 'bg-gradient-to-br from-gradient-orangeRed/10 via-gradient-bluePurple/5 to-white border-gradient-orangeRed/30'
              : 'bg-gradient-to-br from-gradient-bluePurple/10 via-gradient-orange/5 to-white border-gradient-bluePurple/20'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-text-tertiary uppercase tracking-wider mb-1">Net Debt</p>
                <h2 className={`text-3xl font-bold ${
                  summary.netDebtUSD < 0 ? 'text-gradient-orangeRed' : 'text-text-primary'
                }`}>
                  {summary.netDebtUSD < 0 ? '-' : ''}{currencyFormatter.format(Math.abs(summary.netDebtUSD))}
                </h2>
                <p className="text-sm text-text-secondary mt-1">{currencyFormatterMXN.format(summary.netDebtMXN)} MXN</p>
              </div>
            <button
              onClick={() => setShowForm({ type: 'debt', visible: true })}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-gradient-orangeRed/60 to-gradient-bluePurple/60 text-white hover:from-gradient-orangeRed/70 hover:to-gradient-bluePurple/70 smooth-transition"
            >
              + Add Debt
            </button>
          </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gradient-orange/20">
              <div>
                <p className="text-xs text-text-tertiary mb-1">I Owe</p>
                <p className="text-lg font-semibold text-gradient-orangeRed">
                  {currencyFormatter.format(summary.totalDebtOwedUSD)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Owed to Me</p>
                <p className="text-lg font-semibold text-gradient-bluePurple">
                  {currencyFormatter.format(summary.totalDebtOwedToMeUSD)}
                </p>
              </div>
            </div>
          </div>

          {/* Debt Breakdown Chart - Enhanced */}
          {(summary.totalDebtOwedUSD > 0 || summary.totalDebtOwedToMeUSD > 0) && (
            <div className="panel p-8 bg-gradient-to-br from-white via-gradient-orangeRed/5 to-gradient-bluePurple/5 border-2 border-gradient-orangeRed/20 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-orangeRed/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-bluePurple/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                      <span className="text-2xl">💳</span>
                      I Owe vs Owed to Me
                    </h3>
                    <p className="text-sm text-text-tertiary mt-1">Overview of your debt obligations</p>
                  </div>
                  <div className={`text-right bg-white/60 backdrop-blur-sm px-4 py-3 rounded-xl border ${summary.netDebtUSD < 0 ? 'border-red-300' : 'border-gradient-bluePurple/20'}`}>
                    <p className="text-xs text-text-tertiary">Net Debt</p>
                    <p className={`text-lg font-bold ${summary.netDebtUSD < 0 ? 'text-red-600' : 'text-text-primary'}`}>
                      {summary.netDebtUSD < 0 ? '-' : ''}{currencyFormatter.format(Math.abs(summary.netDebtUSD))}
                    </p>
                    <p className="text-xs text-text-secondary">{currencyFormatterMXN.format(Math.abs(summary.netDebtMXN))} MXN</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Enhanced Donut Chart */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          <linearGradient id="oweGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#FF6B35" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#FF8C5A" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="owedGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#6366F1" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#818CF8" stopOpacity={1}/>
                          </linearGradient>
                        </defs>
                        <Pie
                          data={[
                            { name: 'I Owe', value: Math.max(0, summary.totalDebtOwedUSD), fill: 'url(#oweGradient)', mxn: summary.totalDebtOwedMXN },
                            { name: 'Owed to Me', value: Math.max(0, summary.totalDebtOwedToMeUSD), fill: 'url(#owedGradient)', mxn: summary.totalDebtOwedToMeMXN },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={8}
                          dataKey="value"
                          label={({ name }) => name}
                          labelLine={false}
                        >
                          {[
                            { name: 'I Owe', value: Math.max(0, summary.totalDebtOwedUSD), fill: 'url(#oweGradient)' },
                            { name: 'Owed to Me', value: Math.max(0, summary.totalDebtOwedToMeUSD), fill: 'url(#owedGradient)' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="#ffffff" strokeWidth={3} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const mxnValue = props.payload?.mxn || 0
                            return [
                              <div key="tooltip" className="space-y-1">
                                <p className="font-bold text-lg">{currencyFormatter.format(value)}</p>
                                <p className="text-sm text-text-tertiary">{currencyFormatterMXN.format(mxnValue)} MXN</p>
                                <p className="text-xs text-text-secondary">{name}</p>
                              </div>,
                              ''
                            ]
                          }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            border: "2px solid rgba(255, 107, 53, 0.3)",
                            borderRadius: "16px",
                            padding: "16px",
                            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.15)"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Comparison Bar Chart */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { 
                            name: 'I Owe', 
                            value: Math.max(0, summary.totalDebtOwedUSD), 
                            mxn: summary.totalDebtOwedMXN,
                            fill: '#FF6B35'
                          },
                          { 
                            name: 'Owed to Me', 
                            value: Math.max(0, summary.totalDebtOwedToMeUSD), 
                            mxn: summary.totalDebtOwedToMeMXN,
                            fill: '#6366F1'
                          },
                        ].filter(item => item.value > 0)}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient id="debtBarGradient1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#FF8C5A" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="debtBarGradient2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#818CF8" stopOpacity={0.6}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxis 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          axisLine={{ stroke: '#d1d5db' }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                        />
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const mxnValue = props.payload?.mxn || 0
                            return [
                              <div key="tooltip" className="space-y-1">
                                <p className="font-bold">{currencyFormatter.format(value)}</p>
                                <p className="text-sm text-text-tertiary">{currencyFormatterMXN.format(mxnValue)} MXN</p>
                              </div>,
                              ''
                            ]
                          }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            border: "2px solid rgba(255, 107, 53, 0.3)",
                            borderRadius: "12px",
                            padding: "12px",
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)"
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[12, 12, 0, 0]}
                        >
                          {[
                            { name: 'I Owe', value: Math.max(0, summary.totalDebtOwedUSD), fill: 'url(#debtBarGradient1)' },
                            { name: 'Owed to Me', value: Math.max(0, summary.totalDebtOwedToMeUSD), fill: 'url(#debtBarGradient2)' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`debt-bar-cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* I Owe Section - Table Format */}
          {debtIOwe.length > 0 && (
          <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-orange-500 to-red-600 rounded"></div>
                I Owe
              </h3>
              <div className="panel overflow-hidden border border-gradient-orangeRed/20">
            <div className="overflow-x-auto">
              <table className="w-full">
                    <thead className="bg-gradient-orangeRed/5 border-b border-gradient-orangeRed/20">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">ASSET</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TOTAL VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">MXN VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">%</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">ACTIONS</th>
                  </tr>
                </thead>
                    <tbody className="divide-y divide-gradient-orangeRed/10">
                      {debtIOwe.map((debt) => {
                        const iOweTotal = summary.totalDebtOwedUSD
                        const percentage = iOweTotal > 0 ? (debt.amountUSD / iOweTotal) * 100 : 0
                        
                        return (
                          <tr key={debt.id} className="hover:bg-gradient-orangeRed/5 smooth-transition group">
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-text-primary">{debt.name}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-orange-600">{currencyFormatter.format(debt.amountUSD)}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(debt.amountMXN)} MXN</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-orange-600">{percentage.toFixed(1)}%</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                          <button
                            onClick={() => {
                              setEditingItem({ type: 'debt', id: debt.id })
                              setShowForm({ type: 'debt', visible: true })
                            }}
                                  className="text-text-tertiary hover:text-gradient-bluePurple text-xs px-2 py-1 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteDebt(debt.id)}
                                  className="text-text-tertiary hover:text-gradient-orangeRed text-xs px-2 py-1 rounded"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                        )
                      })}
                      {/* Total Row */}
                      <tr className="bg-gradient-orangeRed/10 font-semibold">
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-primary">I Owe Total</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-orange-600">{currencyFormatter.format(summary.totalDebtOwedUSD)}</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(summary.totalDebtOwedMXN)} MXN</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-orange-600">100.0%</span>
                        </td>
                        <td className="px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
            </div>
          )}

          {/* Owed to Me Section - Table Format */}
          {debtOwedToMe.length > 0 && (
          <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-600 rounded"></div>
                Owed to Me
              </h3>
              <div className="panel overflow-hidden border border-gradient-bluePurple/20">
            <div className="overflow-x-auto">
              <table className="w-full">
                    <thead className="bg-gradient-bluePurple/5 border-b border-gradient-bluePurple/20">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">ASSET</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TOTAL VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">MXN VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">%</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">ACTIONS</th>
                  </tr>
                </thead>
                    <tbody className="divide-y divide-gradient-bluePurple/10">
                      {debtOwedToMe.map((debt) => {
                        const owedToMeTotal = summary.totalDebtOwedToMeUSD
                        const percentage = owedToMeTotal > 0 ? (debt.amountUSD / owedToMeTotal) * 100 : 0
                        
                        return (
                          <tr key={debt.id} className="hover:bg-gradient-bluePurple/5 smooth-transition group">
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-text-primary">{debt.name}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-purple-600">{currencyFormatter.format(debt.amountUSD)}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(debt.amountMXN)} MXN</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-purple-600">{percentage.toFixed(1)}%</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                          <button
                            onClick={() => {
                              setEditingItem({ type: 'debt', id: debt.id })
                              setShowForm({ type: 'debt', visible: true })
                            }}
                                  className="text-text-tertiary hover:text-gradient-bluePurple text-xs px-2 py-1 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteDebt(debt.id)}
                                  className="text-text-tertiary hover:text-gradient-orangeRed text-xs px-2 py-1 rounded"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                        )
                      })}
                      {/* Total Row */}
                      <tr className="bg-gradient-bluePurple/10 font-semibold">
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-primary">Owed to Me Total</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-purple-600">{currencyFormatter.format(summary.totalDebtOwedToMeUSD)}</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(summary.totalDebtOwedToMeMXN)} MXN</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-purple-600">100.0%</span>
                        </td>
                        <td className="px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
            </div>
          )}

          {debtIOwe.length === 0 && debtOwedToMe.length === 0 && (
            <div className="panel p-12 text-center">
              <p className="text-text-tertiary text-sm mb-4">No debts recorded</p>
              <button
                onClick={() => setShowForm({ type: 'debt', visible: true })}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-gradient-orangeRed/60 to-gradient-bluePurple/60 text-white hover:from-gradient-orangeRed/70 hover:to-gradient-bluePurple/70 smooth-transition"
              >
                + Add Debt
              </button>
              </div>
          )}
        </div>
      )}

      {/* Flight Training Section */}
      {activeSection === 'flight-training' && (
        <div className="space-y-6">
          {/* Total Flight Training Hero Card */}
          <div className={`panel p-6 border-2 ${
            flightTrainingUSD < 0
              ? 'bg-gradient-to-br from-gradient-purple/10 via-gradient-magenta/5 to-white border-gradient-purple/20'
              : 'bg-gradient-to-br from-gradient-purple/10 via-gradient-magenta/5 to-white border-gradient-purple/20'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-text-tertiary uppercase tracking-wider mb-1">Net Flight Training</p>
                <h2 className={`text-3xl font-bold ${flightTrainingUSD < 0 ? 'text-red-600' : 'text-text-primary'}`}>
                  {currencyFormatter.format(flightTrainingUSD)}
                </h2>
                <p className={`text-sm mt-1 ${flightTrainingMXN < 0 ? 'text-red-600' : 'text-text-secondary'}`}>
                  {currencyFormatterMXN.format(flightTrainingMXN)} MXN
                </p>
              </div>
            </div>
            {/* Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gradient-purple/20">
              <div>
                <p className="text-xs text-text-tertiary mb-1">CFI</p>
                <p className="text-lg font-semibold text-text-primary">{currencyFormatter.format(flightTrainingSummary.totalCFIUSD)}</p>
                <p className="text-xs text-text-secondary">{flightTrainingSummary.totalCFIHours.toFixed(1)} hrs</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Plane Rental</p>
                <p className="text-lg font-semibold text-text-primary">{currencyFormatter.format(flightTrainingSummary.totalPlaneRentalUSD)}</p>
                <p className="text-xs text-text-secondary">{flightTrainingSummary.totalPlaneRentalHours.toFixed(1)} hrs</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Extras</p>
                <p className="text-lg font-semibold text-text-primary">{currencyFormatter.format(flightTrainingSummary.totalExtrasUSD)}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Income</p>
                <p className="text-lg font-semibold text-green-600">{currencyFormatter.format(flightTrainingSummary.totalIncomeUSD)}</p>
              </div>
            </div>
          </div>

          {/* Flight Training Breakdown Chart - Enhanced */}
          {(flightTrainingSummary.totalCFIUSD > 0 || flightTrainingSummary.totalPlaneRentalUSD > 0 || flightTrainingSummary.totalExtrasUSD > 0 || flightTrainingSummary.totalIncomeUSD > 0) && (
            <div className="panel p-8 bg-gradient-to-br from-white via-gradient-purple/5 to-gradient-magenta/5 border-2 border-gradient-purple/20 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-purple/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-magenta/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                      <span className="text-2xl">✈️</span>
                      Flight Training Breakdown
                    </h3>
                    <p className="text-sm text-text-tertiary mt-1">Expenses and income breakdown for flight training</p>
                  </div>
                  <div className={`text-right bg-white/60 backdrop-blur-sm px-4 py-3 rounded-xl border ${flightTrainingUSD < 0 ? 'border-red-300' : 'border-gradient-purple/20'}`}>
                    <p className="text-xs text-text-tertiary">Net Total</p>
                    <p className={`text-lg font-bold ${flightTrainingUSD < 0 ? 'text-red-600' : 'text-text-primary'}`}>
                      {currencyFormatter.format(flightTrainingUSD)}
                    </p>
                    <p className="text-xs text-text-secondary">{currencyFormatterMXN.format(flightTrainingMXN)} MXN</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Donut Chart */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          <linearGradient id="cfiGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#9333EA" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#A855F7" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="planeRentalGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#7C3AED" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="extrasGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#EC4899" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#F472B6" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="incomeGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#34D399" stopOpacity={1}/>
                          </linearGradient>
                        </defs>
                        <Pie
                          data={[
                            { name: 'CFI', value: Math.abs(flightTrainingSummary.totalCFIUSD), fill: 'url(#cfiGradient)', mxn: Math.abs(flightTrainingSummary.totalCFIMXN) },
                            { name: 'Plane Rental', value: Math.abs(flightTrainingSummary.totalPlaneRentalUSD), fill: 'url(#planeRentalGradient)', mxn: Math.abs(flightTrainingSummary.totalPlaneRentalMXN) },
                            { name: 'Extras', value: Math.abs(flightTrainingSummary.totalExtrasUSD), fill: 'url(#extrasGradient)', mxn: Math.abs(flightTrainingSummary.totalExtrasMXN) },
                            { name: 'Income', value: Math.abs(flightTrainingSummary.totalIncomeUSD), fill: 'url(#incomeGradient)', mxn: Math.abs(flightTrainingSummary.totalIncomeMXN) },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={6}
                          dataKey="value"
                          label={({ name }) => name}
                          labelLine={false}
                        >
                          {[
                            { name: 'CFI', value: Math.abs(flightTrainingSummary.totalCFIUSD), fill: 'url(#cfiGradient)' },
                            { name: 'Plane Rental', value: Math.abs(flightTrainingSummary.totalPlaneRentalUSD), fill: 'url(#planeRentalGradient)' },
                            { name: 'Extras', value: Math.abs(flightTrainingSummary.totalExtrasUSD), fill: 'url(#extrasGradient)' },
                            { name: 'Income', value: Math.abs(flightTrainingSummary.totalIncomeUSD), fill: 'url(#incomeGradient)' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="#ffffff" strokeWidth={3} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const mxnValue = props.payload?.mxn || 0
                            return [
                              <div key="tooltip" className="space-y-1">
                                <p className="font-bold text-lg">{currencyFormatter.format(value)}</p>
                                <p className="text-sm text-text-tertiary">{currencyFormatterMXN.format(mxnValue)} MXN</p>
                                <p className="text-xs text-text-secondary">{name}</p>
                              </div>,
                              ''
                            ]
                          }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            border: "2px solid rgba(147, 51, 234, 0.3)",
                            borderRadius: "16px",
                            padding: "16px",
                            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.15)"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Bar Chart Comparison */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'CFI', value: Math.abs(flightTrainingSummary.totalCFIUSD), mxn: Math.abs(flightTrainingSummary.totalCFIMXN), fill: '#9333EA' },
                          { name: 'Plane Rental', value: Math.abs(flightTrainingSummary.totalPlaneRentalUSD), mxn: Math.abs(flightTrainingSummary.totalPlaneRentalMXN), fill: '#7C3AED' },
                          { name: 'Extras', value: Math.abs(flightTrainingSummary.totalExtrasUSD), mxn: Math.abs(flightTrainingSummary.totalExtrasMXN), fill: '#EC4899' },
                          { name: 'Income', value: Math.abs(flightTrainingSummary.totalIncomeUSD), mxn: Math.abs(flightTrainingSummary.totalIncomeMXN), fill: '#10B981' },
                        ].filter(item => item.value > 0)}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient id="flightBarGradient1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#9333EA" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#A855F7" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="flightBarGradient2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="flightBarGradient3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EC4899" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#F472B6" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="flightBarGradient4" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#34D399" stopOpacity={0.6}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxis 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          axisLine={{ stroke: '#d1d5db' }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                        />
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const mxnValue = props.payload?.mxn || 0
                            return [
                              <div key="tooltip" className="space-y-1">
                                <p className="font-bold">{currencyFormatter.format(value)}</p>
                                <p className="text-sm text-text-tertiary">{currencyFormatterMXN.format(mxnValue)} MXN</p>
                              </div>,
                              ''
                            ]
                          }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            border: "2px solid rgba(147, 51, 234, 0.3)",
                            borderRadius: "12px",
                            padding: "12px",
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)"
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[12, 12, 0, 0]}
                        >
                          {[
                            { name: 'CFI', value: Math.abs(flightTrainingSummary.totalCFIUSD), fill: 'url(#flightBarGradient1)' },
                            { name: 'Plane Rental', value: Math.abs(flightTrainingSummary.totalPlaneRentalUSD), fill: 'url(#flightBarGradient2)' },
                            { name: 'Extras', value: Math.abs(flightTrainingSummary.totalExtrasUSD), fill: 'url(#flightBarGradient3)' },
                            { name: 'Income', value: Math.abs(flightTrainingSummary.totalIncomeUSD), fill: 'url(#flightBarGradient4)' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`flight-bar-cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Flight Training Transactions - Tabbed Interface */}
          {(cfiTransactions.length > 0 || planeRentalTransactions.length > 0 || extrasTransactions.length > 0 || incomeTransactions.length > 0) && (
            <div className="space-y-4">
              {/* Mini Navbar */}
              <div className="flex items-center justify-between border-b border-gradient-purple/20 pb-0">
                <div className="flex items-center gap-2">
                  {[
                    { id: 'cfi', label: 'CFI', count: cfiTransactions.length },
                    { id: 'plane-rental', label: 'Plane Rental', count: planeRentalTransactions.length },
                    { id: 'others', label: 'Others', count: extrasTransactions.length },
                    { id: 'income', label: 'Income', count: incomeTransactions.length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveFlightTrainingTab(tab.id as any)
                        setFlightTrainingPage(1) // Reset to first page when switching tabs
                      }}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium smooth-transition border-b-2 ${
                        activeFlightTrainingTab === tab.id
                          ? 'border-gradient-purple text-text-primary font-semibold'
                          : 'border-transparent text-text-tertiary hover:text-text-primary hover:border-gradient-magenta/40'
                      }`}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          activeFlightTrainingTab === tab.id
                            ? 'bg-gradient-purple/20 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {/* Items Per Page Dropdown */}
                <div className="flex items-center gap-2 px-4">
                  <span className="text-xs text-text-tertiary">Show:</span>
                  <select
                    value={flightTrainingItemsPerPage}
                    onChange={(e) => {
                      setFlightTrainingItemsPerPage(e.target.value as 15 | 25 | 50 | 'all')
                      setFlightTrainingPage(1) // Reset to first page when changing items per page
                    }}
                    className="text-xs px-2 py-1 rounded border border-gradient-purple/20 bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>

              {/* CFI Tab Content */}
              {activeFlightTrainingTab === 'cfi' && cfiTransactions.length > 0 && (() => {
                const itemsPerPage = flightTrainingItemsPerPage === 'all' ? cfiTransactions.length : flightTrainingItemsPerPage
                const totalPages = Math.ceil(cfiTransactions.length / itemsPerPage)
                const startIndex = (flightTrainingPage - 1) * itemsPerPage
                const endIndex = startIndex + itemsPerPage
                const paginatedTransactions = cfiTransactions.slice(startIndex, endIndex)
                
                return (
                  <>
                    <div className="panel overflow-hidden border border-gradient-purple/20">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gradient-purple/5 border-b border-gradient-purple/20">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">ASSET</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TOTAL VALUE</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">MXN VALUE</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">%</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gradient-purple/10">
                            {paginatedTransactions.map((transaction, index) => {
                        const cfiTotal = flightTrainingSummary.totalCFIUSD
                        const percentage = cfiTotal > 0 ? (transaction.totalUSD / cfiTotal) * 100 : 0
                        const transactionNumber = startIndex + index + 1
                        
                        return (
                          <tr key={transaction.id} className="hover:bg-gradient-purple/5 smooth-transition group">
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-text-tertiary">{transactionNumber}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-text-primary">{transaction.concept}</span>
                                <span className="text-xs text-text-tertiary">Instructor {transaction.instructorId} • {transaction.hours.toFixed(2)} hrs</span>
                              </div>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-purple-600">{currencyFormatter.format(transaction.totalUSD)}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(transaction.totalMXN)} MXN</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-purple-600">{percentage.toFixed(1)}%</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                                <button
                                  onClick={() => {
                                    // TODO: Add edit functionality for CFI transactions
                                  }}
                                  className="text-text-tertiary hover:text-gradient-bluePurple text-xs px-2 py-1 rounded"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteCFI(transaction.id)}
                                  className="text-text-tertiary hover:text-gradient-orangeRed text-xs px-2 py-1 rounded"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                            })}
                            {/* Total Row */}
                            <tr className="bg-gradient-purple/10 font-semibold">
                              <td className="px-4 py-3"></td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-text-primary">CFI Total</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm text-purple-600">{currencyFormatter.format(flightTrainingSummary.totalCFIUSD)}</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(flightTrainingSummary.totalCFIMXN)} MXN</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm text-purple-600">100.0%</span>
                              </td>
                              <td className="px-4 py-3"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Pagination Controls */}
                    {flightTrainingItemsPerPage !== 'all' && totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gradient-purple/20">
                        <div className="text-sm text-text-tertiary">
                          Showing {startIndex + 1} to {Math.min(endIndex, cfiTransactions.length)} of {cfiTransactions.length} transactions
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setFlightTrainingPage(prev => Math.max(1, prev - 1))}
                            disabled={flightTrainingPage === 1}
                            className={`px-3 py-1 text-sm rounded border ${
                              flightTrainingPage === 1
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gradient-purple/20 text-text-primary hover:bg-gradient-purple/5'
                            }`}
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                              if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= flightTrainingPage - 1 && page <= flightTrainingPage + 1)
                              ) {
                                return (
                                  <button
                                    key={page}
                                    onClick={() => setFlightTrainingPage(page)}
                                    className={`px-3 py-1 text-sm rounded ${
                                      flightTrainingPage === page
                                        ? 'bg-gradient-purple text-white'
                                        : 'border border-gradient-purple/20 text-text-primary hover:bg-gradient-purple/5'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                )
                              } else if (
                                page === flightTrainingPage - 2 ||
                                page === flightTrainingPage + 2
                              ) {
                                return <span key={page} className="px-2 text-text-tertiary">...</span>
                              }
                              return null
                            })}
                          </div>
                          <button
                            onClick={() => setFlightTrainingPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={flightTrainingPage === totalPages}
                            className={`px-3 py-1 text-sm rounded border ${
                              flightTrainingPage === totalPages
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gradient-purple/20 text-text-primary hover:bg-gradient-purple/5'
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Plane Rental Tab Content */}
              {activeFlightTrainingTab === 'plane-rental' && planeRentalTransactions.length > 0 && (() => {
                const itemsPerPage = flightTrainingItemsPerPage === 'all' ? planeRentalTransactions.length : flightTrainingItemsPerPage
                const totalPages = Math.ceil(planeRentalTransactions.length / itemsPerPage)
                const startIndex = (flightTrainingPage - 1) * itemsPerPage
                const endIndex = startIndex + itemsPerPage
                const paginatedTransactions = planeRentalTransactions.slice(startIndex, endIndex)
                
                return (
                  <>
                    <div className="panel overflow-hidden border border-gradient-purple/20">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gradient-purple/5 border-b border-gradient-purple/20">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-12">#</th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">ASSET</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TOTAL VALUE</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">MXN VALUE</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">%</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gradient-purple/10">
                            {paginatedTransactions.map((transaction, index) => {
                        const planeRentalTotal = flightTrainingSummary.totalPlaneRentalUSD
                        const percentage = planeRentalTotal > 0 ? (transaction.totalUSD / planeRentalTotal) * 100 : 0
                        const transactionNumber = startIndex + index + 1
                        
                        return (
                          <tr key={transaction.id} className="hover:bg-gradient-purple/5 smooth-transition group">
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-text-tertiary">{transactionNumber}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-text-primary">{transaction.plate} • {transaction.concept}</span>
                                <span className="text-xs text-text-tertiary">{transaction.hours.toFixed(2)} hrs • IDP: {transaction.idp.toFixed(2)}</span>
                              </div>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-purple-600">{currencyFormatter.format(transaction.totalUSD)}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(transaction.totalMXN)} MXN</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-purple-600">{percentage.toFixed(1)}%</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                                <button
                                  onClick={() => {
                                    // TODO: Add edit functionality for plane rental transactions
                                  }}
                                  className="text-text-tertiary hover:text-gradient-bluePurple text-xs px-2 py-1 rounded"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deletePlaneRental(transaction.id)}
                                  className="text-text-tertiary hover:text-gradient-orangeRed text-xs px-2 py-1 rounded"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                            })}
                            {/* Total Row */}
                            <tr className="bg-gradient-purple/10 font-semibold">
                              <td className="px-4 py-3"></td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-text-primary">Plane Rental Total</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm text-purple-600">{currencyFormatter.format(flightTrainingSummary.totalPlaneRentalUSD)}</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(flightTrainingSummary.totalPlaneRentalMXN)} MXN</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm text-purple-600">100.0%</span>
                              </td>
                              <td className="px-4 py-3"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Pagination Controls */}
                    {flightTrainingItemsPerPage !== 'all' && totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gradient-purple/20">
                        <div className="text-sm text-text-tertiary">
                          Showing {startIndex + 1} to {Math.min(endIndex, planeRentalTransactions.length)} of {planeRentalTransactions.length} transactions
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setFlightTrainingPage(prev => Math.max(1, prev - 1))}
                            disabled={flightTrainingPage === 1}
                            className={`px-3 py-1 text-sm rounded border ${
                              flightTrainingPage === 1
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gradient-purple/20 text-text-primary hover:bg-gradient-purple/5'
                            }`}
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                              if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= flightTrainingPage - 1 && page <= flightTrainingPage + 1)
                              ) {
                                return (
                                  <button
                                    key={page}
                                    onClick={() => setFlightTrainingPage(page)}
                                    className={`px-3 py-1 text-sm rounded ${
                                      flightTrainingPage === page
                                        ? 'bg-gradient-purple text-white'
                                        : 'border border-gradient-purple/20 text-text-primary hover:bg-gradient-purple/5'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                )
                              } else if (
                                page === flightTrainingPage - 2 ||
                                page === flightTrainingPage + 2
                              ) {
                                return <span key={page} className="px-2 text-text-tertiary">...</span>
                              }
                              return null
                            })}
                          </div>
                          <button
                            onClick={() => setFlightTrainingPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={flightTrainingPage === totalPages}
                            className={`px-3 py-1 text-sm rounded border ${
                              flightTrainingPage === totalPages
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gradient-purple/20 text-text-primary hover:bg-gradient-purple/5'
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Others (Extras) Tab Content */}
              {activeFlightTrainingTab === 'others' && extrasTransactions.length > 0 && (() => {
                const itemsPerPage = flightTrainingItemsPerPage === 'all' ? extrasTransactions.length : flightTrainingItemsPerPage
                const totalPages = Math.ceil(extrasTransactions.length / itemsPerPage)
                const startIndex = (flightTrainingPage - 1) * itemsPerPage
                const endIndex = startIndex + itemsPerPage
                const paginatedTransactions = extrasTransactions.slice(startIndex, endIndex)
                
                return (
                  <>
                    <div className="panel overflow-hidden border border-gradient-purple/20">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gradient-purple/5 border-b border-gradient-purple/20">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-12">#</th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">ASSET</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TOTAL VALUE</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">MXN VALUE</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">%</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gradient-purple/10">
                            {paginatedTransactions.map((transaction, index) => {
                        const extrasTotal = flightTrainingSummary.totalExtrasUSD
                        const percentage = extrasTotal > 0 ? (transaction.totalUSD / extrasTotal) * 100 : 0
                        const transactionNumber = startIndex + index + 1
                        
                        return (
                          <tr key={transaction.id} className="hover:bg-gradient-purple/5 smooth-transition group">
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-text-tertiary">{transactionNumber}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-text-primary">{transaction.concept}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-purple-600">{currencyFormatter.format(transaction.totalUSD)}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(transaction.totalMXN)} MXN</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-purple-600">{percentage.toFixed(1)}%</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                                <button
                                  onClick={() => {
                                    // TODO: Add edit functionality for extras transactions
                                  }}
                                  className="text-text-tertiary hover:text-gradient-bluePurple text-xs px-2 py-1 rounded"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteExtras(transaction.id)}
                                  className="text-text-tertiary hover:text-gradient-orangeRed text-xs px-2 py-1 rounded"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                            })}
                            {/* Total Row */}
                            <tr className="bg-gradient-purple/10 font-semibold">
                              <td className="px-4 py-3"></td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-text-primary">Extras Total</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm text-purple-600">{currencyFormatter.format(flightTrainingSummary.totalExtrasUSD)}</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(flightTrainingSummary.totalExtrasMXN)} MXN</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm text-purple-600">100.0%</span>
                              </td>
                              <td className="px-4 py-3"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Pagination Controls */}
                    {flightTrainingItemsPerPage !== 'all' && totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gradient-purple/20">
                        <div className="text-sm text-text-tertiary">
                          Showing {startIndex + 1} to {Math.min(endIndex, extrasTransactions.length)} of {extrasTransactions.length} transactions
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setFlightTrainingPage(prev => Math.max(1, prev - 1))}
                            disabled={flightTrainingPage === 1}
                            className={`px-3 py-1 text-sm rounded border ${
                              flightTrainingPage === 1
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gradient-purple/20 text-text-primary hover:bg-gradient-purple/5'
                            }`}
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                              if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= flightTrainingPage - 1 && page <= flightTrainingPage + 1)
                              ) {
                                return (
                                  <button
                                    key={page}
                                    onClick={() => setFlightTrainingPage(page)}
                                    className={`px-3 py-1 text-sm rounded ${
                                      flightTrainingPage === page
                                        ? 'bg-gradient-purple text-white'
                                        : 'border border-gradient-purple/20 text-text-primary hover:bg-gradient-purple/5'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                )
                              } else if (
                                page === flightTrainingPage - 2 ||
                                page === flightTrainingPage + 2
                              ) {
                                return <span key={page} className="px-2 text-text-tertiary">...</span>
                              }
                              return null
                            })}
                          </div>
                          <button
                            onClick={() => setFlightTrainingPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={flightTrainingPage === totalPages}
                            className={`px-3 py-1 text-sm rounded border ${
                              flightTrainingPage === totalPages
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gradient-purple/20 text-text-primary hover:bg-gradient-purple/5'
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Income Tab Content */}
              {activeFlightTrainingTab === 'income' && incomeTransactions.length > 0 && (() => {
                const itemsPerPage = flightTrainingItemsPerPage === 'all' ? incomeTransactions.length : flightTrainingItemsPerPage
                const totalPages = Math.ceil(incomeTransactions.length / itemsPerPage)
                const startIndex = (flightTrainingPage - 1) * itemsPerPage
                const endIndex = startIndex + itemsPerPage
                const paginatedTransactions = incomeTransactions.slice(startIndex, endIndex)
                
                return (
                  <>
                    <div className="panel overflow-hidden border border-gradient-green/20">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gradient-green/5 border-b border-gradient-green/20">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-12">#</th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">ASSET</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TOTAL VALUE</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">MXN VALUE</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">%</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gradient-green/10">
                            {paginatedTransactions.map((transaction, index) => {
                          const incomeTotal = flightTrainingSummary.totalIncomeUSD
                          const percentage = incomeTotal > 0 ? (transaction.totalUSD / incomeTotal) * 100 : 0
                          const transactionNumber = startIndex + index + 1
                          
                          return (
                            <tr key={transaction.id} className="hover:bg-gradient-green/5 smooth-transition group">
                              <td className="px-4 py-3">
                                <span className="text-sm font-semibold text-text-tertiary">{transactionNumber}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-semibold text-text-primary">{transaction.concept}</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm font-semibold text-green-600">{currencyFormatter.format(transaction.totalUSD)}</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(transaction.totalMXN)} MXN</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm font-semibold text-green-600">{percentage.toFixed(1)}%</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                                  <button
                                    onClick={() => {
                                      // TODO: Add edit functionality for income transactions
                                    }}
                                    className="text-text-tertiary hover:text-gradient-bluePurple text-xs px-2 py-1 rounded"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteIncome(transaction.id)}
                                    className="text-text-tertiary hover:text-gradient-orangeRed text-xs px-2 py-1 rounded"
                                  >
                                    ×
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                            })}
                            {/* Total Row */}
                            <tr className="bg-gradient-green/10 font-semibold">
                              <td className="px-4 py-3"></td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-text-primary">Income Total</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm text-green-600">{currencyFormatter.format(flightTrainingSummary.totalIncomeUSD)}</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(flightTrainingSummary.totalIncomeMXN)} MXN</span>
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className="text-sm text-green-600">100.0%</span>
                              </td>
                              <td className="px-4 py-3"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Pagination Controls */}
                    {flightTrainingItemsPerPage !== 'all' && totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gradient-green/20">
                        <div className="text-sm text-text-tertiary">
                          Showing {startIndex + 1} to {Math.min(endIndex, incomeTransactions.length)} of {incomeTransactions.length} transactions
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setFlightTrainingPage(prev => Math.max(1, prev - 1))}
                            disabled={flightTrainingPage === 1}
                            className={`px-3 py-1 text-sm rounded border ${
                              flightTrainingPage === 1
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gradient-green/20 text-text-primary hover:bg-gradient-green/5'
                            }`}
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                              if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= flightTrainingPage - 1 && page <= flightTrainingPage + 1)
                              ) {
                                return (
                                  <button
                                    key={page}
                                    onClick={() => setFlightTrainingPage(page)}
                                    className={`px-3 py-1 text-sm rounded ${
                                      flightTrainingPage === page
                                        ? 'bg-gradient-green text-white'
                                        : 'border border-gradient-green/20 text-text-primary hover:bg-gradient-green/5'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                )
                              } else if (
                                page === flightTrainingPage - 2 ||
                                page === flightTrainingPage + 2
                              ) {
                                return <span key={page} className="px-2 text-text-tertiary">...</span>
                              }
                              return null
                            })}
                          </div>
                          <button
                            onClick={() => setFlightTrainingPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={flightTrainingPage === totalPages}
                            className={`px-3 py-1 text-sm rounded border ${
                              flightTrainingPage === totalPages
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gradient-green/20 text-text-primary hover:bg-gradient-green/5'
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Empty State for Active Tab */}
              {((activeFlightTrainingTab === 'cfi' && cfiTransactions.length === 0) ||
                (activeFlightTrainingTab === 'plane-rental' && planeRentalTransactions.length === 0) ||
                (activeFlightTrainingTab === 'others' && extrasTransactions.length === 0) ||
                (activeFlightTrainingTab === 'income' && incomeTransactions.length === 0)) && (
                <div className="panel p-12 text-center border border-gradient-purple/20">
                  <p className="text-text-tertiary text-sm mb-4">
                    No {activeFlightTrainingTab === 'others' ? 'extras' : activeFlightTrainingTab === 'plane-rental' ? 'plane rental' : activeFlightTrainingTab} transactions recorded
                  </p>
                </div>
              )}
            </div>
          )}

          {cfiTransactions.length === 0 && planeRentalTransactions.length === 0 && extrasTransactions.length === 0 && incomeTransactions.length === 0 && (
            <div className="panel p-12 text-center">
              <p className="text-text-tertiary text-sm mb-4">No flight training transactions recorded</p>
            </div>
          )}
        </div>
      )}

      {/* Retirement Section */}
      {activeSection === 'retirement' && (
        <div className="space-y-6">
          {/* Total Retirement Hero Card */}
          <div className="panel p-6 bg-gradient-to-br from-gradient-yellowOrange/10 via-gradient-cream/5 to-white border-2 border-gradient-yellowOrange/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-text-tertiary uppercase tracking-wider mb-1">Total Retirement</p>
                <h2 className="text-3xl font-bold text-text-primary">
                  {currencyFormatter.format(
                    summary.totalRetirementUSD + 
                    retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)
                  )}
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  {currencyFormatterMXN.format(
                    summary.totalRetirementMXN + 
                    retirementInvestments.reduce((sum, i) => sum + i.valueMXN, 0)
                  )} MXN
                </p>
              </div>
              <div className="flex gap-2">
            <button
              onClick={() => setShowForm({ type: 'retirement', visible: true })}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-gradient-orangeRed/60 to-gradient-bluePurple/60 text-white hover:from-gradient-orangeRed/70 hover:to-gradient-bluePurple/70 smooth-transition"
                >
                  + Add Retirement Account
                </button>
                <button
                  onClick={() => setShowForm({ type: 'investment', visible: true })}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary hover:border-gradient-bluePurple/40 smooth-transition"
                >
                  + Add 401K Investment
            </button>
              </div>
            </div>

            {/* Quick Breakdown */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gradient-orange/20">
              <div>
                <p className="text-xs text-text-tertiary mb-1">401K Investments</p>
                <p className="text-lg font-semibold text-text-primary">
                  {currencyFormatter.format(retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0))}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Retirement Accounts</p>
                <p className="text-lg font-semibold text-text-primary">
                  {currencyFormatter.format(summary.totalRetirementUSD)}
                </p>
              </div>
            </div>
          </div>

          {/* Retirement Breakdown Chart - Enhanced */}
          {((summary.totalRetirementUSD > 0 || retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0) > 0)) && (
            <div className="panel p-8 bg-gradient-to-br from-white via-gradient-yellowOrange/5 to-gradient-amber/5 border-2 border-gradient-yellowOrange/20 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-yellowOrange/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-amber/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                      <span className="text-2xl">🏦</span>
                      401K vs Retirement
                    </h3>
                    <p className="text-sm text-text-tertiary mt-1">Breakdown of retirement portfolio</p>
                  </div>
                  <div className="text-right bg-white/60 backdrop-blur-sm px-4 py-3 rounded-xl border border-gradient-yellowOrange/20">
                    <p className="text-xs text-text-tertiary">Total Retirement</p>
                    <p className="text-lg font-bold text-text-primary">
                      {currencyFormatter.format(
                        summary.totalRetirementUSD + 
                        retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)
                      )}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {currencyFormatterMXN.format(
                        summary.totalRetirementMXN + 
                        retirementInvestments.reduce((sum, i) => sum + i.valueMXN, 0)
                      )} MXN
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Donut Chart */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          <linearGradient id="retirement401kGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F59E0B" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#FBBF24" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="retirementAccountGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#D97706" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#F59E0B" stopOpacity={1}/>
                          </linearGradient>
                        </defs>
                        <Pie
                          data={[
                            { 
                              name: '401K', 
                              value: Math.max(0, retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)), 
                              fill: 'url(#retirement401kGradient)', 
                              mxn: retirementInvestments.reduce((sum, i) => sum + i.valueMXN, 0) 
                            },
                            { 
                              name: 'Retirement', 
                              value: Math.max(0, summary.totalRetirementUSD), 
                              fill: 'url(#retirementAccountGradient)', 
                              mxn: summary.totalRetirementMXN 
                            },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={6}
                          dataKey="value"
                          label={({ name }) => name}
                          labelLine={false}
                        >
                          {[
                            { name: '401K Investments', value: Math.max(0, retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)), fill: 'url(#retirement401kGradient)' },
                            { name: 'Retirement Accounts', value: Math.max(0, summary.totalRetirementUSD), fill: 'url(#retirementAccountGradient)' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="#ffffff" strokeWidth={3} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const mxnValue = props.payload?.mxn || 0
                            return [
                              <div key="tooltip" className="space-y-1">
                                <p className="font-bold text-lg">{currencyFormatter.format(value)}</p>
                                <p className="text-sm text-text-tertiary">{currencyFormatterMXN.format(mxnValue)} MXN</p>
                                <p className="text-xs text-text-secondary">{name}</p>
                              </div>,
                              ''
                            ]
                          }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            border: "2px solid rgba(245, 158, 11, 0.3)",
                            borderRadius: "16px",
                            padding: "16px",
                            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.15)"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Bar Chart Comparison */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { 
                            name: '401K Investments', 
                            value: Math.max(0, retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)), 
                            mxn: retirementInvestments.reduce((sum, i) => sum + i.valueMXN, 0),
                            fill: '#F59E0B'
                          },
                          { 
                            name: 'Retirement Accounts', 
                            value: Math.max(0, summary.totalRetirementUSD), 
                            mxn: summary.totalRetirementMXN,
                            fill: '#D97706'
                          },
                        ].filter(item => item.value > 0)}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient id="retirementBarGradient1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#FBBF24" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="retirementBarGradient2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#D97706" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.6}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxis 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          axisLine={{ stroke: '#d1d5db' }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                        />
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const mxnValue = props.payload?.mxn || 0
                            return [
                              <div key="tooltip" className="space-y-1">
                                <p className="font-bold">{currencyFormatter.format(value)}</p>
                                <p className="text-sm text-text-tertiary">{currencyFormatterMXN.format(mxnValue)} MXN</p>
                              </div>,
                              ''
                            ]
                          }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            border: "2px solid rgba(245, 158, 11, 0.3)",
                            borderRadius: "12px",
                            padding: "12px",
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)"
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[12, 12, 0, 0]}
                        >
                          {[
                            { name: '401K Investments', value: Math.max(0, retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)), fill: 'url(#retirementBarGradient1)' },
                            { name: 'Retirement Accounts', value: Math.max(0, summary.totalRetirementUSD), fill: 'url(#retirementBarGradient2)' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`retirement-bar-cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 401K Investments Section - Table Format */}
          {retirementInvestments.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-amber-600 rounded"></div>
                401K Investments
              </h3>
              <div className="panel overflow-hidden border border-gradient-yellowOrange/20">
          <div className="overflow-x-auto">
            <table className="w-full">
                    <thead className="bg-gradient-yellowOrange/5 border-b border-gradient-yellowOrange/20">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">ASSET</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">SHARES</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">PRICE/SHARE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TOTAL VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">MXN VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">%</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">ACTIONS</th>
                    </tr>
              </thead>
                    <tbody className="divide-y divide-gradient-yellowOrange/10">
                      {retirementInvestments.map((inv) => {
                        const retirementTotal = retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)
                        const percentage = retirementTotal > 0 ? (inv.valueUSD / retirementTotal) * 100 : 0
                        const calculatedValue = (inv.quantity || 0) * (inv.pricePerShare || 0)
                        const displayValue = inv.valueUSD || calculatedValue
                        
                        return (
                          <tr key={inv.id} className="hover:bg-gradient-yellowOrange/5 smooth-transition group">
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-text-primary">{inv.name}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              {inv.quantity ? (
                                <span className="text-sm text-text-primary">{inv.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>
                              ) : (
                                <span className="text-sm text-text-tertiary">—</span>
                              )}
                            </td>
                            <td className="text-right px-4 py-3">
                              {inv.pricePerShare ? (
                                <span className="text-sm text-text-primary">{currencyFormatter.format(inv.pricePerShare)}</span>
                              ) : (
                                <span className="text-sm text-text-tertiary">—</span>
                              )}
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-text-primary">{currencyFormatter.format(displayValue)}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(inv.valueMXN || displayValue * EXCHANGE_RATE)}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-amber-600">{percentage.toFixed(1)}%</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                                <button
                                  onClick={() => {
                                    setEditingItem({ type: 'investment', id: inv.id })
                                    setShowForm({ type: 'investment', visible: true })
                                  }}
                                  className="text-text-tertiary hover:text-gradient-bluePurple text-xs px-2 py-1 rounded"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteInvestment(inv.id)}
                                  className="text-text-tertiary hover:text-gradient-orangeRed text-xs px-2 py-1 rounded"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                </tr>
                        )
                      })}
                      {/* Total Row */}
                      <tr className="bg-gradient-yellowOrange/10 font-semibold">
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-primary">401K Investments Total</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-tertiary">—</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-tertiary">—</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-primary">
                            {currencyFormatter.format(retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0))}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-secondary">
                            {currencyFormatterMXN.format(retirementInvestments.reduce((sum, i) => sum + i.valueMXN, 0))}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-amber-600">100.0%</span>
                        </td>
                        <td className="px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
            </div>
          )}

          {/* Retirement Accounts Section - Table Format */}
          {retirementAccounts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-amber-600 rounded"></div>
                Retirement Accounts
              </h3>
              <div className="panel overflow-hidden border border-gradient-yellowOrange/20">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-yellowOrange/5 border-b border-gradient-yellowOrange/20">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">ACCOUNT</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TYPE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TOTAL VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">MXN VALUE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">%</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">ACTIONS</th>
                </tr>
                    </thead>
                    <tbody className="divide-y divide-gradient-yellowOrange/10">
                      {retirementAccounts.map((acc) => {
                        const retirementTotal = retirementAccounts.reduce((sum, a) => sum + a.valueUSD, 0)
                        const percentage = retirementTotal > 0 ? (acc.valueUSD / retirementTotal) * 100 : 0
                        
                        return (
                          <tr key={acc.id} className="hover:bg-gradient-yellowOrange/5 smooth-transition group">
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-text-primary">{acc.name}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-text-tertiary capitalize">{acc.type}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-text-primary">{currencyFormatter.format(acc.valueUSD)}</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm text-text-secondary">{currencyFormatterMXN.format(acc.valueMXN)} MXN</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <span className="text-sm font-semibold text-amber-600">{percentage.toFixed(1)}%</span>
                            </td>
                            <td className="text-right px-4 py-3">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                                <button
                                  onClick={() => {
                                    setEditingItem({ type: 'retirement', id: acc.id })
                                    setShowForm({ type: 'retirement', visible: true })
                                  }}
                                  className="text-text-tertiary hover:text-gradient-bluePurple text-xs px-2 py-1 rounded"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteRetirementAccount(acc.id)}
                                  className="text-text-tertiary hover:text-gradient-orangeRed text-xs px-2 py-1 rounded"
                                >
                                  ×
                                </button>
              </div>
                            </td>
                </tr>
                        )
                      })}
                      {/* Total Row */}
                      <tr className="bg-gradient-yellowOrange/10 font-semibold">
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-primary">Retirement Accounts Total</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-tertiary">—</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-primary">
                            {currencyFormatter.format(retirementAccounts.reduce((sum, a) => sum + a.valueUSD, 0))}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-text-secondary">
                            {currencyFormatterMXN.format(retirementAccounts.reduce((sum, a) => sum + a.valueMXN, 0))}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-sm text-amber-600">100.0%</span>
                        </td>
                        <td className="px-4 py-3"></td>
                </tr>
                    </tbody>
                  </table>
            </div>
          </div>
            </div>
          )}

          {retirementInvestments.length === 0 && retirementAccounts.length === 0 && (
            <div className="panel p-12 text-center">
              <p className="text-text-tertiary text-sm mb-4">No retirement accounts or 401K investments</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowForm({ type: 'retirement', visible: true })}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-gradient-orangeRed/60 to-gradient-bluePurple/60 text-white hover:from-gradient-orangeRed/70 hover:to-gradient-bluePurple/70 smooth-transition"
                >
                  + Add Retirement Account
                </button>
                <button
                  onClick={() => setShowForm({ type: 'investment', visible: true })}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary hover:border-gradient-bluePurple/40 smooth-transition"
                >
                  + Add 401K Investment
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Section */}
      {activeSection === 'summary' && (
        <div className="space-y-6">
          {/* Net Worth Calculations Section - Large Numbers */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-deepBlue rounded"></div>
              Net Worth Calculations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Calculation 1: Savings - Debt + Flight Training */}
              {(() => {
                const calcUSD = summary.totalSavingsUSD - Math.abs(summary.netDebtUSD) + flightTrainingUSD
                const calcMXN = summary.totalSavingsMXN - Math.abs(summary.netDebtMXN) + flightTrainingMXN
                return (
                  <div className="panel p-6 bg-gradient-to-br from-gradient-deepBlue/10 via-gradient-bluePurple/5 to-gradient-orange/5 border-2 border-gradient-deepBlue/20">
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Savings - Debt + Flight Training</p>
                    <h2 className={`text-3xl font-bold mb-1 ${calcUSD < 0 ? 'text-red-600' : 'text-text-primary'}`}>
                      {currencyFormatter.format(calcUSD)}
                    </h2>
                    <p className={`text-sm ${calcMXN < 0 ? 'text-red-600' : 'text-text-secondary'}`}>
                      {currencyFormatterMXN.format(calcMXN)} MXN
                    </p>
                  </div>
                )
              })()}
              
              {/* Calculation 2: Savings - Debt + Investments + Flight Training */}
              {(() => {
                const calcUSD = summary.totalSavingsUSD - Math.abs(summary.netDebtUSD) + summary.totalInvestmentsUSD + flightTrainingUSD
                const calcMXN = summary.totalSavingsMXN - Math.abs(summary.netDebtMXN) + summary.totalInvestmentsMXN + flightTrainingMXN
                return (
                  <div className="panel p-6 bg-gradient-to-br from-gradient-deepBlue/10 via-gradient-bluePurple/5 to-gradient-orange/5 border-2 border-gradient-deepBlue/20">
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Savings - Debt + Investments + Flight Training</p>
                    <h2 className={`text-3xl font-bold mb-1 ${calcUSD < 0 ? 'text-red-600' : 'text-text-primary'}`}>
                      {currencyFormatter.format(calcUSD)}
                    </h2>
                    <p className={`text-sm ${calcMXN < 0 ? 'text-red-600' : 'text-text-secondary'}`}>
                      {currencyFormatterMXN.format(calcMXN)} MXN
                    </p>
                  </div>
                )
              })()}
              
              {/* Calculation 3: Savings - Debt + Investments + Flight Training + Retirement */}
              {(() => {
                const calcUSD = summary.totalSavingsUSD - Math.abs(summary.netDebtUSD) + summary.totalInvestmentsUSD + flightTrainingUSD + summary.totalRetirementUSD + retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)
                const calcMXN = summary.totalSavingsMXN - Math.abs(summary.netDebtMXN) + summary.totalInvestmentsMXN + flightTrainingMXN + summary.totalRetirementMXN + retirementInvestments.reduce((sum, i) => sum + i.valueMXN, 0)
                return (
                  <div className="panel p-6 bg-gradient-to-br from-gradient-deepBlue/10 via-gradient-bluePurple/5 to-gradient-orange/5 border-2 border-gradient-deepBlue/20">
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Savings - Debt + Investments + Flight Training + Retirement</p>
                    <h2 className={`text-3xl font-bold mb-1 ${calcUSD < 0 ? 'text-red-600' : 'text-text-primary'}`}>
                      {currencyFormatter.format(calcUSD)}
                    </h2>
                    <p className={`text-sm ${calcMXN < 0 ? 'text-red-600' : 'text-text-secondary'}`}>
                      {currencyFormatterMXN.format(calcMXN)} MXN
                    </p>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Assets Section - Table Format */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-600 rounded"></div>
              Assets
            </h3>
            <div className="panel overflow-hidden border border-gradient-bluePurple/20">
          <div className="overflow-x-auto">
            <table className="w-full">
                  <thead className="bg-gradient-bluePurple/5 border-b border-gradient-bluePurple/20">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">ASSET</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">TOTAL VALUE</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">MXN VALUE</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">%</th>
                </tr>
              </thead>
                  <tbody className="divide-y divide-gradient-bluePurple/10">
                    {[
                      { 
                        name: 'Savings', 
                        value: summary.totalSavingsUSD, 
                        mxn: summary.totalSavingsMXN,
                        color: 'orange'
                      },
                      { 
                        name: 'Investments', 
                        value: summary.totalInvestmentsUSD, 
                        mxn: summary.totalInvestmentsMXN,
                        color: 'blue'
                      },
                      { 
                        name: 'Debt', 
                        value: -Math.abs(summary.netDebtUSD), 
                        mxn: -Math.abs(summary.netDebtMXN),
                        color: 'red'
                      },
                      { 
                        name: 'Flight Training', 
                        value: flightTrainingUSD, 
                        mxn: flightTrainingMXN,
                        color: 'purple'
                      },
                      { 
                        name: 'Retirement', 
                        value: summary.totalRetirementUSD + retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0), 
                        mxn: summary.totalRetirementMXN + retirementInvestments.reduce((sum, i) => sum + i.valueMXN, 0),
                        color: 'green'
                      },
                    ].map((asset) => {
                      const totalSelectedAssets = [
                        selectedAssets['Savings'] ? Math.abs(summary.totalSavingsUSD) : 0,
                        selectedAssets['Investments'] ? Math.abs(summary.totalInvestmentsUSD) : 0,
                        selectedAssets['Debt'] ? Math.abs(summary.netDebtUSD) : 0,
                        selectedAssets['Flight Training'] ? Math.abs(flightTrainingUSD) : 0,
                        selectedAssets['Retirement'] ? Math.abs(summary.totalRetirementUSD + retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)) : 0,
                      ].reduce((sum, val) => sum + val, 0)
                      const percentage = totalSelectedAssets > 0 ? (Math.abs(asset.value) / totalSelectedAssets) * 100 : 0
                      const isSelected = selectedAssets[asset.name] ?? true
                      
                      const circleColor = asset.color === 'orange' ? '#F97316' :
                                          asset.color === 'red' ? '#EF4444' :
                                          asset.color === 'purple' ? '#9333EA' :
                                          asset.color === 'amber' ? '#D97706' :
                                          asset.color === 'blue' ? '#3B82F6' :
                                          asset.color === 'green' ? '#10B981' : '#3B82F6'
                      
                      return (
                        <tr key={asset.name} className="hover:bg-gradient-bluePurple/5 smooth-transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  setSelectedAssets(prev => ({
                                    ...prev,
                                    [asset.name]: e.target.checked
                                  }))
                                }}
                                className="w-4 h-4 rounded-full border-2 cursor-pointer appearance-none focus:ring-2 focus:ring-offset-1 transition-all"
                                style={{
                                  borderColor: isSelected ? circleColor : '#9CA3AF',
                                  backgroundImage: isSelected 
                                    ? `radial-gradient(circle, white 35%, ${circleColor} 35%, ${circleColor} 100%)` 
                                    : 'none',
                                  backgroundColor: isSelected ? circleColor : 'transparent',
                                  focusRingColor: circleColor
                                }}
                              />
                              <span className="text-sm font-semibold text-text-primary uppercase">{asset.name}</span>
                            </div>
                          </td>
                          <td className="text-right px-4 py-3">
                            <span className={`text-sm font-semibold ${
                              asset.value < 0 ? 'text-red-600' : 'text-text-primary'
                            }`}>
                              {currencyFormatter.format(asset.value)}
                            </span>
                          </td>
                          <td className="text-right px-4 py-3">
                            <span className={`text-sm ${
                              asset.mxn < 0 ? 'text-red-600' : 'text-text-secondary'
                            }`}>
                              {currencyFormatterMXN.format(asset.mxn)} MXN
                            </span>
                          </td>
                          <td className="text-right px-4 py-3">
                            <span className={`text-sm font-semibold ${
                              asset.color === 'amber' ? 'text-amber-600' : 
                              asset.color === 'orange' ? 'text-orange-600' :
                              asset.color === 'red' ? 'text-red-600' :
                              asset.color === 'purple' ? 'text-purple-600' :
                              asset.color === 'blue' ? 'text-blue-600' :
                              asset.color === 'green' ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {percentage.toFixed(1)}%
                            </span>
                          </td>
                </tr>
                      )
                    })}
                    {/* Total Row - Only selected items */}
                    <tr className="bg-gradient-bluePurple/10 font-semibold">
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-primary">Selected Total</span>
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className="text-sm text-text-primary">
                          {currencyFormatter.format(
                            (selectedAssets['Savings'] ? summary.totalSavingsUSD : 0) +
                            (selectedAssets['Investments'] ? summary.totalInvestmentsUSD : 0) +
                            (selectedAssets['Retirement'] ? summary.totalRetirementUSD + retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0) : 0) +
                            (selectedAssets['Flight Training'] ? flightTrainingUSD : 0) +
                            (selectedAssets['Debt'] ? -Math.abs(summary.netDebtUSD) : 0)
                          )}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className="text-sm text-text-secondary">
                          {currencyFormatterMXN.format(
                            (selectedAssets['Savings'] ? summary.totalSavingsMXN : 0) +
                            (selectedAssets['Investments'] ? summary.totalInvestmentsMXN : 0) +
                            (selectedAssets['Retirement'] ? summary.totalRetirementMXN + retirementInvestments.reduce((sum, i) => sum + i.valueMXN, 0) : 0) +
                            (selectedAssets['Flight Training'] ? flightTrainingMXN : 0) +
                            (selectedAssets['Debt'] ? -Math.abs(summary.netDebtMXN) : 0)
                          )} MXN
                        </span>
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className="text-sm text-blue-600">100.0%</span>
                      </td>
                </tr>
              </tbody>
            </table>
              </div>
            </div>
          </div>

          {/* Asset Breakdown Chart - Enhanced */}
          {(summary.totalSavingsUSD > 0 || summary.totalInvestmentsUSD > 0 || (summary.totalRetirementUSD + retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)) > 0) && (
            <div className="panel p-8 bg-gradient-to-br from-white via-gradient-deepBlue/5 to-gradient-orange/5 border-2 border-gradient-deepBlue/20 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-deepBlue/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-orange/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                      <span className="text-2xl">📊</span>
                      Account Distribution
                    </h3>
                    <p className="text-sm text-text-tertiary mt-1">Distribution of all accounts</p>
                  </div>
                  <div className="text-right bg-white/60 backdrop-blur-sm px-4 py-3 rounded-xl border border-gradient-deepBlue/20">
                    <p className="text-xs text-text-tertiary">Selected Total</p>
                    <p className="text-lg font-bold text-text-primary">
                      {currencyFormatter.format(
                        (selectedAssets['Savings'] ? summary.totalSavingsUSD : 0) +
                        (selectedAssets['Investments'] ? summary.totalInvestmentsUSD : 0) +
                        (selectedAssets['Retirement'] ? summary.totalRetirementUSD + retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0) : 0) +
                        (selectedAssets['Flight Training'] ? flightTrainingUSD : 0) +
                        (selectedAssets['Debt'] ? -Math.abs(summary.netDebtUSD) : 0)
                      )}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {currencyFormatterMXN.format(
                        (selectedAssets['Savings'] ? summary.totalSavingsMXN : 0) +
                        (selectedAssets['Investments'] ? summary.totalInvestmentsMXN : 0) +
                        (selectedAssets['Retirement'] ? summary.totalRetirementMXN + retirementInvestments.reduce((sum, i) => sum + i.valueMXN, 0) : 0) +
                        (selectedAssets['Flight Training'] ? flightTrainingMXN : 0) +
                        (selectedAssets['Debt'] ? -Math.abs(summary.netDebtMXN) : 0)
                      )} MXN
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Donut Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          <linearGradient id="summarySavingsGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F97316" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#FB923C" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="summaryInvestmentsGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#60A5FA" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="summaryRetirementGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#34D399" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="summaryDebtGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#EF4444" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#DC2626" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="summaryFlightTrainingGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#9333EA" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#7C3AED" stopOpacity={1}/>
                          </linearGradient>
                        </defs>
                        <Pie
                          data={[
                            selectedAssets['Savings'] ? { 
                              name: 'Savings', 
                              value: Math.max(0, summary.totalSavingsUSD), 
                              fill: 'url(#summarySavingsGradient)', 
                              mxn: summary.totalSavingsMXN 
                            } : null,
                            selectedAssets['Investments'] ? { 
                              name: 'Investments', 
                              value: Math.max(0, summary.totalInvestmentsUSD), 
                              fill: 'url(#summaryInvestmentsGradient)', 
                              mxn: summary.totalInvestmentsMXN 
                            } : null,
                            selectedAssets['Debt'] ? { 
                              name: 'Debt', 
                              value: Math.abs(summary.netDebtUSD), 
                              fill: 'url(#summaryDebtGradient)', 
                              mxn: Math.abs(summary.netDebtMXN) 
                            } : null,
                            selectedAssets['Flight Training'] ? { 
                              name: 'Flight Training', 
                              value: Math.abs(flightTrainingUSD), 
                              fill: 'url(#summaryFlightTrainingGradient)', 
                              mxn: Math.abs(flightTrainingMXN) 
                            } : null,
                            selectedAssets['Retirement'] ? { 
                              name: 'Retirement', 
                              value: Math.max(0, summary.totalRetirementUSD + retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)), 
                              fill: 'url(#summaryRetirementGradient)', 
                              mxn: summary.totalRetirementMXN + retirementInvestments.reduce((sum, i) => sum + i.valueMXN, 0) 
                            } : null,
                          ].filter((item): item is NonNullable<typeof item> => item !== null && item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={6}
                          dataKey="value"
                          label={({ name }) => name}
                          labelLine={false}
                        >
                          {[
                            selectedAssets['Savings'] ? { name: 'Savings', value: Math.max(0, summary.totalSavingsUSD), fill: 'url(#summarySavingsGradient)' } : null,
                            selectedAssets['Investments'] ? { name: 'Investments', value: Math.max(0, summary.totalInvestmentsUSD), fill: 'url(#summaryInvestmentsGradient)' } : null,
                            selectedAssets['Debt'] ? { name: 'Debt', value: Math.abs(summary.netDebtUSD), fill: 'url(#summaryDebtGradient)' } : null,
                            selectedAssets['Flight Training'] ? { name: 'Flight Training', value: Math.abs(flightTrainingUSD), fill: 'url(#summaryFlightTrainingGradient)' } : null,
                            selectedAssets['Retirement'] ? { name: 'Retirement', value: Math.max(0, summary.totalRetirementUSD + retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)), fill: 'url(#summaryRetirementGradient)' } : null,
                          ].filter((item): item is NonNullable<typeof item> => item !== null && item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="#ffffff" strokeWidth={3} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const mxnValue = props.payload?.mxn || 0
                            return [
                              <div key="tooltip" className="space-y-1">
                                <p className="font-bold text-lg">{currencyFormatter.format(value)}</p>
                                <p className="text-sm text-text-tertiary">{currencyFormatterMXN.format(mxnValue)} MXN</p>
                                <p className="text-xs text-text-secondary">{name}</p>
                              </div>,
                              ''
                            ]
                          }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            border: "2px solid rgba(30, 58, 138, 0.3)",
                            borderRadius: "16px",
                            padding: "16px",
                            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.15)"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Bar Chart Comparison */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          selectedAssets['Savings'] ? { 
                            name: 'Savings', 
                            value: Math.max(0, summary.totalSavingsUSD), 
                            mxn: summary.totalSavingsMXN,
                            fill: '#F97316'
                          } : null,
                          selectedAssets['Investments'] ? { 
                            name: 'Investments', 
                            value: Math.max(0, summary.totalInvestmentsUSD), 
                            mxn: summary.totalInvestmentsMXN,
                            fill: '#3B82F6'
                          } : null,
                          selectedAssets['Debt'] ? { 
                            name: 'Debt', 
                            value: Math.abs(summary.netDebtUSD), 
                            mxn: Math.abs(summary.netDebtMXN),
                            fill: '#EF4444'
                          } : null,
                          selectedAssets['Flight Training'] ? { 
                            name: 'Flight Training', 
                            value: Math.abs(flightTrainingUSD), 
                            mxn: Math.abs(flightTrainingMXN),
                            fill: '#9333EA'
                          } : null,
                          selectedAssets['Retirement'] ? { 
                            name: 'Retirement', 
                            value: Math.max(0, summary.totalRetirementUSD + retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)), 
                            mxn: summary.totalRetirementMXN + retirementInvestments.reduce((sum, i) => sum + i.valueMXN, 0),
                            fill: '#10B981'
                          } : null,
                        ].filter((item): item is NonNullable<typeof item> => item !== null && item.value > 0)}
                        margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                      >
                        <defs>
                          <linearGradient id="summaryBarGradient1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F97316" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#FB923C" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="summaryBarGradient2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="summaryBarGradient3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#34D399" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="summaryBarGradient4" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#DC2626" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="summaryBarGradient5" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#9333EA" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.6}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                          tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                          axisLine={{ stroke: '#d1d5db' }}
                          angle={-15}
                          textAnchor="end"
                          height={60}
                  />
                  <YAxis
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          axisLine={{ stroke: '#d1d5db' }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                  />
                  <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const mxnValue = props.payload?.mxn || 0
                            return [
                              <div key="tooltip" className="space-y-1">
                                <p className="font-bold">{currencyFormatter.format(value)}</p>
                                <p className="text-sm text-text-tertiary">{currencyFormatterMXN.format(mxnValue)} MXN</p>
                              </div>,
                              ''
                            ]
                          }}
                    contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            border: "2px solid rgba(30, 58, 138, 0.3)",
                      borderRadius: "12px",
                            padding: "12px",
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)"
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[12, 12, 0, 0]}
                        >
                          {[
                            selectedAssets['Savings'] ? { name: 'Savings', value: Math.max(0, summary.totalSavingsUSD), fill: 'url(#summaryBarGradient1)' } : null,
                            selectedAssets['Investments'] ? { name: 'Investments', value: Math.max(0, summary.totalInvestmentsUSD), fill: 'url(#summaryBarGradient2)' } : null,
                            selectedAssets['Debt'] ? { name: 'Debt', value: Math.abs(summary.netDebtUSD), fill: 'url(#summaryBarGradient4)' } : null,
                            selectedAssets['Flight Training'] ? { name: 'Flight Training', value: Math.abs(flightTrainingUSD), fill: 'url(#summaryBarGradient5)' } : null,
                            selectedAssets['Retirement'] ? { name: 'Retirement', value: Math.max(0, summary.totalRetirementUSD + retirementInvestments.reduce((sum, i) => sum + i.valueUSD, 0)), fill: 'url(#summaryBarGradient3)' } : null,
                          ].filter((item): item is NonNullable<typeof item> => item !== null && item.value > 0).map((entry, index) => (
                            <Cell key={`summary-bar-cell-${index}`} fill={entry.fill} />
                          ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
                  </div>
            </div>
          </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Forms */}
      {showForm.visible && (
        <FormModal
          type={showForm.type}
          editingItem={editingItem}
          onClose={() => {
            setShowForm({ type: '', visible: false })
            setEditingItem({ type: '', id: null })
          }}
          onSave={(data) => {
            if (showForm.type === 'cash') {
              if (editingItem.id) {
                updateCash(editingItem.id, data as Partial<Cash>)
              } else {
                addCash(data as Omit<Cash, 'id' | 'createdAt' | 'updatedAt'>)
              }
            } else if (showForm.type === 'bank') {
              if (editingItem.id) {
                updateBankAccount(editingItem.id, data as Partial<BankAccount>)
              } else {
                addBankAccount(data as Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>)
              }
            } else if (showForm.type === 'investment') {
              if (editingItem.id) {
                updateInvestment(editingItem.id, data as Partial<Investment>)
              } else {
                addInvestment(data as Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>)
              }
            } else if (showForm.type === 'debt') {
              if (editingItem.id) {
                updateDebt(editingItem.id, data as Partial<Debt>)
              } else {
                addDebt(data as Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>)
              }
            } else if (showForm.type === 'retirement') {
              if (editingItem.id) {
                updateRetirementAccount(editingItem.id, data as Partial<RetirementAccount>)
              } else {
                addRetirementAccount(data as Omit<RetirementAccount, 'id' | 'createdAt' | 'updatedAt'>)
              }
            }
            setShowForm({ type: '', visible: false })
            setEditingItem({ type: '', id: null })
          }}
          existingData={
            editingItem.id
              ? showForm.type === 'cash'
                ? cash.find(c => c.id === editingItem.id)
                : showForm.type === 'bank'
                ? bankAccounts.find(b => b.id === editingItem.id)
                : showForm.type === 'investment'
                ? investments.find(i => i.id === editingItem.id)
                : showForm.type === 'debt'
                ? debts.find(d => d.id === editingItem.id)
                : retirementAccounts.find(r => r.id === editingItem.id)
              : undefined
          }
        />
      )}
    </div>
  )
}

// Exchange rate constant (should match useNetWorth.ts)
const EXCHANGE_RATE = 18.3 // MXN to USD

function FormModal({
  type,
  editingItem,
  onClose,
  onSave,
  existingData,
}: {
  type: string
  editingItem: { type: string; id: string | null }
  onClose: () => void
  onSave: (data: any) => void
  existingData?: any
}) {
  const [currencyInput, setCurrencyInput] = useState<'MXN' | 'USD'>(() => {
    // When editing, default to USD if amountUSD/balanceUSD is non-zero, otherwise MXN
    if (existingData && type === 'bank') {
      return existingData.balanceUSD > 0 ? 'USD' : 'MXN'
    }
    if (existingData && type === 'debt') {
      return existingData.amountUSD > 0 ? 'USD' : 'MXN'
    }
    return 'USD'
  })
  const [lastEditedField, setLastEditedField] = useState<'MXN' | 'USD' | null>(null)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Crypto name to ticker mapping for Yahoo Finance
  const CRYPTO_TICKER_MAP: Record<string, string> = {
    'bitcoin': 'BTC',
    'btc': 'BTC',
    'ethereum': 'ETH',
    'eth': 'ETH',
    'ripple': 'XRP',
    'xrp': 'XRP',
    'dogecoin': 'DOGE',
    'doge': 'DOGE',
    'cardano': 'ADA',
    'ada': 'ADA',
    'solana': 'SOL',
    'sol': 'SOL',
    'polkadot': 'DOT',
    'dot': 'DOT',
    'chainlink': 'LINK',
    'link': 'LINK',
    'litecoin': 'LTC',
    'ltc': 'LTC',
    'bitcoin cash': 'BCH',
    'bch': 'BCH',
    'stellar': 'XLM',
    'xlm': 'XLM',
    'uniswap': 'UNI',
    'uni': 'UNI',
    'avalanche': 'AVAX',
    'avax': 'AVAX',
    'polygon': 'MATIC',
    'matic': 'MATIC',
  }

  // Helper function to get crypto ticker
  const getCryptoTicker = (name: string): string => {
    const normalized = name.toLowerCase().trim()
    const ticker = CRYPTO_TICKER_MAP[normalized] || normalized.toUpperCase()
    return `${ticker}-USD`
  }

  // Fetch price from Yahoo Finance
  const fetchPrice = async (symbol: string, investmentType: string) => {
    if (!symbol || symbol.trim() === '') {
      setPriceError('Please enter an investment name/ticker')
      return
    }

    setFetchingPrice(true)
    setPriceError(null)

    try {
      // For crypto, use ticker mapping, for stocks/ETFs use as-is
      const ticker = investmentType === 'crypto' ? getCryptoTicker(symbol) : symbol.toUpperCase().trim()
      
      let response
      let data
      
      // Try direct fetch first
      try {
        response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }
        )
        
        if (response.ok) {
          data = await response.json()
        } else {
          throw new Error('Direct fetch failed')
        }
      } catch (corsError) {
        // If CORS fails, try with a proxy
        console.log(`Direct fetch failed, trying proxy for ${ticker}...`)
        response = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`)}`,
          {
            method: 'GET',
          }
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch price')
        }
        
        const proxyData = await response.json()
        data = JSON.parse(proxyData.contents)
      }
      
      if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
        const price = data.chart.result[0].meta.regularMarketPrice
        const quantity = formData.quantity || 0
        const totalValue = price * quantity
        const mxnValue = totalValue * EXCHANGE_RATE
        
        setFormData({
          ...formData,
          pricePerShare: price,
          valueUSD: totalValue,
          valueMXN: mxnValue
        })
        setPriceError(null)
      } else {
        throw new Error('Price not found')
      }
    } catch (error) {
      console.error('Error fetching price:', error)
      setPriceError('Could not fetch price. Please enter manually.')
    } finally {
      setFetchingPrice(false)
    }
  }

  const [formData, setFormData] = useState<any>(() => {
    if (existingData) {
      // For investments, calculate pricePerShare if not set but quantity and value exist
      if (type === 'investment' && existingData.quantity && existingData.valueUSD && !existingData.pricePerShare) {
        return {
          ...existingData,
          pricePerShare: existingData.valueUSD / existingData.quantity
        }
      }
      return existingData
    }
    if (type === 'cash') {
      return { name: '', type: 'pesos', amountMXN: 0, amountUSD: 0 }
    } else if (type === 'bank') {
      return { name: '', bankName: '', accountType: 'checking', balanceMXN: 0, balanceUSD: 0 }
    } else if (type === 'investment') {
      return { name: '', type: 'etf', quantity: 0, pricePerShare: 0, valueMXN: 0, valueUSD: 0 }
    } else if (type === 'debt') {
      return { name: '', type: 'i-owe', amountMXN: 0, amountUSD: 0 }
    } else if (type === 'retirement') {
      return { name: '', type: 'afore', valueMXN: 0, valueUSD: 0 }
    }
    return {}
  })
  
  // Separate state for quantity input to allow free-form decimal entry
  const [quantityInput, setQuantityInput] = useState<string>(() => {
    if (existingData && existingData.quantity !== undefined && existingData.quantity !== null) {
      return existingData.quantity.toString()
    }
    return ''
  })
  
  // Sync quantityInput when formData.quantity changes externally (e.g., after price fetch)
  // But only if user is not actively typing
  useEffect(() => {
    if (formData.quantity !== undefined && formData.quantity !== null && type === 'investment') {
      const currentValue = parseFloat(quantityInput)
      // Only update if the values don't match (to avoid disrupting user typing)
      if (isNaN(currentValue) || Math.abs(currentValue - formData.quantity) > 0.0001) {
        // Check if user is not in the middle of typing (e.g., doesn't end with '.')
        if (!quantityInput.endsWith('.')) {
          setQuantityInput(formData.quantity.toString())
        }
      }
    }
  }, [formData.quantity, type])

  // Auto-convert currency when user enters a value
  const handleCurrencyChange = (field: 'MXN' | 'USD', value: number) => {
    setLastEditedField(field)
    if (field === 'MXN') {
      const usdValue = value / EXCHANGE_RATE
      if (type === 'bank') {
        setFormData({ ...formData, balanceMXN: value, balanceUSD: usdValue })
      } else if (type === 'cash') {
        setFormData({ ...formData, amountMXN: value, amountUSD: usdValue })
      } else if (type === 'investment') {
        setFormData({ ...formData, valueMXN: value, valueUSD: usdValue })
      } else if (type === 'debt') {
        setFormData({ ...formData, amountMXN: value, amountUSD: usdValue })
      } else if (type === 'retirement') {
        setFormData({ ...formData, valueMXN: value, valueUSD: usdValue })
      }
    } else {
      const mxnValue = value * EXCHANGE_RATE
      if (type === 'bank') {
        setFormData({ ...formData, balanceUSD: value, balanceMXN: mxnValue })
      } else if (type === 'cash') {
        setFormData({ ...formData, amountUSD: value, amountMXN: mxnValue })
      } else if (type === 'investment') {
        setFormData({ ...formData, valueUSD: value, valueMXN: mxnValue })
      } else if (type === 'debt') {
        setFormData({ ...formData, amountUSD: value, amountMXN: mxnValue })
      } else if (type === 'retirement') {
        setFormData({ ...formData, valueUSD: value, valueMXN: mxnValue })
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const getTitle = () => {
    if (editingItem.id) return `Edit ${type}`
    return `Add ${type}`
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 panel animate-fade border border-gradient-orange/20 w-full max-w-md bg-white/90 backdrop-blur-xl shadow-xl"
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gradient-orange/10">
          <div>
          <h2 className="text-lg font-semibold text-text-primary">{getTitle()}</h2>
            {editingItem.id && existingData && (
              <p className="text-xs text-text-tertiary mt-1">
                {type === 'bank' && existingData.name && `Editing: ${existingData.name}`}
                {type === 'cash' && existingData.name && `Editing: ${existingData.name}`}
                {type === 'investment' && existingData.name && `Editing: ${existingData.name}`}
                {type === 'debt' && existingData.name && `Editing: ${existingData.name}`}
                {type === 'retirement' && existingData.name && `Editing: ${existingData.name}`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {type === 'cash' && (
            <>
              <input
                type="text"
                placeholder="Name (e.g., Pesos, Dollars)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-purple/40 focus:bg-white/80 smooth-transition"
                required
              />
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary focus:outline-none focus:border-gradient-purple/40 focus:bg-white/80 smooth-transition appearance-none cursor-pointer"
              >
                <option value="pesos">Pesos (MXN)</option>
                <option value="dollars">Dollars (USD)</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Amount in MXN"
                value={formData.amountMXN}
                onChange={(e) => setFormData({ ...formData, amountMXN: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-purple/40 focus:bg-white/80 smooth-transition"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount in USD"
                value={formData.amountUSD}
                onChange={(e) => setFormData({ ...formData, amountUSD: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-purple/40 focus:bg-white/80 smooth-transition"
                required
              />
            </>
          )}

          {type === 'bank' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Account Name</label>
              <input
                type="text"
                  placeholder="e.g., Santander Ahorros, CHASE CC"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition"
                required
              />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Bank Name</label>
              <input
                type="text"
                  placeholder="e.g., Santander, Bank of America, Chase"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition"
                required
              />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Account Type</label>
              <select
                value={formData.accountType}
                onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition appearance-none cursor-pointer"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="credit-card">Credit Card</option>
              </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Enter Balance</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setCurrencyInput('USD')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border smooth-transition ${
                      currencyInput === 'USD'
                        ? 'bg-gradient-bluePurple/20 border-gradient-bluePurple/40 text-text-primary font-semibold'
                        : 'bg-white/60 border-gradient-orange/20 text-text-secondary hover:border-gradient-bluePurple/30'
                    }`}
                  >
                    USD
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrencyInput('MXN')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border smooth-transition ${
                      currencyInput === 'MXN'
                        ? 'bg-gradient-bluePurple/20 border-gradient-bluePurple/40 text-text-primary font-semibold'
                        : 'bg-white/60 border-gradient-orange/20 text-text-secondary hover:border-gradient-bluePurple/30'
                    }`}
                  >
                    MXN
                  </button>
                </div>
                {currencyInput === 'USD' ? (
                  <div>
              <input
                type="number"
                step="0.01"
                      placeholder="Enter balance in USD"
                      value={formData.balanceUSD || ''}
                      onChange={(e) => handleCurrencyChange('USD', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition"
                required
              />
                    <p className="text-xs text-text-tertiary mt-1">
                      ≈ {currencyFormatterMXN.format(formData.balanceMXN || 0)} MXN
                    </p>
                  </div>
                ) : (
                  <div>
              <input
                type="number"
                step="0.01"
                      placeholder="Enter balance in MXN"
                      value={formData.balanceMXN || ''}
                      onChange={(e) => handleCurrencyChange('MXN', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition"
                required
              />
                    <p className="text-xs text-text-tertiary mt-1">
                      ≈ {currencyFormatter.format(formData.balanceUSD || 0)} USD
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {type === 'investment' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Investment Name</label>
              <input
                type="text"
                  placeholder="e.g., VGT, Bitcoin, AAPL"
                value={formData.name}
                onChange={(e) => {
                  const newName = e.target.value
                  setFormData({ ...formData, name: newName })
                  // Auto-fetch price for crypto when name is entered (with debounce)
                  if (formData.type === 'crypto' && newName.trim() && !fetchingPrice) {
                    // Clear previous timeout
                    if (fetchTimeoutRef.current) {
                      clearTimeout(fetchTimeoutRef.current)
                    }
                    // Set new timeout to fetch after user stops typing
                    fetchTimeoutRef.current = setTimeout(() => {
                      if (formData.type === 'crypto' && newName.trim()) {
                        fetchPrice(newName, 'crypto')
                      }
                    }, 800)
                  }
                }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition"
                required
              />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Investment Type</label>
              <select
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value
                  setFormData({ ...formData, type: newType })
                  // Auto-fetch price when switching to crypto and name is already entered
                  if (newType === 'crypto' && formData.name && formData.name.trim() && !fetchingPrice) {
                    fetchPrice(formData.name, 'crypto')
                  }
                }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition appearance-none cursor-pointer"
              >
                <option value="etf">ETF</option>
                <option value="stock">Stock</option>
                <option value="crypto">Cryptocurrency</option>
                <option value="401k">401K</option>
                <option value="other">Other</option>
              </select>
              </div>
              {(formData.type === 'etf' || formData.type === 'crypto' || formData.type === 'stock') ? (
                <>
                  {/* Price Per Share field - hidden for crypto */}
                  {formData.type !== 'crypto' && (
                    <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">Price Per Share (USD)</label>
                      <div className="flex gap-2">
                <input
                  type="number"
                          step="0.0001"
                          placeholder="Enter or fetch current price"
                          value={formData.pricePerShare || ''}
                          onChange={(e) => {
                            const price = parseFloat(e.target.value) || 0
                            const quantity = formData.quantity || 0
                            const totalValue = price * quantity
                            const mxnValue = totalValue * EXCHANGE_RATE
                            setFormData({ 
                              ...formData, 
                              pricePerShare: price,
                              valueUSD: totalValue,
                              valueMXN: mxnValue
                            })
                            setPriceError(null)
                          }}
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition"
                        />
                        <button
                          type="button"
                          onClick={() => fetchPrice(formData.name, formData.type)}
                          disabled={fetchingPrice || !formData.name}
                          className={`px-4 py-2 text-sm font-medium rounded-lg border smooth-transition ${
                            fetchingPrice || !formData.name
                              ? 'border-graphite/20 text-graphite/40 cursor-not-allowed bg-white/40'
                              : 'border-gradient-bluePurple/40 text-gradient-bluePurple hover:bg-gradient-bluePurple/10 bg-white/60'
                          }`}
                          title="Fetch current price"
                        >
                          {fetchingPrice ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            'Fetch'
                          )}
                        </button>
                      </div>
                      {priceError && (
                        <p className="text-xs text-red-500 mt-1">{priceError}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">Number of Shares</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Enter number of shares (decimals allowed, e.g., 0.0233)"
                      value={quantityInput}
                      onChange={(e) => {
                        const inputValue = e.target.value
                        
                        // Allow empty string
                        if (inputValue === '') {
                          setQuantityInput('')
                          setFormData({ 
                            ...formData, 
                            quantity: undefined,
                            valueUSD: 0,
                            valueMXN: 0
                          })
                          return
                        }
                        
                        // Allow valid decimal patterns: "0.0233", ".0233", "123.45", etc.
                        // Allow leading decimal point and multiple decimal points are not allowed
                        const decimalPattern = /^-?\d*\.?\d*$/
                        if (!decimalPattern.test(inputValue)) {
                          return // Don't update if invalid pattern
                        }
                        
                        // Update the input string immediately
                        setQuantityInput(inputValue)
                        
                        // Try to parse as float
                        const quantity = parseFloat(inputValue)
                        
                        // Only update formData if we have a valid number
                        if (!isNaN(quantity) && quantity >= 0 && inputValue !== '.' && !inputValue.endsWith('.')) {
                          const price = formData.pricePerShare || 0
                          const totalValue = price * quantity
                          const mxnValue = totalValue * EXCHANGE_RATE
                          setFormData({ 
                            ...formData, 
                            quantity: quantity,
                            valueUSD: totalValue,
                            valueMXN: mxnValue
                          })
                        } else if (inputValue === '.' || inputValue.startsWith('.')) {
                          // Allow typing decimal point, but don't calculate yet
                          // Keep the input string as is
                        }
                      }}
                      onBlur={(e) => {
                        // On blur, ensure we have a valid number
                        const inputValue = e.target.value.trim()
                        if (inputValue === '' || inputValue === '.') {
                          setQuantityInput('')
                          setFormData({ 
                            ...formData, 
                            quantity: undefined,
                            valueUSD: 0,
                            valueMXN: 0
                          })
                          return
                        }
                        const quantity = parseFloat(inputValue)
                        if (!isNaN(quantity) && quantity >= 0) {
                          // Normalize the input (e.g., ".0233" becomes "0.0233")
                          const normalizedValue = quantity.toString()
                          setQuantityInput(normalizedValue)
                          const price = formData.pricePerShare || 0
                          const totalValue = price * quantity
                          const mxnValue = totalValue * EXCHANGE_RATE
                          setFormData({ 
                            ...formData, 
                            quantity: quantity,
                            valueUSD: totalValue,
                            valueMXN: mxnValue
                          })
                        } else {
                          // Invalid input, reset
                          setQuantityInput('')
                          setFormData({ 
                            ...formData, 
                            quantity: undefined,
                            valueUSD: 0,
                            valueMXN: 0
                          })
                        }
                      }}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition"
                    />
                  </div>
                  {(formData.pricePerShare && formData.quantity) && (
                    <div className="p-3 rounded-lg bg-gradient-bluePurple/5 border border-gradient-bluePurple/20">
                      <p className="text-xs text-text-tertiary mb-1">Calculated Total Value</p>
                      <p className="text-sm font-semibold text-text-primary">
                        {currencyFormatter.format(formData.valueUSD || 0)} USD
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        {currencyFormatterMXN.format(formData.valueMXN || 0)} MXN
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">Enter Value</label>
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setCurrencyInput('USD')}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border smooth-transition ${
                          currencyInput === 'USD'
                            ? 'bg-gradient-bluePurple/20 border-gradient-bluePurple/40 text-text-primary font-semibold'
                            : 'bg-white/60 border-gradient-orange/20 text-text-secondary hover:border-gradient-bluePurple/30'
                        }`}
                      >
                        USD
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrencyInput('MXN')}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border smooth-transition ${
                          currencyInput === 'MXN'
                            ? 'bg-gradient-bluePurple/20 border-gradient-bluePurple/40 text-text-primary font-semibold'
                            : 'bg-white/60 border-gradient-orange/20 text-text-secondary hover:border-gradient-bluePurple/30'
                        }`}
                      >
                        MXN
                      </button>
                    </div>
                    {currencyInput === 'USD' ? (
                      <div>
              <input
                type="number"
                step="0.01"
                          placeholder="Enter value in USD"
                          value={formData.valueUSD || ''}
                          onChange={(e) => handleCurrencyChange('USD', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition"
                required
              />
                        <p className="text-xs text-text-tertiary mt-1">
                          ≈ {currencyFormatterMXN.format(formData.valueMXN || 0)} MXN
                        </p>
                      </div>
                    ) : (
                      <div>
              <input
                type="number"
                step="0.01"
                          placeholder="Enter value in MXN"
                          value={formData.valueMXN || ''}
                          onChange={(e) => handleCurrencyChange('MXN', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition"
                required
              />
                        <p className="text-xs text-text-tertiary mt-1">
                          ≈ {currencyFormatter.format(formData.valueUSD || 0)} USD
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {type === 'debt' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Debt Name</label>
              <input
                type="text"
                  placeholder="e.g., Sobrante de Piloto, Credit Card Balance"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition"
                required
              />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Debt Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition appearance-none cursor-pointer"
              >
                <option value="i-owe">I Owe</option>
                <option value="owed-to-me">Owed to Me</option>
              </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Enter Amount</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setCurrencyInput('USD')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border smooth-transition ${
                      currencyInput === 'USD'
                        ? 'bg-gradient-bluePurple/20 border-gradient-bluePurple/40 text-text-primary font-semibold'
                        : 'bg-white/60 border-gradient-orange/20 text-text-secondary hover:border-gradient-bluePurple/30'
                    }`}
                  >
                    USD
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrencyInput('MXN')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border smooth-transition ${
                      currencyInput === 'MXN'
                        ? 'bg-gradient-bluePurple/20 border-gradient-bluePurple/40 text-text-primary font-semibold'
                        : 'bg-white/60 border-gradient-orange/20 text-text-secondary hover:border-gradient-bluePurple/30'
                    }`}
                  >
                    MXN
                  </button>
                </div>
                {currencyInput === 'USD' ? (
                  <div>
              <input
                type="number"
                step="0.01"
                      placeholder="Enter amount in USD"
                      value={formData.amountUSD || ''}
                      onChange={(e) => handleCurrencyChange('USD', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition"
                required
              />
                    <p className="text-xs text-text-tertiary mt-1">
                      ≈ {currencyFormatterMXN.format(formData.amountMXN || 0)} MXN
                    </p>
                  </div>
                ) : (
                  <div>
              <input
                type="number"
                step="0.01"
                      placeholder="Enter amount in MXN"
                      value={formData.amountMXN || ''}
                      onChange={(e) => handleCurrencyChange('MXN', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-bluePurple/40 focus:bg-white/80 smooth-transition"
                required
              />
                    <p className="text-xs text-text-tertiary mt-1">
                      ≈ {currencyFormatter.format(formData.amountUSD || 0)} USD
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {type === 'retirement' && (
            <>
              <input
                type="text"
                placeholder="Account Name (e.g., Afore Alexis)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-purple/40 focus:bg-white/80 smooth-transition"
                required
              />
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary focus:outline-none focus:border-gradient-purple/40 focus:bg-white/80 smooth-transition appearance-none cursor-pointer"
              >
                <option value="afore">Afore</option>
                <option value="infonavit">Infonavit</option>
                <option value="401k">401K</option>
                <option value="ira">IRA</option>
                <option value="other">Other</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Value in MXN"
                value={formData.valueMXN}
                onChange={(e) => setFormData({ ...formData, valueMXN: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-purple/40 focus:bg-white/80 smooth-transition"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Value in USD"
                value={formData.valueUSD}
                onChange={(e) => setFormData({ ...formData, valueUSD: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gradient-purple/40 focus:bg-white/80 smooth-transition"
                required
              />
            </>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gradient-orange/20 bg-white/60 backdrop-blur-sm text-text-secondary hover:border-gradient-purple/40 hover:text-text-primary smooth-transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-gradient-orangeRed/70 to-gradient-bluePurple/70 text-white hover:from-gradient-orangeRed/80 hover:to-gradient-bluePurple/80 smooth-transition shadow-sm"
            >
              {editingItem.id ? 'Save Changes' : 'Add'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

