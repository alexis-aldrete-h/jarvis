'use client'

import { useState, useEffect, useRef } from 'react'
import { BankAccount, Cash, Investment, Debt, RetirementAccount, NetWorthSummary } from '@jarvis/shared'
import { supabase } from '@/lib/supabase'

const BANK_ACCOUNTS_KEY = 'jarvis_bank_accounts'
const CASH_KEY = 'jarvis_cash'
const INVESTMENTS_KEY = 'jarvis_investments'
const DEBTS_KEY = 'jarvis_debts'
const RETIREMENT_KEY = 'jarvis_retirement'

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  return supabase !== null
}

// Load bank accounts from Supabase
const loadBankAccountsFromSupabase = async (): Promise<BankAccount[]> => {
  if (!isSupabaseConfigured()) return []
  try {
    const { data, error } = await supabase
      .from('finance_bank_accounts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error loading bank accounts from Supabase:', error)
      return []
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      bankName: row.bank_name,
      accountType: row.account_type as 'checking' | 'savings' | 'credit-card',
      balanceMXN: parseFloat(row.balance_mxn),
      balanceUSD: parseFloat(row.balance_usd),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error('Exception loading bank accounts from Supabase:', error)
    return []
  }
}

// Load cash from Supabase
const loadCashFromSupabase = async (): Promise<Cash[]> => {
  if (!isSupabaseConfigured()) return []
  try {
    const { data, error } = await supabase
      .from('finance_cash')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error loading cash from Supabase:', error)
      return []
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type as 'pesos' | 'dollars',
      amountMXN: parseFloat(row.amount_mxn),
      amountUSD: parseFloat(row.amount_usd),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error('Exception loading cash from Supabase:', error)
    return []
  }
}

// Load investments from Supabase
const loadInvestmentsFromSupabase = async (): Promise<Investment[]> => {
  if (!isSupabaseConfigured()) return []
  try {
    const { data, error } = await supabase
      .from('finance_investments')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error loading investments from Supabase:', error)
      return []
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type as Investment['type'],
      quantity: row.quantity ? parseFloat(row.quantity) : undefined,
      pricePerShare: row.price_per_share ? parseFloat(row.price_per_share) : undefined,
      valueMXN: parseFloat(row.value_mxn),
      valueUSD: parseFloat(row.value_usd),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error('Exception loading investments from Supabase:', error)
    return []
  }
}

// Load debts from Supabase
const loadDebtsFromSupabase = async (): Promise<Debt[]> => {
  if (!isSupabaseConfigured()) return []
  try {
    const { data, error } = await supabase
      .from('finance_debts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error loading debts from Supabase:', error)
      return []
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type as 'owed-to-me' | 'i-owe',
      amountMXN: parseFloat(row.amount_mxn),
      amountUSD: parseFloat(row.amount_usd),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error('Exception loading debts from Supabase:', error)
    return []
  }
}

// Load retirement accounts from Supabase
const loadRetirementAccountsFromSupabase = async (): Promise<RetirementAccount[]> => {
  if (!isSupabaseConfigured()) return []
  try {
    const { data, error } = await supabase
      .from('finance_retirement_accounts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error loading retirement accounts from Supabase:', error)
      return []
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type as RetirementAccount['type'],
      valueMXN: parseFloat(row.value_mxn),
      valueUSD: parseFloat(row.value_usd),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error('Exception loading retirement accounts from Supabase:', error)
    return []
  }
}

