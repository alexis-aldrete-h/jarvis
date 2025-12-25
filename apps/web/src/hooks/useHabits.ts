'use client'

import { useState, useEffect } from 'react'

export type HabitType = 'build' | 'destroy'

export interface Habit {
  id: string
  name: string
  type: HabitType
  icon?: string
  createdAt: string
}

export interface HabitCompletion {
  habitId: string
  date: string // YYYY-MM-DD format
  completed: boolean
}

const HABITS_KEY = 'jarvis_habits'
const COMPLETIONS_KEY = 'jarvis_habit_completions'

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<HabitCompletion[]>([])

  useEffect(() => {
    const storedHabits = localStorage.getItem(HABITS_KEY)
    const storedCompletions = localStorage.getItem(COMPLETIONS_KEY)
    
    if (storedHabits) {
      try {
        setHabits(JSON.parse(storedHabits))
      } catch (e) {
        console.error('Failed to load habits:', e)
      }
    }
    
    if (storedCompletions) {
      try {
        setCompletions(JSON.parse(storedCompletions))
      } catch (e) {
        console.error('Failed to load completions:', e)
      }
    }
  }, [])

  const saveHabits = (newHabits: Habit[]) => {
    setHabits(newHabits)
    localStorage.setItem(HABITS_KEY, JSON.stringify(newHabits))
  }

  const saveCompletions = (newCompletions: HabitCompletion[]) => {
    setCompletions(newCompletions)
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(newCompletions))
  }

  const addHabit = (habit: Omit<Habit, 'id' | 'createdAt'>) => {
    const newHabit: Habit = {
      ...habit,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    saveHabits([...habits, newHabit])
    return newHabit
  }

  const deleteHabit = (id: string) => {
    saveHabits(habits.filter((h) => h.id !== id))
    // Also remove all completions for this habit
    saveCompletions(completions.filter((c) => c.habitId !== id))
  }

  const toggleCompletion = (habitId: string, date: string) => {
    const dateStr = date // Already in YYYY-MM-DD format
    const existing = completions.find(
      (c) => c.habitId === habitId && c.date === dateStr
    )

    let newCompletions: HabitCompletion[]
    if (existing) {
      // Toggle existing completion
      newCompletions = completions.map((c) =>
        c.habitId === habitId && c.date === dateStr
          ? { ...c, completed: !c.completed }
          : c
      )
    } else {
      // Create new completion
      newCompletions = [
        ...completions,
        { habitId, date: dateStr, completed: true },
      ]
    }

    saveCompletions(newCompletions)
  }

  const isCompleted = (habitId: string, date: string): boolean => {
    const completion = completions.find(
      (c) => c.habitId === habitId && c.date === date
    )
    return completion?.completed ?? false
  }

  const getCompletionRate = (habitId: string, month: Date): number => {
    const year = month.getFullYear()
    const monthNum = month.getMonth()
    const daysInMonth = new Date(year, monthNum + 1, 0).getDate()
    
    let completedDays = 0
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      if (isCompleted(habitId, dateStr)) {
        completedDays++
      }
    }
    
    return (completedDays / daysInMonth) * 100
  }

  const getMonthlyCompletions = (habitId: string, month: Date): number[] => {
    const year = month.getFullYear()
    const monthNum = month.getMonth()
    const daysInMonth = new Date(year, monthNum + 1, 0).getDate()
    
    const result: number[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      result.push(isCompleted(habitId, dateStr) ? 1 : 0)
    }
    
    return result
  }

  return {
    habits,
    completions,
    addHabit,
    deleteHabit,
    toggleCompletion,
    isCompleted,
    getCompletionRate,
    getMonthlyCompletions,
  }
}

