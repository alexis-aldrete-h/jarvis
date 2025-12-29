'use client'

import { supabase } from '@/lib/supabase'
import { useState, useEffect, useCallback } from 'react'

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  return supabase !== null
}

// Get date key in format YYYY-MM-DD
const getDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Load notes for a specific date from Supabase
export const loadNotesFromSupabase = async (date: Date): Promise<string> => {
  if (!isSupabaseConfigured()) {
    return ''
  }

  try {
    const dateKey = getDateKey(date)
    const { data, error } = await supabase
      .from('daily_notes')
      .select('notes')
      .eq('date', dateKey)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found, return empty string
        return ''
      }
      console.error('Error loading notes from Supabase:', error)
      return ''
    }

    return data?.notes || ''
  } catch (error) {
    console.error('Exception loading notes from Supabase:', error)
    return ''
  }
}

// Save notes for a specific date to Supabase
export const saveNotesToSupabase = async (date: Date, notes: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false
  }

  try {
    const dateKey = getDateKey(date)
    const id = `note-${dateKey}`

    const { error } = await supabase
      .from('daily_notes')
      .upsert({
        id,
        date: dateKey,
        notes,
      }, {
        onConflict: 'date'
      })

    if (error) {
      console.error('Error saving notes to Supabase:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Exception saving notes to Supabase:', error)
    return false
  }
}

// Hook to manage daily notes with Supabase and localStorage fallback
export function useDailyNotes(selectedDate: Date) {
  const [notes, setNotes] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // Load notes on mount and when date changes
  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true)
      
      // Try loading from Supabase first
      const supabaseNotes = await loadNotesFromSupabase(selectedDate)
      
      if (supabaseNotes) {
        setNotes(supabaseNotes)
        // Also save to localStorage as backup
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('jarvis_today_notes')
          let parsed: Record<string, string> = {}
          if (stored) {
            try {
              parsed = JSON.parse(stored)
            } catch (e) {
              parsed = {}
            }
          }
          const dateKey = getDateKey(selectedDate)
          parsed[dateKey] = supabaseNotes
          localStorage.setItem('jarvis_today_notes', JSON.stringify(parsed))
        }
      } else {
        // Fallback to localStorage if Supabase has no data
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('jarvis_today_notes')
          if (stored) {
            try {
              const parsed = JSON.parse(stored)
              const dateKey = getDateKey(selectedDate)
              setNotes(parsed[dateKey] || '')
            } catch (e) {
              setNotes('')
            }
          } else {
            setNotes('')
          }
        } else {
          setNotes('')
        }
      }
      
      setIsLoading(false)
    }

    loadNotes()
  }, [selectedDate])

  // Save notes function
  const saveNotes = useCallback(async (newNotes: string) => {
    setNotes(newNotes)
    
    // Save to localStorage immediately (backup)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('jarvis_today_notes')
      let parsed: Record<string, string> = {}
      if (stored) {
        try {
          parsed = JSON.parse(stored)
        } catch (e) {
          parsed = {}
        }
      }
      const dateKey = getDateKey(selectedDate)
      parsed[dateKey] = newNotes
      localStorage.setItem('jarvis_today_notes', JSON.stringify(parsed))
    }

    // Save to Supabase (async, non-blocking)
    try {
      await saveNotesToSupabase(selectedDate, newNotes)
    } catch (error) {
      console.error('Failed to save notes to Supabase:', error)
    }
  }, [selectedDate])

  return {
    notes,
    setNotes: saveNotes,
    isLoading,
  }
}