// Save bank accounts to Supabase
const saveBankAccountsToSupabase = async (bankAccounts: BankAccount[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false
  try {
    const accountsToUpsert = bankAccounts.map((b) => ({
      id: b.id,
      name: b.name,
      bank_name: b.bankName,
      account_type: b.accountType,
      balance_mxn: b.balanceMXN,
      balance_usd: b.balanceUSD,
      created_at: typeof b.createdAt === 'string' ? b.createdAt : b.createdAt.toISOString(),
      updated_at: typeof b.updatedAt === 'string' ? b.updatedAt : b.updatedAt.toISOString(),
    }))
    const currentIds = new Set(bankAccounts.map(b => b.id))
    const { data: existingData } = await supabase.from('finance_bank_accounts').select('id')
    if (existingData) {
      const orphanedIds = existingData.filter(row => !currentIds.has(row.id)).map(row => row.id)
      if (orphanedIds.length > 0) {
        await supabase.from('finance_bank_accounts').delete().in('id', orphanedIds)
      }
    }
    if (accountsToUpsert.length > 0) {
      const { error } = await supabase.from('finance_bank_accounts').upsert(accountsToUpsert, { onConflict: 'id' })
      if (error) {
        console.error('Error saving bank accounts to Supabase:', error)
        return false
      }
    } else {
      await supabase.from('finance_bank_accounts').delete().neq('id', '')
    }
    return true
  } catch (error) {
    console.error('Exception saving bank accounts to Supabase:', error)
    return false
  }
}

// Save cash to Supabase
const saveCashToSupabase = async (cash: Cash[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false
  try {
    const cashToUpsert = cash.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      amount_mxn: c.amountMXN,
      amount_usd: c.amountUSD,
      created_at: typeof c.createdAt === 'string' ? c.createdAt : c.createdAt.toISOString(),
      updated_at: typeof c.updatedAt === 'string' ? c.updatedAt : c.updatedAt.toISOString(),
    }))
    const currentIds = new Set(cash.map(c => c.id))
    const { data: existingData } = await supabase.from('finance_cash').select('id')
    if (existingData) {
      const orphanedIds = existingData.filter(row => !currentIds.has(row.id)).map(row => row.id)
      if (orphanedIds.length > 0) {
        await supabase.from('finance_cash').delete().in('id', orphanedIds)
      }
    }
    if (cashToUpsert.length > 0) {
      const { error } = await supabase.from('finance_cash').upsert(cashToUpsert, { onConflict: 'id' })
      if (error) {
        console.error('Error saving cash to Supabase:', error)
        return false
      }
    } else {
      await supabase.from('finance_cash').delete().neq('id', '')
    }
    return true
  } catch (error) {
    console.error('Exception saving cash to Supabase:', error)
    return false
  }
}

// Save investments to Supabase
const saveInvestmentsToSupabase = async (investments: Investment[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false
  try {
    const investmentsToUpsert = investments.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      quantity: i.quantity || null,
      price_per_share: i.pricePerShare || null,
      value_mxn: i.valueMXN,
      value_usd: i.valueUSD,
      created_at: typeof i.createdAt === 'string' ? i.createdAt : i.createdAt.toISOString(),
      updated_at: typeof i.updatedAt === 'string' ? i.updatedAt : i.updatedAt.toISOString(),
    }))
    const currentIds = new Set(investments.map(i => i.id))
    const { data: existingData } = await supabase.from('finance_investments').select('id')
    if (existingData) {
      const orphanedIds = existingData.filter(row => !currentIds.has(row.id)).map(row => row.id)
      if (orphanedIds.length > 0) {
        await supabase.from('finance_investments').delete().in('id', orphanedIds)
      }
    }
    if (investmentsToUpsert.length > 0) {
      const { error } = await supabase.from('finance_investments').upsert(investmentsToUpsert, { onConflict: 'id' })
      if (error) {
        console.error('Error saving investments to Supabase:', error)
        return false
      }
    } else {
      await supabase.from('finance_investments').delete().neq('id', '')
    }
    return true
  } catch (error) {
    console.error('Exception saving investments to Supabase:', error)
    return false
  }
}

// Save debts to Supabase
const saveDebtsToSupabase = async (debts: Debt[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false
  try {
    const debtsToUpsert = debts.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      amount_mxn: d.amountMXN,
      amount_usd: d.amountUSD,
      created_at: typeof d.createdAt === 'string' ? d.createdAt : d.createdAt.toISOString(),
      updated_at: typeof d.updatedAt === 'string' ? d.updatedAt : d.updatedAt.toISOString(),
    }))
    const currentIds = new Set(debts.map(d => d.id))
    const { data: existingData } = await supabase.from('finance_debts').select('id')
    if (existingData) {
      const orphanedIds = existingData.filter(row => !currentIds.has(row.id)).map(row => row.id)
      if (orphanedIds.length > 0) {
        await supabase.from('finance_debts').delete().in('id', orphanedIds)
      }
    }
    if (debtsToUpsert.length > 0) {
      const { error } = await supabase.from('finance_debts').upsert(debtsToUpsert, { onConflict: 'id' })
      if (error) {
        console.error('Error saving debts to Supabase:', error)
        return false
      }
    } else {
      await supabase.from('finance_debts').delete().neq('id', '')
    }
    return true
  } catch (error) {
    console.error('Exception saving debts to Supabase:', error)
    return false
  }
}

