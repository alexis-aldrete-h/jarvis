'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  CFITransaction, 
  PlaneRentalTransaction, 
  ExtrasTransaction, 
  IncomeTransaction,
  FlightTrainingSummary 
} from '@jarvis/shared'

const EXCHANGE_RATE = 18.3 // MXN to USD

const CFI_KEY = 'jarvis_flight_training_cfi'
const PLANE_RENTAL_KEY = 'jarvis_flight_training_plane_rental'
const EXTRAS_KEY = 'jarvis_flight_training_extras'
const INCOME_KEY = 'jarvis_flight_training_income'

export function useFlightTraining() {
  const [cfiTransactions, setCfiTransactions] = useState<CFITransaction[]>([])
  const [planeRentalTransactions, setPlaneRentalTransactions] = useState<PlaneRentalTransaction[]>([])
  const [extrasTransactions, setExtrasTransactions] = useState<ExtrasTransaction[]>([])
  const [incomeTransactions, setIncomeTransactions] = useState<IncomeTransaction[]>([])
  const hasClearedFlightTrainingDataRef = useRef(false)

  // Clear all flight training data (one-time operation)
  useEffect(() => {
    if (hasClearedFlightTrainingDataRef.current) return
    
    // Wait a bit for data to load first
    setTimeout(() => {
      setCfiTransactions([])
      localStorage.removeItem(CFI_KEY)

      setPlaneRentalTransactions([])
      localStorage.removeItem(PLANE_RENTAL_KEY)

      setExtrasTransactions([])
      localStorage.removeItem(EXTRAS_KEY)

      setIncomeTransactions([])
      localStorage.removeItem(INCOME_KEY)

      hasClearedFlightTrainingDataRef.current = true
      console.log('Cleared all flight training data')
    }, 1000)
  }, [])

  useEffect(() => {
    const storedCFI = localStorage.getItem(CFI_KEY)
    const storedPlaneRental = localStorage.getItem(PLANE_RENTAL_KEY)
    const storedExtras = localStorage.getItem(EXTRAS_KEY)
    const storedIncome = localStorage.getItem(INCOME_KEY)
    
    if (storedCFI) {
      try {
        setCfiTransactions(JSON.parse(storedCFI))
      } catch (e) {
        console.error('Failed to load CFI transactions:', e)
      }
    }
    
    if (storedPlaneRental) {
      try {
        setPlaneRentalTransactions(JSON.parse(storedPlaneRental))
      } catch (e) {
        console.error('Failed to load plane rental transactions:', e)
      }
    }
    
    if (storedExtras) {
      try {
        setExtrasTransactions(JSON.parse(storedExtras))
      } catch (e) {
        console.error('Failed to load extras transactions:', e)
      }
    }
    
    if (storedIncome) {
      try {
        setIncomeTransactions(JSON.parse(storedIncome))
      } catch (e) {
        console.error('Failed to load income transactions:', e)
      }
    }
  }, [])

  const saveCFI = (transactions: CFITransaction[]) => {
    setCfiTransactions(transactions)
    localStorage.setItem(CFI_KEY, JSON.stringify(transactions))
  }

  const savePlaneRental = (transactions: PlaneRentalTransaction[]) => {
    setPlaneRentalTransactions(transactions)
    localStorage.setItem(PLANE_RENTAL_KEY, JSON.stringify(transactions))
  }

  const saveExtras = (transactions: ExtrasTransaction[]) => {
    setExtrasTransactions(transactions)
    localStorage.setItem(EXTRAS_KEY, JSON.stringify(transactions))
  }

  const saveIncome = (transactions: IncomeTransaction[]) => {
    setIncomeTransactions(transactions)
    localStorage.setItem(INCOME_KEY, JSON.stringify(transactions))
  }

  const addCFI = (transaction: Omit<CFITransaction, 'id' | 'createdAt' | 'updatedAt' | 'totalUSD' | 'totalMXN'>) => {
    const totalUSD = transaction.ratePerHour * transaction.hours
    const totalMXN = totalUSD * EXCHANGE_RATE
    const newTransaction: CFITransaction = {
      ...transaction,
      totalUSD,
      totalMXN,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveCFI([...cfiTransactions, newTransaction])
    return newTransaction
  }

  const updateCFI = (id: string, updates: Partial<Omit<CFITransaction, 'id' | 'createdAt' | 'updatedAt'>>) => {
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
    saveCFI(updated)
  }

  const deleteCFI = (id: string) => {
    saveCFI(cfiTransactions.filter(t => t.id !== id))
  }

  const addPlaneRental = (transaction: Omit<PlaneRentalTransaction, 'id' | 'createdAt' | 'updatedAt' | 'totalMXN'>) => {
    const totalMXN = transaction.totalUSD * EXCHANGE_RATE
    const newTransaction: PlaneRentalTransaction = {
      ...transaction,
      totalMXN,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    savePlaneRental([...planeRentalTransactions, newTransaction])
    return newTransaction
  }

  const updatePlaneRental = (id: string, updates: Partial<Omit<PlaneRentalTransaction, 'id' | 'createdAt' | 'updatedAt'>>) => {
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
    savePlaneRental(updated)
  }

  const deletePlaneRental = (id: string) => {
    savePlaneRental(planeRentalTransactions.filter(t => t.id !== id))
  }

  const addExtras = (transaction: Omit<ExtrasTransaction, 'id' | 'createdAt' | 'updatedAt' | 'totalMXN'>) => {
    const totalMXN = transaction.totalUSD * EXCHANGE_RATE
    const newTransaction: ExtrasTransaction = {
      ...transaction,
      totalMXN,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveExtras([...extrasTransactions, newTransaction])
    return newTransaction
  }

  const updateExtras = (id: string, updates: Partial<Omit<ExtrasTransaction, 'id' | 'createdAt' | 'updatedAt'>>) => {
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
    saveExtras(updated)
  }

  const deleteExtras = (id: string) => {
    saveExtras(extrasTransactions.filter(t => t.id !== id))
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

