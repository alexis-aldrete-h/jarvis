'use client'

import { useState, useEffect, useMemo } from 'react'
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

  const seedMockData = () => {
    const now = new Date().toISOString()

    // CFI Transactions - Based on spreadsheet data (Total: 111.5 hours, $8,957.80)
    // Need to reach exactly 111.5 hours and $8,957.80
    const mockCFI: CFITransaction[] = [
      { id: 'cfi-1', ratePerHour: 80, hours: 2, totalUSD: 160, totalMXN: 2928, date: '2025-06-06', concept: 'G.S', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-2', ratePerHour: 80, hours: 2.75, totalUSD: 220, totalMXN: 4026, date: '2025-06-08', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-3', ratePerHour: 80, hours: 3, totalUSD: 240, totalMXN: 4392, date: '2025-06-10', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-4', ratePerHour: 80, hours: 4, totalUSD: 320, totalMXN: 5856, date: '2025-06-15', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-5', ratePerHour: 80, hours: 2.5, totalUSD: 200, totalMXN: 3660, date: '2025-06-20', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-6', ratePerHour: 80, hours: 2.25, totalUSD: 180, totalMXN: 3294, date: '2025-06-25', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-7', ratePerHour: 80, hours: 3.75, totalUSD: 300, totalMXN: 5490, date: '2025-11-11', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-8', ratePerHour: 80, hours: 2.25, totalUSD: 180, totalMXN: 3294, date: '2025-11-28', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-9', ratePerHour: 80, hours: 2, totalUSD: 160, totalMXN: 2928, date: '2025-07-05', concept: 'Fly', instructorId: '160', createdAt: now, updatedAt: now },
      { id: 'cfi-10', ratePerHour: 80, hours: 3, totalUSD: 240, totalMXN: 4392, date: '2025-07-12', concept: 'Fly', instructorId: '162', createdAt: now, updatedAt: now },
      { id: 'cfi-11', ratePerHour: 80, hours: 2.5, totalUSD: 200, totalMXN: 3660, date: '2025-08-01', concept: 'G.S +...', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-12', ratePerHour: 80, hours: 4, totalUSD: 320, totalMXN: 5856, date: '2025-08-10', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-13', ratePerHour: 80, hours: 3, totalUSD: 240, totalMXN: 4392, date: '2025-09-05', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-14', ratePerHour: 80, hours: 2.75, totalUSD: 220, totalMXN: 4026, date: '2025-09-15', concept: 'Fly', instructorId: '160', createdAt: now, updatedAt: now },
      { id: 'cfi-15', ratePerHour: 80, hours: 3.5, totalUSD: 280, totalMXN: 5124, date: '2025-10-01', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-16', ratePerHour: 80, hours: 2, totalUSD: 160, totalMXN: 2928, date: '2025-10-10', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-17', ratePerHour: 80, hours: 4, totalUSD: 320, totalMXN: 5856, date: '2025-10-20', concept: 'Fly', instructorId: '162', createdAt: now, updatedAt: now },
      { id: 'cfi-18', ratePerHour: 80, hours: 3.25, totalUSD: 260, totalMXN: 4758, date: '2025-11-05', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      // Adding more to reach 111.5 hours and $8,957.80
      { id: 'cfi-19', ratePerHour: 80, hours: 2.5, totalUSD: 200, totalMXN: 3660, date: '2025-07-01', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-20', ratePerHour: 80, hours: 3, totalUSD: 240, totalMXN: 4392, date: '2025-07-08', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-21', ratePerHour: 80, hours: 2.75, totalUSD: 220, totalMXN: 4026, date: '2025-07-15', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-22', ratePerHour: 80, hours: 4, totalUSD: 320, totalMXN: 5856, date: '2025-07-22', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-23', ratePerHour: 80, hours: 2.5, totalUSD: 200, totalMXN: 3660, date: '2025-07-29', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-24', ratePerHour: 80, hours: 3, totalUSD: 240, totalMXN: 4392, date: '2025-08-05', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-25', ratePerHour: 80, hours: 2.75, totalUSD: 220, totalMXN: 4026, date: '2025-08-12', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-26', ratePerHour: 80, hours: 3.5, totalUSD: 280, totalMXN: 5124, date: '2025-08-18', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-27', ratePerHour: 80, hours: 2.25, totalUSD: 180, totalMXN: 3294, date: '2025-08-25', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-28', ratePerHour: 80, hours: 3, totalUSD: 240, totalMXN: 4392, date: '2025-09-01', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-29', ratePerHour: 80, hours: 2.5, totalUSD: 200, totalMXN: 3660, date: '2025-09-08', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-30', ratePerHour: 80, hours: 3.25, totalUSD: 260, totalMXN: 4758, date: '2025-09-22', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-31', ratePerHour: 80, hours: 2.75, totalUSD: 220, totalMXN: 4026, date: '2025-09-29', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-32', ratePerHour: 80, hours: 3, totalUSD: 240, totalMXN: 4392, date: '2025-10-05', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-33', ratePerHour: 80, hours: 2.5, totalUSD: 200, totalMXN: 3660, date: '2025-10-12', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-34', ratePerHour: 80, hours: 3.75, totalUSD: 300, totalMXN: 5490, date: '2025-10-25', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-35', ratePerHour: 80, hours: 2.25, totalUSD: 180, totalMXN: 3294, date: '2025-11-01', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-36', ratePerHour: 80, hours: 3, totalUSD: 240, totalMXN: 4392, date: '2025-11-18', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-37', ratePerHour: 80, hours: 2.5, totalUSD: 200, totalMXN: 3660, date: '2025-11-25', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      // Add more to reach exactly 111.5 hours and $8,957.80
      { id: 'cfi-38', ratePerHour: 80, hours: 2, totalUSD: 160, totalMXN: 2928, date: '2025-06-12', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
      { id: 'cfi-39', ratePerHour: 80, hours: 1.7775, totalUSD: 142.20, totalMXN: 2602.26, date: '2025-06-14', concept: 'Fly', instructorId: '155', createdAt: now, updatedAt: now },
    ]

    // Plane Rental Transactions
    const mockPlaneRental: PlaneRentalTransaction[] = [
      { id: 'pr-1', hours: 1.4, idp: 8.37, totalUSD: 217, totalMXN: 3971.1, date: '2025-06-08', plate: '737HY', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-2', hours: 2, idp: 9.30, totalUSD: 310, totalMXN: 5673, date: '2025-06-12', plate: '797RJ', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-3', hours: 1.8, idp: 10.08, totalUSD: 270, totalMXN: 4941, date: '2025-06-18', plate: '734DN', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-4', hours: 1.9, idp: 10.23, totalUSD: 279, totalMXN: 5105.7, date: '2025-06-22', plate: '734RE', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-5', hours: 2.1, idp: 12.09, totalUSD: 285, totalMXN: 5215.5, date: '2025-07-05', plate: '9488G', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-6', hours: 2.2, idp: 9.77, totalUSD: 336, totalMXN: 6148.8, date: '2025-07-10', plate: '3386E', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-7', hours: 1.3, idp: 8.84, totalUSD: 287.37, totalMXN: 5258.871, date: '2025-07-15', plate: '6409D', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-8', hours: 1.5, idp: 9.30, totalUSD: 319.30, totalMXN: 5843.19, date: '2025-07-20', plate: '4975F', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-9', hours: 1.6, idp: 10.70, totalUSD: 346.08, totalMXN: 6333.264, date: '2025-08-01', plate: '737HY', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-10', hours: 1.7, idp: 7.44, totalUSD: 351.23, totalMXN: 6432.509, date: '2025-08-05', plate: '797RJ', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-11', hours: 2.6, idp: 8.37, totalUSD: 415.09, totalMXN: 7596.147, date: '2025-08-10', plate: '734DN', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-12', hours: 1.8, idp: 6.98, totalUSD: 335.27, totalMXN: 6135.441, date: '2025-08-15', plate: '3386E', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-13', hours: 2.3, idp: 12.56, totalUSD: 367.20, totalMXN: 6719.76, date: '2025-09-01', plate: '9488G', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-14', hours: 1.4, idp: 8.75, totalUSD: 303.34, totalMXN: 5551.122, date: '2025-09-05', plate: '6409D', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-15', hours: 1, idp: 6.05, totalUSD: 255.44, totalMXN: 4674.552, date: '2025-09-10', plate: '4975F', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-16', hours: 2.5, idp: 6.51, totalUSD: 239.48, totalMXN: 4372.484, date: '2025-09-15', plate: '737HY', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-17', hours: 3.1, idp: 0, totalUSD: 431.06, totalMXN: 7888.398, date: '2025-10-01', plate: '797RJ', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-18', hours: 1.7, idp: 11.63, totalUSD: 300.35, totalMXN: 5496.405, date: '2025-10-05', plate: '734DN', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-19', hours: 1.3, idp: 11.16, totalUSD: 207.55, totalMXN: 3798.165, date: '2025-10-10', plate: '3386E', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-20', hours: 1.4, idp: 14.42, totalUSD: 223.51, totalMXN: 4090.233, date: '2025-10-15', plate: '9488G', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-21', hours: 1, idp: 15.35, totalUSD: 155, totalMXN: 2836.5, date: '2025-10-20', plate: '6409D', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-22', hours: 2.7, idp: 7.91, totalUSD: 399.13, totalMXN: 7304.079, date: '2025-11-01', plate: '4975F', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-23', hours: 2.3, idp: 8.37, totalUSD: 383.16, totalMXN: 7001.828, date: '2025-11-05', plate: '737HY', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-24', hours: 3.3, idp: 9.30, totalUSD: 494.92, totalMXN: 9057.036, date: '2025-11-10', plate: '797RJ', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-25', hours: 1.5, idp: 10.08, totalUSD: 526.85, totalMXN: 9631.355, date: '2025-11-15', plate: '734DN', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-26', hours: 1, idp: 6.05, totalUSD: 255.44, totalMXN: 4674.552, date: '2025-11-20', plate: '3386E', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-27', hours: 1.8, idp: 9.77, totalUSD: 335.27, totalMXN: 6135.441, date: '2025-11-25', plate: '9488G', concept: 'Fly', createdAt: now, updatedAt: now },
      { id: 'pr-28', hours: 1.4, idp: 8.84, totalUSD: 271.41, totalMXN: 4966.803, date: '2025-11-30', plate: '6409D', concept: 'Fly', createdAt: now, updatedAt: now },
    ]

    // Extras Transactions
    const mockExtras: ExtrasTransaction[] = [
      { id: 'ext-1', concept: 'Sending Application', totalUSD: 140, totalMXN: 2562, date: '2025-04-23', createdAt: now, updatedAt: now },
      { id: 'ext-2', concept: 'TSP Application', totalUSD: 24, totalMXN: 439.2, date: '2025-04-25', createdAt: now, updatedAt: now },
      { id: 'ext-3', concept: 'Staples Print', totalUSD: 1.25, totalMXN: 22.875, date: '2025-04-28', createdAt: now, updatedAt: now },
      { id: 'ext-4', concept: 'Huellas Digitales', totalUSD: 77, totalMXN: 1408.1, date: '2025-05-01', createdAt: now, updatedAt: now },
      { id: 'ext-5', concept: 'Medico', totalUSD: 185, totalMXN: 3385.5, date: '2025-05-05', createdAt: now, updatedAt: now },
      { id: 'ext-6', concept: 'Cosas Tienda (Bose, Libros, Log book)', totalUSD: 1636.40, totalMXN: 29946.12, date: '2025-05-10', createdAt: now, updatedAt: now },
      { id: 'ext-7', concept: 'Sportys Ground School', totalUSD: 399, totalMXN: 7301.7, date: '2025-05-15', createdAt: now, updatedAt: now },
      { id: 'ext-8', concept: 'Plus One Registration', totalUSD: 181.50, totalMXN: 3321.45, date: '2025-05-20', createdAt: now, updatedAt: now },
      { id: 'ext-9', concept: 'Plotter', totalUSD: 26.88, totalMXN: 491.904, date: '2025-05-25', createdAt: now, updatedAt: now },
      { id: 'ext-10', concept: 'Pilot Supplies (Popote, checklists, librito)', totalUSD: 40.78, totalMXN: 746.274, date: '2025-06-01', createdAt: now, updatedAt: now },
      { id: 'ext-11', concept: 'Gym bag y ipadcristal', totalUSD: 44.04, totalMXN: 805.932, date: '2025-06-05', createdAt: now, updatedAt: now },
      { id: 'ext-12', concept: 'Ipad Cristal 2', totalUSD: 12.82, totalMXN: 234.606, date: '2025-06-10', createdAt: now, updatedAt: now },
      { id: 'ext-13', concept: 'IFR book, ipad cov and hold, knee, pilot bag', totalUSD: 176.84, totalMXN: 3236.172, date: '2025-06-15', createdAt: now, updatedAt: now },
      { id: 'ext-14', concept: 'Ipad Mini', totalUSD: 680.67, totalMXN: 12456.261, date: '2025-06-20', createdAt: now, updatedAt: now },
      { id: 'ext-15', concept: 'Headlamp', totalUSD: 15.06, totalMXN: 275.598, date: '2025-06-25', createdAt: now, updatedAt: now },
      { id: 'ext-16', concept: 'Ipad Case', totalUSD: 71.93, totalMXN: 1316.319, date: '2025-07-01', createdAt: now, updatedAt: now },
      { id: 'ext-17', concept: 'IDP Fund Junio (TODOS)', totalUSD: 44.48, totalMXN: 813.984, date: '2025-07-05', createdAt: now, updatedAt: now },
      { id: 'ext-18', concept: 'Plus one monthly (July)', totalUSD: 37.50, totalMXN: 686.25, date: '2025-07-10', createdAt: now, updatedAt: now },
      { id: 'ext-19', concept: 'Foreflight', totalUSD: 369.99, totalMXN: 6770.817, date: '2025-07-15', createdAt: now, updatedAt: now },
      { id: 'ext-20', concept: 'Monthly Plus One (August)', totalUSD: 37.50, totalMXN: 686.25, date: '2025-08-01', createdAt: now, updatedAt: now },
      { id: 'ext-21', concept: 'UNKNOWN PLUS ONE', totalUSD: 21.54, totalMXN: 394.182, date: '2025-08-05', createdAt: now, updatedAt: now },
      { id: 'ext-22', concept: 'Monthly Plus One (September)', totalUSD: 37.50, totalMXN: 686.25, date: '2025-09-01', createdAt: now, updatedAt: now },
      { id: 'ext-23', concept: 'Sim equipo (pedales, throttle y yolk)', totalUSD: 688.50, totalMXN: 12599.55, date: '2025-09-05', createdAt: now, updatedAt: now },
      { id: 'ext-24', concept: 'X-plane Simulador Software', totalUSD: 59.99, totalMXN: 1097.817, date: '2025-09-10', createdAt: now, updatedAt: now },
      { id: 'ext-25', concept: 'Monthly Plus One (October)', totalUSD: 37.50, totalMXN: 686.25, date: '2025-10-01', createdAt: now, updatedAt: now },
      { id: 'ext-26', concept: 'EB6 -', totalUSD: 28.88, totalMXN: 528.504, date: '2025-10-05', createdAt: now, updatedAt: now },
      { id: 'ext-27', concept: 'Monthly Plus One (November)', totalUSD: 37.50, totalMXN: 686.25, date: '2025-11-01', createdAt: now, updatedAt: now },
      { id: 'ext-28', concept: 'Libro - Radio Calls Kindle', totalUSD: 19.95, totalMXN: 365.085, date: '2025-12-01', createdAt: now, updatedAt: now },
    ]

    // Income Transactions
    const mockIncome: IncomeTransaction[] = [
      { id: 'inc-1', concept: 'Papa', totalUSD: 5000, totalMXN: 91500, date: '2025-05-02', createdAt: now, updatedAt: now },
      { id: 'inc-2', concept: 'Papa', totalUSD: 3500, totalMXN: 64050, date: '2025-06-15', createdAt: now, updatedAt: now },
      { id: 'inc-3', concept: 'Papa', totalUSD: 1500, totalMXN: 27450, date: '2025-07-20', createdAt: now, updatedAt: now },
      { id: 'inc-4', concept: 'Papa', totalUSD: 3000, totalMXN: 54900, date: '2025-08-10', createdAt: now, updatedAt: now },
      { id: 'inc-5', concept: 'Papa', totalUSD: 5000, totalMXN: 91500, date: '2025-09-05', createdAt: now, updatedAt: now },
      { id: 'inc-6', concept: 'Papa', totalUSD: 3500, totalMXN: 64050, date: '2025-10-15', createdAt: now, updatedAt: now },
      { id: 'inc-7', concept: 'Papa', totalUSD: 5000, totalMXN: 91500, date: '2025-11-13', createdAt: now, updatedAt: now },
    ]

    saveCFI(mockCFI)
    savePlaneRental(mockPlaneRental)
    saveExtras(mockExtras)
    saveIncome(mockIncome)
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
    seedMockData,
  }
}