// Save retirement accounts to Supabase
const saveRetirementAccountsToSupabase = async (retirementAccounts: RetirementAccount[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false
  try {
    const accountsToUpsert = retirementAccounts.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      value_mxn: r.valueMXN,
      value_usd: r.valueUSD,
      created_at: typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toISOString(),
      updated_at: typeof r.updatedAt === 'string' ? r.updatedAt : r.updatedAt.toISOString(),
    }))
    const currentIds = new Set(retirementAccounts.map(r => r.id))
    const { data: existingData } = await supabase.from('finance_retirement_accounts').select('id')
    if (existingData) {
      const orphanedIds = existingData.filter(row => !currentIds.has(row.id)).map(row => row.id)
      if (orphanedIds.length > 0) {
        await supabase.from('finance_retirement_accounts').delete().in('id', orphanedIds)
      }
    }
    if (accountsToUpsert.length > 0) {
      const { error } = await supabase.from('finance_retirement_accounts').upsert(accountsToUpsert, { onConflict: 'id' })
      if (error) {
        console.error('Error saving retirement accounts to Supabase:', error)
        return false
      }
    } else {
      await supabase.from('finance_retirement_accounts').delete().neq('id', '')
    }
    return true
  } catch (error) {
    console.error('Exception saving retirement accounts to Supabase:', error)
    return false
  }
}

