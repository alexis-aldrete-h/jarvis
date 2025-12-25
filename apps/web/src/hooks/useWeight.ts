'use client'

import { useState, useEffect } from 'react'

export interface WeightEntry {
  id: string
  date: string // YYYY-MM-DD format
  weight: number // in lbs or kg
  notes?: string
  createdAt: string
}

export interface WeeklyGoal {
  id: string
  weekStart: string // YYYY-MM-DD format (Sunday)
  targetWeight: number
  createdAt: string
}

const WEIGHT_ENTRIES_KEY = 'jarvis_weight_entries'
const WEEKLY_GOALS_KEY = 'jarvis_weekly_goals'

export function useWeight() {
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([])
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([])

  useEffect(() => {
    const storedEntries = localStorage.getItem(WEIGHT_ENTRIES_KEY)
    const storedGoals = localStorage.getItem(WEEKLY_GOALS_KEY)
    
    if (storedEntries) {
      try {
        setWeightEntries(JSON.parse(storedEntries))
      } catch (e) {
        console.error('Failed to load weight entries:', e)
      }
    }
    
    if (storedGoals) {
      try {
        setWeeklyGoals(JSON.parse(storedGoals))
      } catch (e) {
        console.error('Failed to load weekly goals:', e)
      }
    }
  }, [])

  const saveEntries = (newEntries: WeightEntry[]) => {
    setWeightEntries(newEntries)
    localStorage.setItem(WEIGHT_ENTRIES_KEY, JSON.stringify(newEntries))
  }

  const saveGoals = (newGoals: WeeklyGoal[]) => {
    setWeeklyGoals(newGoals)
    localStorage.setItem(WEEKLY_GOALS_KEY, JSON.stringify(newGoals))
  }

  const addWeightEntry = (entry: Omit<WeightEntry, 'id' | 'createdAt'>) => {
    const newEntry: WeightEntry = {
      ...entry,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    const updated = [...weightEntries, newEntry].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    saveEntries(updated)
    return newEntry
  }

  const updateWeightEntry = (id: string, updates: Partial<WeightEntry>) => {
    const updated = weightEntries.map(entry =>
      entry.id === id ? { ...entry, ...updates } : entry
    ).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    saveEntries(updated)
  }

  const deleteWeightEntry = (id: string) => {
    saveEntries(weightEntries.filter((e) => e.id !== id))
  }

  const addWeeklyGoal = (goal: Omit<WeeklyGoal, 'id' | 'createdAt'>) => {
    const newGoal: WeeklyGoal = {
      ...goal,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    const updated = [...weeklyGoals, newGoal].sort((a, b) => 
      new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
    )
    saveGoals(updated)
    return newGoal
  }

  const updateWeeklyGoal = (id: string, updates: Partial<WeeklyGoal>) => {
    const updated = weeklyGoals.map(goal =>
      goal.id === id ? { ...goal, ...updates } : goal
    ).sort((a, b) => 
      new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
    )
    saveGoals(updated)
  }

  const deleteWeeklyGoal = (id: string) => {
    saveGoals(weeklyGoals.filter((g) => g.id !== id))
  }

  // Get goal for a specific week (Sunday)
  const getGoalForWeek = (date: string): WeeklyGoal | undefined => {
    const targetDate = new Date(date)
    const sunday = getSundayOfWeek(targetDate)
    const sundayStr = formatDate(sunday)
    
    return weeklyGoals.find(goal => goal.weekStart === sundayStr)
  }

  // Get all Sundays (milestones) between two dates
  const getSundaysBetween = (startDate: Date, endDate: Date): Date[] => {
    const sundays: Date[] = []
    const current = new Date(startDate)
    
    // Find first Sunday
    while (current.getDay() !== 0) {
      current.setDate(current.getDate() + 1)
    }
    
    // Collect all Sundays
    while (current <= endDate) {
      sundays.push(new Date(current))
      current.setDate(current.getDate() + 7)
    }
    
    return sundays
  }

  // Helper function to get Sunday of a week
  const getSundayOfWeek = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  // Helper function to format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const seedMockData = () => {
    const now = new Date()
    const mockEntries: WeightEntry[] = []
    const mockGoals: WeeklyGoal[] = []

    // Generate weight entries for the past 8 weeks (about 2 months)
    // Starting weight: 195 lbs, target: gradual decrease to 185 lbs
    let currentWeight = 195.0
    
    for (let weekOffset = 8; weekOffset >= 0; weekOffset--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - (weekOffset * 7))
      
      // Get Sunday of that week
      const sunday = getSundayOfWeek(weekStart)
      
      // Add 2-3 entries per week (not every day, more realistic)
      const entriesPerWeek = Math.floor(Math.random() * 2) + 2 // 2 or 3 entries
      
      for (let i = 0; i < entriesPerWeek; i++) {
        const entryDate = new Date(sunday)
        entryDate.setDate(entryDate.getDate() + (i * 2) + Math.floor(Math.random() * 2)) // Spread entries across the week
        
        // Weight fluctuates but generally decreases
        const variation = (Math.random() - 0.5) * 1.5 // ±0.75 lbs variation
        const trend = -0.3 * weekOffset // Gradual decrease over time
        const weight = currentWeight + trend + variation
        
        // Add some notes occasionally
        const notes = Math.random() > 0.7 ? 
          ['Good workout today', 'Feeling lighter', 'After morning run', 'Post-meal', 'Morning weigh-in'][Math.floor(Math.random() * 5)] :
          undefined
        
        mockEntries.push({
          id: `mock-entry-${weekOffset}-${i}`,
          date: formatDate(entryDate),
          weight: Math.round(weight * 10) / 10, // Round to 1 decimal
          notes,
          createdAt: entryDate.toISOString(),
        })
      }
      
      // Update current weight for next week (slight decrease)
      currentWeight -= 0.25
    }

    // Generate weekly goals for the past 8 weeks
    for (let weekOffset = 8; weekOffset >= 0; weekOffset--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - (weekOffset * 7))
      const sunday = getSundayOfWeek(weekStart)
      const sundayStr = formatDate(sunday)
      
      // Target weight decreases gradually: 195 -> 185 over 8 weeks
      const targetWeight = 195 - (weekOffset * 1.25) + (Math.random() - 0.5) * 0.5
      
      mockGoals.push({
        id: `mock-goal-${weekOffset}`,
        weekStart: sundayStr,
        targetWeight: Math.round(targetWeight * 10) / 10,
        createdAt: sunday.toISOString(),
      })
    }

    // Sort entries by date
    const sortedEntries = mockEntries.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    // Sort goals by date
    const sortedGoals = mockGoals.sort((a, b) => 
      new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
    )

    saveEntries(sortedEntries)
    saveGoals(sortedGoals)
  }

  return {
    weightEntries,
    weeklyGoals,
    addWeightEntry,
    updateWeightEntry,
    deleteWeightEntry,
    addWeeklyGoal,
    updateWeeklyGoal,
    deleteWeeklyGoal,
    getGoalForWeek,
    getSundaysBetween,
    getSundayOfWeek,
    formatDate,
    seedMockData,
  }
}

