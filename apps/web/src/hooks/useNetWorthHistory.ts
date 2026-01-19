'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface NetWorthSnapshot {
  id?: string
  date: string // ISO date string
  total_savings_usd: number
  total_savings_mxn: number
  total_investments_usd: number
  total_investments_mxn: number
  total_debt_usd: number
  total_debt_mxn: number
  net_debt_usd: number
  net_debt_mxn: number
  flight_training_usd: number
  flight_training_mxn: number
  total_retirement_usd: number
  total_retirement_mxn: number
  total_net_worth_usd: number
  total_net_worth_mxn: number
  created_at?: string
}

const NET_WORTH_HISTORY_KEY = 'jarvis_net_worth_history'

function isSupabaseConfigured(): boolean {
  return supabase !== null
}

async function loadFromSupabase(): Promise<NetWorthSnapshot[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('net_worth_history')
      .select('*')
      .order('date', { ascending: true })

    if (error) {
      console.error('Error loading net worth history from Supabase:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error loading net worth history from Supabase:', error)
    return []
  }
}

async function saveToSupabase(snapshot: NetWorthSnapshot): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false
  }

  try {
    const { error } = await supabase
      .from('net_worth_history')
      .upsert({
        id: snapshot.id,
        date: snapshot.date.split('T')[0], // Store only date part
        total_savings_usd: snapshot.total_savings_usd,
        total_savings_mxn: snapshot.total_savings_mxn,
        total_investments_usd: snapshot.total_investments_usd,
        total_investments_mxn: snapshot.total_investments_mxn,
        total_debt_usd: snapshot.total_debt_usd,
        total_debt_mxn: snapshot.total_debt_mxn,
        net_debt_usd: snapshot.net_debt_usd,
        net_debt_mxn: snapshot.net_debt_mxn,
        flight_training_usd: snapshot.flight_training_usd,
        flight_training_mxn: snapshot.flight_training_mxn,
        total_retirement_usd: snapshot.total_retirement_usd,
        total_retirement_mxn: snapshot.total_retirement_mxn,
        total_net_worth_usd: snapshot.total_net_worth_usd,
        total_net_worth_mxn: snapshot.total_net_worth_mxn,
      }, {
        onConflict: 'date', // Upsert based on date
      })

    if (error) {
      console.error('Error saving net worth history to Supabase:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving net worth history to Supabase:', error)
    return false
  }
}

export function useNetWorthHistory() {
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (isSupabaseConfigured()) {
        // Try Supabase first
        const supabaseData = await loadFromSupabase()
        if (supabaseData.length > 0) {
          setSnapshots(supabaseData)
          setIsLoaded(true)
          return
        }
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(NET_WORTH_HISTORY_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          console.log('Loaded net worth history from localStorage:', parsed.length)
          setSnapshots(parsed)
        } catch (e) {
          console.error('Failed to load net worth history:', e)
        }
      }
      setIsLoaded(true)
    }

    loadData()
  }, [])

  const addSnapshot = useCallback(async (snapshot: NetWorthSnapshot) => {
    const newSnapshot: NetWorthSnapshot = {
      ...snapshot,
      id: snapshot.id || crypto.randomUUID(),
    }

    // Try Supabase first
    if (isSupabaseConfigured()) {
      const saved = await saveToSupabase(newSnapshot)
      if (saved) {
        // Reload from Supabase to get the updated list
        const updated = await loadFromSupabase()
        setSnapshots(updated)
        return
      }
    }

    // Fallback to localStorage
    const newSnapshots = [...snapshots, newSnapshot].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    setSnapshots(newSnapshots)
    localStorage.setItem(NET_WORTH_HISTORY_KEY, JSON.stringify(newSnapshots))
    console.log('Saved net worth snapshot to localStorage')
  }, [snapshots])

  const getHistoricalData = useCallback((timeRange: '1W' | '1M' | '3M' | 'YTD' | 'ALL' = 'ALL') => {
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
  }, [snapshots])

  return {
    snapshots,
    isLoaded,
    addSnapshot,
    getHistoricalData,
  }
}