// Migrate localStorage data to Supabase (one-time migration)
const migrateLocalStorageToSupabase = async (): Promise<void> => {
  if (!isSupabaseConfigured()) return
  try {
    const migrationKey = 'jarvis_networth_migrated_to_supabase'
    if (localStorage.getItem(migrationKey)) return

    const storedBanks = localStorage.getItem(BANK_ACCOUNTS_KEY)
    const storedCash = localStorage.getItem(CASH_KEY)
    const storedInvestments = localStorage.getItem(INVESTMENTS_KEY)
    const storedDebts = localStorage.getItem(DEBTS_KEY)
    const storedRetirement = localStorage.getItem(RETIREMENT_KEY)

    let banksToMigrate: BankAccount[] = []
    let cashToMigrate: Cash[] = []
    let investmentsToMigrate: Investment[] = []
    let debtsToMigrate: Debt[] = []
    let retirementToMigrate: RetirementAccount[] = []

    if (storedBanks) {
      try {
        banksToMigrate = JSON.parse(storedBanks)
      } catch (e) {
        console.error('Failed to parse stored bank accounts:', e)
      }
    }
    if (storedCash) {
      try {
        cashToMigrate = JSON.parse(storedCash)
      } catch (e) {
        console.error('Failed to parse stored cash:', e)
      }
    }
    if (storedInvestments) {
      try {
        investmentsToMigrate = JSON.parse(storedInvestments)
      } catch (e) {
        console.error('Failed to parse stored investments:', e)
      }
    }
    if (storedDebts) {
      try {
        debtsToMigrate = JSON.parse(storedDebts)
      } catch (e) {
        console.error('Failed to parse stored debts:', e)
      }
    }
    if (storedRetirement) {
      try {
        retirementToMigrate = JSON.parse(storedRetirement)
      } catch (e) {
        console.error('Failed to parse stored retirement accounts:', e)
      }
    }

    if (banksToMigrate.length > 0 || cashToMigrate.length > 0 || investmentsToMigrate.length > 0 || 
        debtsToMigrate.length > 0 || retirementToMigrate.length > 0) {
      const existingBanks = await loadBankAccountsFromSupabase()
      const existingCash = await loadCashFromSupabase()
      const existingInvestments = await loadInvestmentsFromSupabase()
      const existingDebts = await loadDebtsFromSupabase()
      const existingRetirement = await loadRetirementAccountsFromSupabase()

      if (existingBanks.length === 0 && existingCash.length === 0 && existingInvestments.length === 0 &&
          existingDebts.length === 0 && existingRetirement.length === 0) {
        if (banksToMigrate.length > 0) {
          await saveBankAccountsToSupabase(banksToMigrate)
          console.log(`Migrated ${banksToMigrate.length} bank accounts to Supabase`)
        }
        if (cashToMigrate.length > 0) {
          await saveCashToSupabase(cashToMigrate)
          console.log(`Migrated ${cashToMigrate.length} cash items to Supabase`)
        }
        if (investmentsToMigrate.length > 0) {
          await saveInvestmentsToSupabase(investmentsToMigrate)
          console.log(`Migrated ${investmentsToMigrate.length} investments to Supabase`)
        }
        if (debtsToMigrate.length > 0) {
          await saveDebtsToSupabase(debtsToMigrate)
          console.log(`Migrated ${debtsToMigrate.length} debts to Supabase`)
        }
        if (retirementToMigrate.length > 0) {
          await saveRetirementAccountsToSupabase(retirementToMigrate)
          console.log(`Migrated ${retirementToMigrate.length} retirement accounts to Supabase`)
        }
      }
    }

    localStorage.setItem(migrationKey, 'true')
  } catch (error) {
    console.error('Error migrating localStorage to Supabase:', error)
  }
}

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
  const hasClearedDataRef = useRef(false)

  useEffect(() => {
    const loadData = async () => {
      // Try to migrate localStorage data first
      await migrateLocalStorageToSupabase()

      // Load from Supabase if configured, otherwise fall back to localStorage
      if (isSupabaseConfigured()) {
        const loadedBanks = await loadBankAccountsFromSupabase()
        const loadedCash = await loadCashFromSupabase()
        const loadedInvestments = await loadInvestmentsFromSupabase()
        const loadedDebts = await loadDebtsFromSupabase()
        const loadedRetirement = await loadRetirementAccountsFromSupabase()
        
        setBankAccounts(loadedBanks)
        setCash(loadedCash)
        setInvestments(loadedInvestments)
        setDebts(loadedDebts)
        setRetirementAccounts(loadedRetirement)
        setInvestmentsInitialized(true)
        hasFetchedPricesRef.current = false
        lastInvestmentsLengthRef.current = loadedInvestments.length
      } else {
        // Fallback to localStorage
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
      }
    }

    loadData()
  }, [])

  // Clear all net worth data except investments (one-time operation)
  useEffect(() => {
    if (hasClearedDataRef.current) return
    
    const clearDataOnce = async () => {
      // Wait a bit for data to load first
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Clear bank accounts
      setBankAccounts([])
      if (isSupabaseConfigured()) {
        await supabase.from('finance_bank_accounts').delete().neq('id', '')
      } else {
        localStorage.removeItem(BANK_ACCOUNTS_KEY)
      }

      // Clear cash
      setCash([])
      if (isSupabaseConfigured()) {
        await supabase.from('finance_cash').delete().neq('id', '')
      } else {
        localStorage.removeItem(CASH_KEY)
      }

      // Keep investments - DO NOT CLEAR

      // Clear debts
      setDebts([])
      if (isSupabaseConfigured()) {
        await supabase.from('finance_debts').delete().neq('id', '')
      } else {
        localStorage.removeItem(DEBTS_KEY)
      }

      // Clear retirement accounts
      setRetirementAccounts([])
      if (isSupabaseConfigured()) {
        await supabase.from('finance_retirement_accounts').delete().neq('id', '')
      } else {
        localStorage.removeItem(RETIREMENT_KEY)
      }

      hasClearedDataRef.current = true
      console.log('Cleared all net worth data except investments')
    }

    clearDataOnce()
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

  const saveBanks = async (newBanks: BankAccount[]) => {
    setBankAccounts(newBanks)
    if (isSupabaseConfigured()) {
      await saveBankAccountsToSupabase(newBanks)
    } else {
    localStorage.setItem(BANK_ACCOUNTS_KEY, JSON.stringify(newBanks))
    }
  }

  const saveCash = async (newCash: Cash[]) => {
    setCash(newCash)
    if (isSupabaseConfigured()) {
      await saveCashToSupabase(newCash)
    } else {
    localStorage.setItem(CASH_KEY, JSON.stringify(newCash))
    }
  }

  const saveInvestments = async (newInvestments: Investment[]) => {
    setInvestments(newInvestments)
    if (isSupabaseConfigured()) {
      await saveInvestmentsToSupabase(newInvestments)
    } else {
    localStorage.setItem(INVESTMENTS_KEY, JSON.stringify(newInvestments))
    }
  }

  const saveDebts = async (newDebts: Debt[]) => {
    setDebts(newDebts)
    if (isSupabaseConfigured()) {
      await saveDebtsToSupabase(newDebts)
    } else {
    localStorage.setItem(DEBTS_KEY, JSON.stringify(newDebts))
    }
  }

  const saveRetirement = async (newRetirement: RetirementAccount[]) => {
    setRetirementAccounts(newRetirement)
    if (isSupabaseConfigured()) {
      await saveRetirementAccountsToSupabase(newRetirement)
    } else {
    localStorage.setItem(RETIREMENT_KEY, JSON.stringify(newRetirement))
    }
  }

  const addBankAccount = async (bank: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newBank: BankAccount = {
      ...bank,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await saveBanks([...bankAccounts, newBank])
    return newBank
  }

  const updateBankAccount = async (id: string, updates: Partial<BankAccount>) => {
    const updated = bankAccounts.map(b => 
      b.id === id 
        ? { ...b, ...updates, updatedAt: new Date().toISOString() }
        : b
    )
    await saveBanks(updated)
  }

  const deleteBankAccount = async (id: string) => {
    await saveBanks(bankAccounts.filter(b => b.id !== id))
  }

  const addCash = async (cashItem: Omit<Cash, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCashItem: Cash = {
      ...cashItem,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await saveCash([...cash, newCashItem])
    return newCashItem
  }

  const updateCash = async (id: string, updates: Partial<Cash>) => {
    const updated = cash.map(c => 
      c.id === id 
        ? { ...c, ...updates, updatedAt: new Date().toISOString() }
        : c
    )
    await saveCash(updated)
  }

  const deleteCash = async (id: string) => {
    await saveCash(cash.filter(c => c.id !== id))
  }

  const addInvestment = async (investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newInvestment: Investment = {
      ...investment,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await saveInvestments([...investments, newInvestment])
    return newInvestment
  }

  const updateInvestment = async (id: string, updates: Partial<Investment>) => {
    const updated = investments.map(i => 
      i.id === id 
        ? { ...i, ...updates, updatedAt: new Date().toISOString() }
        : i
    )
    await saveInvestments(updated)
  }

  const deleteInvestment = async (id: string) => {
    await saveInvestments(investments.filter(i => i.id !== id))
  }

  const addDebt = async (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDebt: Debt = {
      ...debt,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await saveDebts([...debts, newDebt])
    return newDebt
  }

  const updateDebt = async (id: string, updates: Partial<Debt>) => {
    const updated = debts.map(d => 
      d.id === id 
        ? { ...d, ...updates, updatedAt: new Date().toISOString() }
        : d
    )
    await saveDebts(updated)
  }

  const deleteDebt = async (id: string) => {
    await saveDebts(debts.filter(d => d.id !== id))
  }

  const addRetirementAccount = async (account: Omit<RetirementAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAccount: RetirementAccount = {
      ...account,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await saveRetirement([...retirementAccounts, newAccount])
    return newAccount
  }

  const updateRetirementAccount = async (id: string, updates: Partial<RetirementAccount>) => {
    const updated = retirementAccounts.map(a => 
      a.id === id 
        ? { ...a, ...updates, updatedAt: new Date().toISOString() }
        : a
    )
    await saveRetirement(updated)
  }

  const deleteRetirementAccount = async (id: string) => {
    await saveRetirement(retirementAccounts.filter(a => a.id !== id))
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

  const clearAllNetWorthData = async () => {
    // Clear bank accounts
    setBankAccounts([])
    if (isSupabaseConfigured()) {
      await supabase.from('finance_bank_accounts').delete().neq('id', '')
    } else {
      localStorage.removeItem(BANK_ACCOUNTS_KEY)
    }

    // Clear cash
    setCash([])
    if (isSupabaseConfigured()) {
      await supabase.from('finance_cash').delete().neq('id', '')
    } else {
      localStorage.removeItem(CASH_KEY)
    }

    // Clear investments
    setInvestments([])
    if (isSupabaseConfigured()) {
      await supabase.from('finance_investments').delete().neq('id', '')
    } else {
      localStorage.removeItem(INVESTMENTS_KEY)
    }

    // Clear debts
    setDebts([])
    if (isSupabaseConfigured()) {
      await supabase.from('finance_debts').delete().neq('id', '')
    } else {
      localStorage.removeItem(DEBTS_KEY)
    }

    // Clear retirement accounts
    setRetirementAccounts([])
    if (isSupabaseConfigured()) {
      await supabase.from('finance_retirement_accounts').delete().neq('id', '')
    } else {
      localStorage.removeItem(RETIREMENT_KEY)
    }
  }

  const clearAllNetWorthDataExceptInvestments = async () => {
    // Clear bank accounts
    setBankAccounts([])
    if (isSupabaseConfigured()) {
      await supabase.from('finance_bank_accounts').delete().neq('id', '')
    } else {
      localStorage.removeItem(BANK_ACCOUNTS_KEY)
    }

    // Clear cash
    setCash([])
    if (isSupabaseConfigured()) {
      await supabase.from('finance_cash').delete().neq('id', '')
    } else {
      localStorage.removeItem(CASH_KEY)
    }

    // Keep investments - DO NOT CLEAR

    // Clear debts
    setDebts([])
    if (isSupabaseConfigured()) {
      await supabase.from('finance_debts').delete().neq('id', '')
    } else {
      localStorage.removeItem(DEBTS_KEY)
    }

    // Clear retirement accounts
    setRetirementAccounts([])
    if (isSupabaseConfigured()) {
      await supabase.from('finance_retirement_accounts').delete().neq('id', '')
    } else {
      localStorage.removeItem(RETIREMENT_KEY)
    }
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
    clearAllNetWorthData,
    clearAllNetWorthDataExceptInvestments,
  }
}

