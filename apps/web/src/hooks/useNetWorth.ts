'use client'

import { useState, useEffect, useRef } from 'react'
import { BankAccount, Cash, Investment, Debt, RetirementAccount, NetWorthSummary } from '@jarvis/shared'

const BANK_ACCOUNTS_KEY = 'jarvis_bank_accounts'
const CASH_KEY = 'jarvis_cash'
const INVESTMENTS_KEY = 'jarvis_investments'
const DEBTS_KEY = 'jarvis_debts'
const RETIREMENT_KEY = 'jarvis_retirement'

// Exchange rate (you could fetch this from an API)
const EXCHANGE_RATE = 18.3 // MXN to USD

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
function getCryptoTicker(name: string): string {
  const normalized = name.toLowerCase().trim()
  const ticker = CRYPTO_TICKER_MAP[normalized] || normalized.toUpperCase()
  return `${ticker}-USD`
}

export function useNetWorth() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [cash, setCash] = useState<Cash[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [retirementAccounts, setRetirementAccounts] = useState<RetirementAccount[]>([])
  const [investmentsInitialized, setInvestmentsInitialized] = useState(false)
  const hasFetchedPricesRef = useRef(false)
  const lastInvestmentsLengthRef = useRef(0)

  useEffect(() => {
    const storedBanks = localStorage.getItem(BANK_ACCOUNTS_KEY)
    const storedCash = localStorage.getItem(CASH_KEY)
    const storedInvestments = localStorage.getItem(INVESTMENTS_KEY)
    const storedDebts = localStorage.getItem(DEBTS_KEY)
    const storedRetirement = localStorage.getItem(RETIREMENT_KEY)
    
    if (storedBanks) {
      try {
        setBankAccounts(JSON.parse(storedBanks))
      } catch (e) {
        console.error('Failed to load bank accounts:', e)
      }
    }
    
    if (storedCash) {
      try {
        setCash(JSON.parse(storedCash))
      } catch (e) {
        console.error('Failed to load cash:', e)
      }
    }
    
    if (storedInvestments) {
      try {
        const loadedInvestments = JSON.parse(storedInvestments)
        setInvestments(loadedInvestments)
        setInvestmentsInitialized(true)
        // Reset refs when loading from storage so prices can be fetched
        hasFetchedPricesRef.current = false
        lastInvestmentsLengthRef.current = loadedInvestments.length
      } catch (e) {
        console.error('Failed to load investments:', e)
        setInvestmentsInitialized(true)
      }
    } else {
      setInvestmentsInitialized(true)
    }
    
    if (storedDebts) {
      try {
        setDebts(JSON.parse(storedDebts))
      } catch (e) {
        console.error('Failed to load debts:', e)
      }
    }
    
    if (storedRetirement) {
      try {
        setRetirementAccounts(JSON.parse(storedRetirement))
      } catch (e) {
        console.error('Failed to load retirement accounts:', e)
      }
    }
  }, [])

  // Fetch and update investment prices automatically on page load
  useEffect(() => {
    // Fetch when investments are initialized and loaded
    // Also re-fetch if investments list changes (new investments added)
    if (!investmentsInitialized || investments.length === 0) return
    
    // Reset fetch flag if investments list changed (new items added)
    if (investments.length !== lastInvestmentsLengthRef.current) {
      hasFetchedPricesRef.current = false
      lastInvestmentsLengthRef.current = investments.length
    }
    
    // Only fetch once per investments list state
    if (hasFetchedPricesRef.current) return

    const fetchInvestmentPrices = async () => {
      const investmentsToUpdate = investments.filter(
        inv => {
          if (!inv.name || inv.name.trim() === '') return false
          if (inv.type !== 'etf' && inv.type !== 'stock' && inv.type !== 'crypto') return false
          
          // For crypto, always fetch price (even if quantity is 0 or missing)
          if (inv.type === 'crypto') return true
          
          // For etf/stock, only fetch if quantity > 0
          return inv.quantity && inv.quantity > 0
        }
      )

      if (investmentsToUpdate.length === 0) {
        hasFetchedPricesRef.current = true
        return
      }

      console.log(`Fetching prices for ${investmentsToUpdate.length} investments...`)

      try {
        const updatedInvestments = await Promise.all(
          investmentsToUpdate.map(async (inv) => {
            try {
              const ticker = inv.type === 'crypto' 
                ? getCryptoTicker(inv.name)
                : inv.name.toUpperCase().trim()
              
              console.log(`Fetching price for ${ticker} (${inv.name})...`)
              
              // Try Yahoo Finance API with CORS proxy as fallback
              let response
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
              } catch (corsError) {
                // If CORS fails, try with a proxy
                console.log(`Direct fetch failed, trying proxy for ${ticker}...`)
                try {
                  response = await fetch(
                    `https://api.allorigins.win/get?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`)}`,
                    {
                      method: 'GET',
                    }
                  )
                  if (response.ok) {
                    const proxyData = await response.json()
                    const data = JSON.parse(proxyData.contents)
                    
                    // Try multiple paths for price data
                    let price = null
                    if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
                      price = data.chart.result[0].meta.regularMarketPrice
                    } else if (data.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.[0]) {
                      const closePrices = data.chart.result[0].indicators.quote[0].close
                      price = closePrices[closePrices.length - 1]
                    } else if (data.chart?.result?.[0]?.meta?.previousClose) {
                      price = data.chart.result[0].meta.previousClose
                    }
                    
                    if (price && price > 0) {
                      const quantity = inv.quantity || 0
                      const newValueUSD = price * quantity
                      const newValueMXN = newValueUSD * EXCHANGE_RATE
                      console.log(`✓ ${ticker}: $${price} × ${quantity} = $${newValueUSD}`)
                      return {
                        ...inv,
                        pricePerShare: price,
                        valueUSD: newValueUSD,
                        valueMXN: newValueMXN,
                        updatedAt: new Date().toISOString(),
                      }
                    }
                  }
                } catch (proxyError) {
                  console.error(`Proxy also failed for ${ticker}:`, proxyError)
                  return inv
                }
                return inv
              }

              if (!response.ok) {
                console.error(`Failed to fetch ${ticker}: ${response.status} ${response.statusText}`)
                return inv // Return unchanged if fetch fails
              }

              const data = await response.json()
              
              // Try multiple paths for price data (Yahoo Finance API can vary)
              let price = null
              if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
                price = data.chart.result[0].meta.regularMarketPrice
              } else if (data.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.[0]) {
                // Fallback to quote data
                const closePrices = data.chart.result[0].indicators.quote[0].close
                price = closePrices[closePrices.length - 1] // Get last price
              } else if (data.chart?.result?.[0]?.meta?.previousClose) {
                price = data.chart.result[0].meta.previousClose
              }
              
              if (price && price > 0) {
                const quantity = inv.quantity || 0
                const newValueUSD = price * quantity
                const newValueMXN = newValueUSD * EXCHANGE_RATE

                console.log(`✓ ${ticker}: $${price} × ${quantity} = $${newValueUSD}`)

                return {
                  ...inv,
                  pricePerShare: price,
                  valueUSD: newValueUSD,
                  valueMXN: newValueMXN,
                  updatedAt: new Date().toISOString(),
                }
              } else {
                console.error(`No valid price data found for ${ticker}`, data)
                return inv
              }
            } catch (error) {
              console.error(`Error fetching price for ${inv.name}:`, error)
            }
            
            return inv // Return unchanged on error
          })
        )

        // Always update to ensure values are saved
        const unchangedInvestments = investments.filter(
          inv => !investmentsToUpdate.some(updateInv => updateInv.id === inv.id)
        )
        saveInvestments([...unchangedInvestments, ...updatedInvestments])
        console.log('Investment prices updated')
      } catch (error) {
        console.error('Error fetching investment prices:', error)
      } finally {
        hasFetchedPricesRef.current = true
      }
    }

    // Small delay to ensure state is settled
    const timeoutId = setTimeout(() => {
      fetchInvestmentPrices()
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [investmentsInitialized, investments.length]) // Run when investments are initialized

  const saveBanks = (newBanks: BankAccount[]) => {
    setBankAccounts(newBanks)
    localStorage.setItem(BANK_ACCOUNTS_KEY, JSON.stringify(newBanks))
  }

  const saveCash = (newCash: Cash[]) => {
    setCash(newCash)
    localStorage.setItem(CASH_KEY, JSON.stringify(newCash))
  }

  const saveInvestments = (newInvestments: Investment[]) => {
    setInvestments(newInvestments)
    localStorage.setItem(INVESTMENTS_KEY, JSON.stringify(newInvestments))
  }

  const saveDebts = (newDebts: Debt[]) => {
    setDebts(newDebts)
    localStorage.setItem(DEBTS_KEY, JSON.stringify(newDebts))
  }

  const saveRetirement = (newRetirement: RetirementAccount[]) => {
    setRetirementAccounts(newRetirement)
    localStorage.setItem(RETIREMENT_KEY, JSON.stringify(newRetirement))
  }

  const addBankAccount = (bank: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newBank: BankAccount = {
      ...bank,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveBanks([...bankAccounts, newBank])
    return newBank
  }

  const updateBankAccount = (id: string, updates: Partial<BankAccount>) => {
    const updated = bankAccounts.map(b => 
      b.id === id 
        ? { ...b, ...updates, updatedAt: new Date().toISOString() }
        : b
    )
    saveBanks(updated)
  }

  const deleteBankAccount = (id: string) => {
    saveBanks(bankAccounts.filter(b => b.id !== id))
  }

  const addCash = (cashItem: Omit<Cash, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCashItem: Cash = {
      ...cashItem,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveCash([...cash, newCashItem])
    return newCashItem
  }

  const updateCash = (id: string, updates: Partial<Cash>) => {
    const updated = cash.map(c => 
      c.id === id 
        ? { ...c, ...updates, updatedAt: new Date().toISOString() }
        : c
    )
    saveCash(updated)
  }

  const deleteCash = (id: string) => {
    saveCash(cash.filter(c => c.id !== id))
  }

  const addInvestment = (investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newInvestment: Investment = {
      ...investment,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveInvestments([...investments, newInvestment])
    return newInvestment
  }

  const updateInvestment = (id: string, updates: Partial<Investment>) => {
    const updated = investments.map(i => 
      i.id === id 
        ? { ...i, ...updates, updatedAt: new Date().toISOString() }
        : i
    )
    saveInvestments(updated)
  }

  const deleteInvestment = (id: string) => {
    saveInvestments(investments.filter(i => i.id !== id))
  }

  const addDebt = (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDebt: Debt = {
      ...debt,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveDebts([...debts, newDebt])
    return newDebt
  }

  const updateDebt = (id: string, updates: Partial<Debt>) => {
    const updated = debts.map(d => 
      d.id === id 
        ? { ...d, ...updates, updatedAt: new Date().toISOString() }
        : d
    )
    saveDebts(updated)
  }

  const deleteDebt = (id: string) => {
    saveDebts(debts.filter(d => d.id !== id))
  }

  const addRetirementAccount = (account: Omit<RetirementAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAccount: RetirementAccount = {
      ...account,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveRetirement([...retirementAccounts, newAccount])
    return newAccount
  }

  const updateRetirementAccount = (id: string, updates: Partial<RetirementAccount>) => {
    const updated = retirementAccounts.map(a => 
      a.id === id 
        ? { ...a, ...updates, updatedAt: new Date().toISOString() }
        : a
    )
    saveRetirement(updated)
  }

  const deleteRetirementAccount = (id: string) => {
    saveRetirement(retirementAccounts.filter(a => a.id !== id))
  }

  const getNetWorthSummary = (): NetWorthSummary => {
    // Cash totals
    const totalCashMXN = cash.reduce((sum, c) => sum + c.amountMXN, 0)
    const totalCashUSD = cash.reduce((sum, c) => sum + c.amountUSD, 0)

    // Bank totals
    const totalBanksMXN = bankAccounts.reduce((sum, b) => sum + b.balanceMXN, 0)
    const totalBanksUSD = bankAccounts.reduce((sum, b) => sum + b.balanceUSD, 0)

    // Total savings (cash + banks)
    const totalSavingsMXN = totalCashMXN + totalBanksMXN
    const totalSavingsUSD = totalCashUSD + totalBanksUSD

    // Investment totals
    const totalInvestmentsMXN = investments.reduce((sum, i) => sum + i.valueMXN, 0)
    const totalInvestmentsUSD = investments.reduce((sum, i) => sum + i.valueUSD, 0)

    // Debt totals
    const debtIOwe = debts.filter(d => d.type === 'i-owe')
    const debtOwedToMe = debts.filter(d => d.type === 'owed-to-me')
    
    const totalDebtOwedMXN = debtIOwe.reduce((sum, d) => sum + d.amountMXN, 0)
    const totalDebtOwedUSD = debtIOwe.reduce((sum, d) => sum + d.amountUSD, 0)
    
    const totalDebtOwedToMeMXN = debtOwedToMe.reduce((sum, d) => sum + d.amountMXN, 0)
    const totalDebtOwedToMeUSD = debtOwedToMe.reduce((sum, d) => sum + d.amountUSD, 0)

    // Net debt (what I owe - what's owed to me)
    const netDebtMXN = totalDebtOwedMXN - totalDebtOwedToMeMXN
    const netDebtUSD = totalDebtOwedUSD - totalDebtOwedToMeUSD

    // Net worth from savings (savings - debt)
    const netWorthFromSavingsMXN = totalSavingsMXN - netDebtMXN
    const netWorthFromSavingsUSD = totalSavingsUSD - netDebtUSD

    // Net worth with investments
    const netWorthWithInvestmentsMXN = netWorthFromSavingsMXN + totalInvestmentsMXN
    const netWorthWithInvestmentsUSD = netWorthFromSavingsUSD + totalInvestmentsUSD

    // Retirement totals
    const totalRetirementMXN = retirementAccounts.reduce((sum, r) => sum + r.valueMXN, 0)
    const totalRetirementUSD = retirementAccounts.reduce((sum, r) => sum + r.valueUSD, 0)

    // Total net worth
    const totalNetWorthMXN = netWorthWithInvestmentsMXN + totalRetirementMXN
    const totalNetWorthUSD = netWorthWithInvestmentsUSD + totalRetirementUSD

    return {
      totalCashMXN,
      totalCashUSD,
      totalBanksMXN,
      totalBanksUSD,
      totalSavingsMXN,
      totalSavingsUSD,
      totalInvestmentsMXN,
      totalInvestmentsUSD,
      totalDebtOwedMXN,
      totalDebtOwedUSD,
      totalDebtOwedToMeMXN,
      totalDebtOwedToMeUSD,
      netDebtMXN,
      netDebtUSD,
      netWorthFromSavingsMXN,
      netWorthFromSavingsUSD,
      netWorthWithInvestmentsMXN,
      netWorthWithInvestmentsUSD,
      totalRetirementMXN,
      totalRetirementUSD,
      totalNetWorthMXN,
      totalNetWorthUSD,
    }
  }

  const seedMockData = () => {
    const now = new Date().toISOString()

    // Mock Cash
    const mockCash: Cash[] = [
      {
        id: 'cash-1',
        name: 'Pesos',
        type: 'pesos',
        amountMXN: 0,
        amountUSD: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cash-2',
        name: 'Dolares',
        type: 'dollars',
        amountMXN: 2105.59,
        amountUSD: 115.00,
        createdAt: now,
        updatedAt: now,
      },
    ]

    // Mock Bank Accounts
    const mockBanks: BankAccount[] = [
      {
        id: 'bank-1',
        name: 'Santander Ahorros',
        bankName: 'Santander',
        accountType: 'savings',
        balanceMXN: 0,
        balanceUSD: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bank-1b',
        name: 'Santander Credit Card',
        bankName: 'Santander',
        accountType: 'credit-card',
        balanceMXN: 0,
        balanceUSD: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bank-2',
        name: 'BofA CC',
        bankName: 'Bank of America',
        accountType: 'credit-card',
        balanceMXN: 0,
        balanceUSD: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bank-3',
        name: 'BofA Ahorros',
        bankName: 'Bank of America',
        accountType: 'savings',
        balanceMXN: 0,
        balanceUSD: 150.00,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bank-4',
        name: 'SOFI',
        bankName: 'SOFI',
        accountType: 'checking',
        balanceMXN: 0,
        balanceUSD: 99.50,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bank-5',
        name: 'CHASE CC',
        bankName: 'Chase',
        accountType: 'credit-card',
        balanceMXN: 0,
        balanceUSD: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bank-6',
        name: 'CHASE Ahorros',
        bankName: 'Chase',
        accountType: 'savings',
        balanceMXN: 0,
        balanceUSD: 100.00,
        createdAt: now,
        updatedAt: now,
      },
    ]

    // Mock Investments - ETFs total should be $10,249.06 USD, Cryptos $1,323.70 USD
    const mockInvestments: Investment[] = [
      {
        id: 'inv-1',
        name: 'VGT',
        type: 'etf',
        quantity: 15,
        valueMXN: 183150.00,
        valueUSD: 10000.00,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-2',
        name: 'VOO',
        type: 'etf',
        quantity: 20,
        valueMXN: 0,
        valueUSD: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-3',
        name: 'VTI',
        type: 'etf',
        quantity: 25,
        valueMXN: 0,
        valueUSD: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-4',
        name: 'VUG',
        type: 'etf',
        quantity: 10,
        valueMXN: 0,
        valueUSD: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-5',
        name: 'FIDELITY 401K',
        type: '401k',
        quantity: 0,
        valueMXN: 457.00,
        valueUSD: 249.06,
        createdAt: now,
        updatedAt: now,
      },
      // Cryptos total should be $1,323.70 USD
      {
        id: 'inv-6',
        name: 'Bitcoin',
        type: 'crypto',
        valueMXN: 12870.00,
        valueUSD: 703.00,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-7',
        name: 'Ethereum',
        type: 'crypto',
        valueMXN: 5490.00,
        valueUSD: 300.00,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-8',
        name: 'XRP',
        type: 'crypto',
        valueMXN: 3660.00,
        valueUSD: 200.00,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-9',
        name: 'Dogecoin',
        type: 'crypto',
        valueMXN: 366.00,
        valueUSD: 20.00,
        createdAt: now,
        updatedAt: now,
      },
    ]

    // Mock Debts
    const mockDebts: Debt[] = [
      {
        id: 'debt-1',
        name: 'Sobrante de Piloto',
        type: 'i-owe',
        amountMXN: 0,
        amountUSD: 1026.71,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'debt-2',
        name: 'Deposito Renta lugar',
        type: 'owed-to-me',
        amountMXN: 0,
        amountUSD: 350.00,
        createdAt: now,
        updatedAt: now,
      },
    ]

    // Mock Retirement Accounts
    const mockRetirement: RetirementAccount[] = [
      {
        id: 'ret-1',
        name: 'Afore Alexis',
        type: 'afore',
        valueMXN: 269226.00,
        valueUSD: 14719.95,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ret-2',
        name: 'Infonavit Alexis',
        type: 'infonavit',
        valueMXN: 177000.00,
        valueUSD: 9667.22,
        createdAt: now,
        updatedAt: now,
      },
    ]

    saveCash(mockCash)
    saveBanks(mockBanks)
    saveInvestments(mockInvestments)
    saveDebts(mockDebts)
    saveRetirement(mockRetirement)
  }

  return {
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
    seedMockData,
  }
}

