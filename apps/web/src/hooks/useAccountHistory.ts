'use client'

import { useState, useEffect, useMemo } from 'react'

export interface AccountSnapshot {
  date: string // ISO date string
  savings: number
  investments: number
  debt: number
  flightTraining: number
  retirement: number
}

const ACCOUNT_HISTORY_KEY = 'jarvis_account_history'

export function useAccountHistory() {
  const [snapshots, setSnapshots] = useState<AccountSnapshot[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(ACCOUNT_HISTORY_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        console.log('Loaded snapshots from localStorage:', parsed.length)
        setSnapshots(parsed)
      } catch (e) {
        console.error('Failed to load account history:', e)
      }
    } else {
      console.log('No stored account history found')
    }
    setIsLoaded(true)
  }, [])

  const saveSnapshots = (newSnapshots: AccountSnapshot[]) => {
    const sorted = [...newSnapshots].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    setSnapshots(sorted)
    localStorage.setItem(ACCOUNT_HISTORY_KEY, JSON.stringify(sorted))
    console.log('Saved snapshots to localStorage:', sorted.length)
  }

  const addSnapshot = (snapshot: AccountSnapshot) => {
    const newSnapshots = [...snapshots, snapshot].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    saveSnapshots(newSnapshots)
  }

  const getHistoricalData = (timeRange: '1W' | '1M' | '3M' | 'YTD' | 'ALL') => {
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case '1W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '1M':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case '3M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        break
      case 'YTD':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'ALL':
        if (snapshots.length > 0) {
          const earliest = snapshots.reduce((earliest, s) => {
            const sDate = new Date(s.date)
            return sDate < earliest ? sDate : earliest
          }, new Date(snapshots[0].date))
          startDate = earliest
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        }
        break
    }

    return snapshots.filter(s => new Date(s.date) >= startDate)
  }

  const seedMockHistoricalData = (clearExisting = false) => {
    // Clear existing data if requested
    if (clearExisting) {
      setSnapshots([])
      localStorage.removeItem(ACCOUNT_HISTORY_KEY)
    }
    
    const now = new Date()
    const mockSnapshots: AccountSnapshot[] = []

    // Generate daily data for current year and next year to ensure data availability
    const currentYear = now.getFullYear()
    const yearsToGenerate = [currentYear, currentYear + 1] // Generate for current and next year
    
    yearsToGenerate.forEach(year => {
      // Define starting values for January
      const janValues = {
        savings: 100,
        investments: 7000,
        debt: -1800,
        flightTraining: -6000,
        retirement: 17000
      }
      
      // Define ending values for December
      const decValues = {
        savings: 420,
        investments: 10800,
        debt: -750,
        flightTraining: -3300,
        retirement: 24500
      }
      
      // Generate data for ALL months of the year - daily snapshots
      for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        // For current month of current year, only generate up to today. Otherwise generate all days.
        const maxDay = (year === currentYear && month === now.getMonth()) ? now.getDate() : daysInMonth
        
        // Base values for each month (progressive growth from Jan to Dec)
        const monthProgress = month / 11 // 0 to 1 (Jan = 0, Dec = 1)
        const baseSavings = janValues.savings + ((decValues.savings - janValues.savings) * monthProgress)
        const baseInvestments = janValues.investments + ((decValues.investments - janValues.investments) * monthProgress)
        const baseDebt = janValues.debt + ((decValues.debt - janValues.debt) * monthProgress)
        const baseFlightTraining = janValues.flightTraining + ((decValues.flightTraining - janValues.flightTraining) * monthProgress)
        const baseRetirement = janValues.retirement + ((decValues.retirement - janValues.retirement) * monthProgress)
        
        // Generate data for each day of the month
        for (let day = 1; day <= maxDay; day++) {
          const date = new Date(year, month, day)
          
          // Add daily variation (small random changes with sine wave pattern)
          const dailyVariation = (Math.sin(day * 0.2) * 0.05) + ((Math.random() - 0.5) * 0.03)
          
          const savings = baseSavings + (dailyVariation * baseSavings)
          const investments = baseInvestments + (dailyVariation * baseInvestments)
          const debt = baseDebt + (dailyVariation * Math.abs(baseDebt))
          const flightTraining = baseFlightTraining + (dailyVariation * Math.abs(baseFlightTraining))
          const retirement = baseRetirement + (dailyVariation * baseRetirement)

          mockSnapshots.push({
            date: date.toISOString(),
            savings: Math.max(0, Math.round(savings * 100) / 100),
            investments: Math.max(0, Math.round(investments * 100) / 100),
            debt: Math.round(debt * 100) / 100,
            flightTraining: Math.round(flightTraining * 100) / 100,
            retirement: Math.max(0, Math.round(retirement * 100) / 100),
          })
        }
      }
    })

    // Also generate data for previous year (2024) - monthly snapshots for variety
    for (let month = 0; month < 12; month++) {
      const date = new Date(currentYear - 1, month, 15)
      const monthProgress = month / 11
      
      const savings = 100 + (50 * monthProgress) + (Math.random() * 20 - 10)
      const investments = 7000 + (500 * monthProgress) + (Math.random() * 200 - 100)
      const debt = -1800 + (300 * monthProgress) + (Math.random() * 50 - 25)
      const flightTraining = -6000 + (800 * monthProgress) + (Math.random() * 100 - 50)
      const retirement = 17000 + (1500 * monthProgress) + (Math.random() * 300 - 150)

      mockSnapshots.push({
        date: date.toISOString(),
        savings: Math.max(0, Math.round(savings * 100) / 100),
        investments: Math.max(0, Math.round(investments * 100) / 100),
        debt: Math.round(debt * 100) / 100,
        flightTraining: Math.round(flightTraining * 100) / 100,
        retirement: Math.max(0, Math.round(retirement * 100) / 100),
      })
    }

    // Sort by date
    mockSnapshots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    console.log('Seeding diverse mock historical data:', mockSnapshots.length, 'snapshots')
    console.log('Date range:', mockSnapshots[0]?.date, 'to', mockSnapshots[mockSnapshots.length - 1]?.date)
    saveSnapshots(mockSnapshots)
    return mockSnapshots
  }

  return {
    snapshots,
    isLoaded,
    addSnapshot,
    getHistoricalData,
    seedMockHistoricalData,
  }
}

