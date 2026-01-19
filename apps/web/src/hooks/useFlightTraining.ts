'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  CFITransaction, 
  PlaneRentalTransaction, 
  ExtrasTransaction, 
  IncomeTransaction,
  FlightTrainingSummary 
} from '@jarvis/shared'
import { supabase } from '@/lib/supabase'

const EXCHANGE_RATE = 18.3 // MXN to USD

const CFI_KEY = 'jarvis_flight_training_cfi'
const PLANE_RENTAL_KEY = 'jarvis_flight_training_plane_rental'
const EXTRAS_KEY = 'jarvis_flight_training_extras'
const INCOME_KEY = 'jarvis_flight_training_income'

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  return supabase !== null
}

// Load CFI transactions from Supabase
const loadCFIFromSupabase = async (): Promise<CFITransaction[]> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping load from database')
    return []
  }

  try {
    console.log('Loading CFI transactions from Supabase...')
    const { data, error } = await supabase
      .from('flight_training_cfi')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error loading CFI transactions from Supabase:', error)
      return []
    }

    if (!data) {
      console.log('No CFI transactions found in Supabase')
      return []
    }

    console.log('Loaded', data.length, 'CFI transactions from Supabase')
    const transactions = data.map((row: any) => ({
      id: row.id,
      concept: row.concept,
      ratePerHour: parseFloat(row.rate_per_hour),
      hours: parseFloat(row.hours),
      totalUSD: parseFloat(row.total_usd),
      totalMXN: parseFloat(row.total_mxn),
      date: row.date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
    
    console.log('Parsed CFI transactions:', transactions)
    return transactions
  } catch (error) {
    console.error('Exception loading CFI transactions from Supabase:', error)
    return []
  }
}

// Load Plane Rental transactions from Supabase
const loadPlaneRentalFromSupabase = async (): Promise<PlaneRentalTransaction[]> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping load from database')
    return []
  }

  try {
    console.log('Loading plane rental transactions from Supabase...')
    const { data, error } = await supabase
      .from('flight_training_plane_rental')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading plane rental transactions from Supabase:', error)
      return []
    }

    if (!data) {
      console.log('No plane rental transactions found in Supabase')
      return []
    }

    console.log('Loaded', data.length, 'plane rental transactions from Supabase')
    const transactions = data.map((row: any) => ({
      id: row.id,
      plate: row.plate,
      concept: row.concept,
      totalUSD: parseFloat(row.total_usd),
      totalMXN: parseFloat(row.total_mxn),
      hours: parseFloat(row.hours),
      idp: parseFloat(row.idp || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
    
    console.log('Parsed plane rental transactions:', transactions)
    return transactions
  } catch (error) {
    console.error('Exception loading plane rental transactions from Supabase:', error)
    return []
  }
}

// Load Extras transactions from Supabase
const loadExtrasFromSupabase = async (): Promise<ExtrasTransaction[]> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping load from database')
    return []
  }

  try {
    console.log('Loading extras transactions from Supabase...')
    const { data, error } = await supabase
      .from('flight_training_extras')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error loading extras transactions from Supabase:', error)
      return []
    }

    if (!data) {
      console.log('No extras transactions found in Supabase')
      return []
    }

    console.log('Loaded', data.length, 'extras transactions from Supabase')
    const transactions = data.map((row: any) => ({
      id: row.id,
      concept: row.concept,
      totalUSD: parseFloat(row.total_usd),
      totalMXN: parseFloat(row.total_mxn),
      date: row.date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
    
    console.log('Parsed extras transactions:', transactions)
    return transactions
  } catch (error) {
    console.error('Exception loading extras transactions from Supabase:', error)
    return []
  }
}

// Save Extras transactions to Supabase
const saveExtrasToSupabase = async (transactions: ExtrasTransaction[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping save to database')
    return false
  }

  try {
    const transactionsToUpsert = transactions.map((t) => ({
      id: t.id,
      concept: t.concept,
      total_usd: t.totalUSD,
      total_mxn: t.totalMXN,
      date: (t as any).date || new Date().toISOString().split('T')[0],
      created_at: typeof t.createdAt === 'string' ? t.createdAt : t.createdAt.toISOString(),
      updated_at: typeof t.updatedAt === 'string' ? t.updatedAt : t.updatedAt.toISOString(),
    }))

    console.log('Saving extras transactions to Supabase:', transactionsToUpsert.length, 'transactions')

    const currentIds = new Set(transactions.map(t => t.id))
    const { data: existingData, error: selectError } = await supabase
      .from('flight_training_extras')
      .select('id')

    if (selectError) {
      console.error('Error fetching existing extras transactions:', selectError)
    }

    if (existingData) {
      const orphanedIds = existingData
        .filter(row => !currentIds.has(row.id))
        .map(row => row.id)

      if (orphanedIds.length > 0) {
        console.log('Deleting orphaned extras transactions:', orphanedIds.length)
        const { error: deleteError } = await supabase
          .from('flight_training_extras')
          .delete()
          .in('id', orphanedIds)
        
        if (deleteError) {
          console.error('Error deleting orphaned extras transactions:', deleteError)
        }
      }
    }

    if (transactionsToUpsert.length > 0) {
      const { error } = await supabase
        .from('flight_training_extras')
        .upsert(transactionsToUpsert, { onConflict: 'id' })

      if (error) {
        console.error('Error saving extras transactions to Supabase:', error)
        console.error('Transaction data:', transactionsToUpsert)
        return false
      }
      console.log('Successfully saved extras transactions to Supabase')
    } else {
      const { error: deleteError } = await supabase.from('flight_training_extras').delete().neq('id', '')
      if (deleteError) {
        console.error('Error clearing extras transactions:', deleteError)
      }
    }

    return true
  } catch (error) {
    console.error('Exception saving extras transactions to Supabase:', error)
    return false
  }
}

// Save Plane Rental transactions to Supabase
const savePlaneRentalToSupabase = async (transactions: PlaneRentalTransaction[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping save to database')
    return false
  }

  try {
    const transactionsToUpsert = transactions.map((t) => ({
      id: t.id,
      plate: t.plate || '',
      concept: t.concept || t.plate || '',
      total_usd: t.totalUSD,
      total_mxn: t.totalMXN,
      hours: t.hours,
      idp: t.idp || 0,
      created_at: typeof t.createdAt === 'string' ? t.createdAt : t.createdAt.toISOString(),
      updated_at: typeof t.updatedAt === 'string' ? t.updatedAt : t.updatedAt.toISOString(),
    }))

    console.log('Saving plane rental transactions to Supabase:', transactionsToUpsert.length, 'transactions')

    const currentIds = new Set(transactions.map(t => t.id))
    const { data: existingData, error: selectError } = await supabase
      .from('flight_training_plane_rental')
      .select('id')

    if (selectError) {
      console.error('Error fetching existing plane rental transactions:', selectError)
    }

    if (existingData) {
      const orphanedIds = existingData
        .filter(row => !currentIds.has(row.id))
        .map(row => row.id)

      if (orphanedIds.length > 0) {
        console.log('Deleting orphaned plane rental transactions:', orphanedIds.length)
        const { error: deleteError } = await supabase
          .from('flight_training_plane_rental')
          .delete()
          .in('id', orphanedIds)
        
        if (deleteError) {
          console.error('Error deleting orphaned plane rental transactions:', deleteError)
        }
      }
    }

    if (transactionsToUpsert.length > 0) {
      const { error } = await supabase
        .from('flight_training_plane_rental')
        .upsert(transactionsToUpsert, { onConflict: 'id' })

      if (error) {
        console.error('Error saving plane rental transactions to Supabase:', error)
        console.error('Transaction data:', transactionsToUpsert)
        return false
      }
      console.log('Successfully saved plane rental transactions to Supabase')
    } else {
      const { error: deleteError } = await supabase.from('flight_training_plane_rental').delete().neq('id', '')
      if (deleteError) {
        console.error('Error clearing plane rental transactions:', deleteError)
      }
    }

    return true
  } catch (error) {
    console.error('Exception saving plane rental transactions to Supabase:', error)
    return false
  }
}

// Save CFI transactions to Supabase
const saveCFIToSupabase = async (transactions: CFITransaction[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping save to database')
    return false
  }

  try {
    const transactionsToUpsert = transactions.map((t) => ({
      id: t.id,
      concept: t.concept,
      rate_per_hour: t.ratePerHour,
      hours: t.hours,
      total_usd: t.totalUSD,
      total_mxn: t.totalMXN,
      date: t.date || new Date().toISOString().split('T')[0], // Ensure date is set
      created_at: typeof t.createdAt === 'string' ? t.createdAt : t.createdAt.toISOString(),
      updated_at: typeof t.updatedAt === 'string' ? t.updatedAt : t.updatedAt.toISOString(),
    }))

    console.log('Saving CFI transactions to Supabase:', transactionsToUpsert.length, 'transactions')

    const currentIds = new Set(transactions.map(t => t.id))
    const { data: existingData, error: selectError } = await supabase
      .from('flight_training_cfi')
      .select('id')

    if (selectError) {
      console.error('Error fetching existing CFI transactions:', selectError)
    }

    if (existingData) {
      const orphanedIds = existingData
        .filter(row => !currentIds.has(row.id))
        .map(row => row.id)

      if (orphanedIds.length > 0) {
        console.log('Deleting orphaned CFI transactions:', orphanedIds.length)
        const { error: deleteError } = await supabase
          .from('flight_training_cfi')
          .delete()
          .in('id', orphanedIds)
        
        if (deleteError) {
          console.error('Error deleting orphaned CFI transactions:', deleteError)
        }
      }
    }

    if (transactionsToUpsert.length > 0) {
      const { error } = await supabase
        .from('flight_training_cfi')
        .upsert(transactionsToUpsert, { onConflict: 'id' })

      if (error) {
        console.error('Error saving CFI transactions to Supabase:', error)
        console.error('Transaction data:', transactionsToUpsert)
        return false
      }
      console.log('Successfully saved CFI transactions to Supabase')
    } else {
      const { error: deleteError } = await supabase.from('flight_training_cfi').delete().neq('id', '')
      if (deleteError) {
        console.error('Error clearing CFI transactions:', deleteError)
      }
    }

    return true
  } catch (error) {
    console.error('Exception saving CFI transactions to Supabase:', error)
    return false
  }
}

export function useFlightTraining() {
  const [cfiTransactions, setCfiTransactions] = useState<CFITransaction[]>([])
  const [planeRentalTransactions, setPlaneRentalTransactions] = useState<PlaneRentalTransaction[]>([])
  const [extrasTransactions, setExtrasTransactions] = useState<ExtrasTransaction[]>([])
  const [incomeTransactions, setIncomeTransactions] = useState<IncomeTransaction[]>([])

  useEffect(() => {
    const loadData = async () => {
      // Try to load from Supabase first
      if (isSupabaseConfigured()) {
        try {
          const cfiData = await loadCFIFromSupabase()
          if (cfiData.length > 0) {
            console.log('Setting CFI transactions from Supabase:', cfiData.length)
            setCfiTransactions(cfiData)
            // Still load other transaction types from localStorage if needed
          } else {
            console.log('No CFI data from Supabase, checking localStorage...')
            // Fallback to localStorage if Supabase is empty
            const storedCFI = localStorage.getItem(CFI_KEY)
            if (storedCFI) {
              try {
                const parsed = JSON.parse(storedCFI)
                console.log('Loading CFI transactions from localStorage:', parsed.length)
                setCfiTransactions(parsed)
              } catch (e) {
                console.error('Failed to load CFI transactions from localStorage:', e)
              }
            }
          }
        } catch (e) {
          console.error('Failed to load CFI transactions from Supabase:', e)
          // Fallback to localStorage on error
          const storedCFI = localStorage.getItem(CFI_KEY)
          if (storedCFI) {
            try {
              setCfiTransactions(JSON.parse(storedCFI))
            } catch (parseError) {
              console.error('Failed to parse CFI transactions from localStorage:', parseError)
            }
          }
        }
      } else {
        // Supabase not configured, use localStorage
        console.log('Supabase not configured, loading from localStorage')
    const storedCFI = localStorage.getItem(CFI_KEY)
    if (storedCFI) {
      try {
        setCfiTransactions(JSON.parse(storedCFI))
      } catch (e) {
        console.error('Failed to load CFI transactions:', e)
      }
    }
      }

      // Try to load plane rental from Supabase
      if (isSupabaseConfigured()) {
        try {
          const planeRentalData = await loadPlaneRentalFromSupabase()
          if (planeRentalData.length > 0) {
            console.log('Setting plane rental transactions from Supabase:', planeRentalData.length)
            setPlaneRentalTransactions(planeRentalData)
          } else {
            console.log('No plane rental data from Supabase, checking localStorage...')
            // Fallback to localStorage if Supabase is empty
            const storedPlaneRental = localStorage.getItem(PLANE_RENTAL_KEY)
            if (storedPlaneRental) {
              try {
                const parsed = JSON.parse(storedPlaneRental)
                console.log('Loading plane rental transactions from localStorage:', parsed.length)
                setPlaneRentalTransactions(parsed)
              } catch (e) {
                console.error('Failed to load plane rental transactions from localStorage:', e)
              }
            }
          }
        } catch (e) {
          console.error('Failed to load plane rental transactions from Supabase:', e)
          // Fallback to localStorage on error
          const storedPlaneRental = localStorage.getItem(PLANE_RENTAL_KEY)
          if (storedPlaneRental) {
            try {
              setPlaneRentalTransactions(JSON.parse(storedPlaneRental))
            } catch (parseError) {
              console.error('Failed to parse plane rental transactions from localStorage:', parseError)
            }
          }
        }
      } else {
        // Supabase not configured, use localStorage
        const storedPlaneRental = localStorage.getItem(PLANE_RENTAL_KEY)
    if (storedPlaneRental) {
      try {
        setPlaneRentalTransactions(JSON.parse(storedPlaneRental))
      } catch (e) {
        console.error('Failed to load plane rental transactions:', e)
      }
    }
      }

      // Try to load extras from Supabase
      if (isSupabaseConfigured()) {
        try {
          const extrasData = await loadExtrasFromSupabase()
          if (extrasData.length > 0) {
            console.log('Setting extras transactions from Supabase:', extrasData.length)
            setExtrasTransactions(extrasData)
          } else {
            console.log('No extras data from Supabase, checking localStorage...')
            // Fallback to localStorage if Supabase is empty
            const storedExtras = localStorage.getItem(EXTRAS_KEY)
            if (storedExtras) {
              try {
                const parsed = JSON.parse(storedExtras)
                console.log('Loading extras transactions from localStorage:', parsed.length)
                setExtrasTransactions(parsed)
              } catch (e) {
                console.error('Failed to load extras transactions from localStorage:', e)
              }
            }
          }
        } catch (e) {
          console.error('Failed to load extras transactions from Supabase:', e)
          // Fallback to localStorage on error
          const storedExtras = localStorage.getItem(EXTRAS_KEY)
          if (storedExtras) {
            try {
              setExtrasTransactions(JSON.parse(storedExtras))
            } catch (parseError) {
              console.error('Failed to parse extras transactions from localStorage:', parseError)
            }
          }
        }
      } else {
        // Supabase not configured, use localStorage
        const storedExtras = localStorage.getItem(EXTRAS_KEY)
    if (storedExtras) {
      try {
        setExtrasTransactions(JSON.parse(storedExtras))
      } catch (e) {
        console.error('Failed to load extras transactions:', e)
      }
    }
      }

      // Load other transaction types from localStorage (they don't have Supabase support yet)
      const storedIncome = localStorage.getItem(INCOME_KEY)
    
    if (storedIncome) {
      try {
        setIncomeTransactions(JSON.parse(storedIncome))
      } catch (e) {
        console.error('Failed to load income transactions:', e)
      }
    }
    }

    loadData()
  }, [])

  const saveCFI = async (transactions: CFITransaction[]) => {
    setCfiTransactions(transactions)
    localStorage.setItem(CFI_KEY, JSON.stringify(transactions))
    
    if (isSupabaseConfigured()) {
      await saveCFIToSupabase(transactions)
    }
  }

  const savePlaneRental = async (transactions: PlaneRentalTransaction[]) => {
    setPlaneRentalTransactions(transactions)
    localStorage.setItem(PLANE_RENTAL_KEY, JSON.stringify(transactions))
    
    if (isSupabaseConfigured()) {
      await savePlaneRentalToSupabase(transactions)
    }
  }

  const saveExtras = async (transactions: ExtrasTransaction[]) => {
    setExtrasTransactions(transactions)
    localStorage.setItem(EXTRAS_KEY, JSON.stringify(transactions))
    
    if (isSupabaseConfigured()) {
      await saveExtrasToSupabase(transactions)
    }
  }

  const saveIncome = (transactions: IncomeTransaction[]) => {
    setIncomeTransactions(transactions)
    localStorage.setItem(INCOME_KEY, JSON.stringify(transactions))
  }

  const addCFI = async (transaction: Omit<CFITransaction, 'id' | 'createdAt' | 'updatedAt' | 'totalUSD' | 'totalMXN'>) => {
    const totalUSD = transaction.ratePerHour * transaction.hours
    const totalMXN = totalUSD * EXCHANGE_RATE
    const newTransaction: CFITransaction = {
      ...transaction,
      totalUSD,
      totalMXN,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: transaction.date || new Date().toISOString().split('T')[0], // Ensure date is set
    }
    console.log('Adding CFI transaction:', newTransaction)
    await saveCFI([...cfiTransactions, newTransaction])
    console.log('CFI transaction added successfully')
    return newTransaction
  }

  const updateCFI = async (id: string, updates: Partial<Omit<CFITransaction, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const updated = cfiTransactions.map(t => {
      if (t.id === id) {
        const updatedT = { ...t, ...updates, updatedAt: new Date().toISOString() }
        // Recalculate total if rate or hours changed
        if (updates.ratePerHour !== undefined || updates.hours !== undefined) {
          const rate = updates.ratePerHour ?? t.ratePerHour
          const hours = updates.hours ?? t.hours
          updatedT.totalUSD = rate * hours
          updatedT.totalMXN = updatedT.totalUSD * EXCHANGE_RATE
        }
        return updatedT
      }
      return t
    })
    await saveCFI(updated)
  }

  const deleteCFI = async (id: string) => {
    await saveCFI(cfiTransactions.filter(t => t.id !== id))
  }

  const addPlaneRental = async (transaction: Omit<PlaneRentalTransaction, 'id' | 'createdAt' | 'updatedAt' | 'totalMXN'>) => {
    const totalMXN = transaction.totalUSD * EXCHANGE_RATE
    const newTransaction: PlaneRentalTransaction = {
      ...transaction,
      totalMXN,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await savePlaneRental([...planeRentalTransactions, newTransaction])
    return newTransaction
  }

  const updatePlaneRental = async (id: string, updates: Partial<Omit<PlaneRentalTransaction, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const updated = planeRentalTransactions.map(t => {
      if (t.id === id) {
        const updatedT = { ...t, ...updates, updatedAt: new Date().toISOString() }
        // Recalculate MXN if USD changed
        if (updates.totalUSD !== undefined) {
          updatedT.totalMXN = updatedT.totalUSD * EXCHANGE_RATE
        }
        return updatedT
      }
      return t
    })
    await savePlaneRental(updated)
  }

  const deletePlaneRental = async (id: string) => {
    await savePlaneRental(planeRentalTransactions.filter(t => t.id !== id))
  }

  const addExtras = async (transaction: Omit<ExtrasTransaction, 'id' | 'createdAt' | 'updatedAt' | 'totalMXN'>) => {
    const totalMXN = transaction.totalUSD * EXCHANGE_RATE
    const newTransaction: ExtrasTransaction = {
      ...transaction,
      totalMXN,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: (transaction as any).date || new Date().toISOString().split('T')[0], // Ensure date is set
    }
    await saveExtras([...extrasTransactions, newTransaction])
    return newTransaction
  }

  const updateExtras = async (id: string, updates: Partial<Omit<ExtrasTransaction, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const updated = extrasTransactions.map(t => {
      if (t.id === id) {
        const updatedT = { ...t, ...updates, updatedAt: new Date().toISOString() }
        // Recalculate MXN if USD changed
        if (updates.totalUSD !== undefined) {
          updatedT.totalMXN = updatedT.totalUSD * EXCHANGE_RATE
        }
        return updatedT
      }
      return t
    })
    await saveExtras(updated)
  }

  const deleteExtras = async (id: string) => {
    await saveExtras(extrasTransactions.filter(t => t.id !== id))
  }

  const addIncome = (transaction: Omit<IncomeTransaction, 'id' | 'createdAt' | 'updatedAt' | 'totalMXN'>) => {
    const totalMXN = transaction.totalUSD * EXCHANGE_RATE
    const newTransaction: IncomeTransaction = {
      ...transaction,
      totalMXN,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveIncome([...incomeTransactions, newTransaction])
    return newTransaction
  }

  const updateIncome = (id: string, updates: Partial<Omit<IncomeTransaction, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const updated = incomeTransactions.map(t => {
      if (t.id === id) {
        const updatedT = { ...t, ...updates, updatedAt: new Date().toISOString() }
        // Recalculate MXN if USD changed
        if (updates.totalUSD !== undefined) {
          updatedT.totalMXN = updatedT.totalUSD * EXCHANGE_RATE
        }
        return updatedT
      }
      return t
    })
    saveIncome(updated)
  }

  const deleteIncome = (id: string) => {
    saveIncome(incomeTransactions.filter(t => t.id !== id))
  }

  const getSummary = (): FlightTrainingSummary => {
    const totalCFIUSD = cfiTransactions.reduce((sum, t) => sum + t.totalUSD, 0)
    const totalCFIMXN = cfiTransactions.reduce((sum, t) => sum + t.totalMXN, 0)
    const totalCFIHours = cfiTransactions.reduce((sum, t) => sum + t.hours, 0)

    const totalPlaneRentalUSD = planeRentalTransactions.reduce((sum, t) => sum + t.totalUSD, 0)
    const totalPlaneRentalMXN = planeRentalTransactions.reduce((sum, t) => sum + t.totalMXN, 0)
    const totalPlaneRentalHours = planeRentalTransactions.reduce((sum, t) => sum + t.hours, 0)

    const totalExtrasUSD = extrasTransactions.reduce((sum, t) => sum + t.totalUSD, 0)
    const totalExtrasMXN = extrasTransactions.reduce((sum, t) => sum + t.totalMXN, 0)

    const totalIncomeUSD = incomeTransactions.reduce((sum, t) => sum + t.totalUSD, 0)
    const totalIncomeMXN = incomeTransactions.reduce((sum, t) => sum + t.totalMXN, 0)

    const netTotalUSD = totalIncomeUSD - (totalCFIUSD + totalPlaneRentalUSD + totalExtrasUSD)
    const netTotalMXN = totalIncomeMXN - (totalCFIMXN + totalPlaneRentalMXN + totalExtrasMXN)

    return {
      totalCFIUSD,
      totalCFIMXN,
      totalCFIHours,
      totalPlaneRentalUSD,
      totalPlaneRentalMXN,
      totalPlaneRentalHours,
      totalExtrasUSD,
      totalExtrasMXN,
      totalIncomeUSD,
      totalIncomeMXN,
      netTotalUSD,
      netTotalMXN,
    }
  }

  const clearAllFlightTrainingData = () => {
    // Clear CFI transactions
    setCfiTransactions([])
    localStorage.removeItem(CFI_KEY)

    // Clear plane rental transactions
    setPlaneRentalTransactions([])
    localStorage.removeItem(PLANE_RENTAL_KEY)

    // Clear extras transactions
    setExtrasTransactions([])
    localStorage.removeItem(EXTRAS_KEY)

    // Clear income transactions
    setIncomeTransactions([])
    localStorage.removeItem(INCOME_KEY)
  }

  return {
    cfiTransactions,
    planeRentalTransactions,
    extrasTransactions,
    incomeTransactions,
    addCFI,
    updateCFI,
    deleteCFI,
    addPlaneRental,
    updatePlaneRental,
    deletePlaneRental,
    addExtras,
    updateExtras,
    deleteExtras,
    addIncome,
    updateIncome,
    deleteIncome,
    getSummary,
    clearAllFlightTrainingData,
  }
}

