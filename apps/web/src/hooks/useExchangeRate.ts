'use client'

import { useState, useEffect } from 'react'

interface ExchangeRateData {
  rate: number
  lastUpdated: Date | null
  loading: boolean
  error: string | null
}

export function useExchangeRate() {
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateData>({
    rate: 18.3, // Fallback rate
    lastUpdated: null,
    loading: false,
    error: null,
  })

  const fetchExchangeRate = async () => {
    setExchangeRate(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      // Try ExchangeRate-API (free tier, no API key needed)
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          const rate = data.rates?.MXN
          
          if (rate && rate > 0) {
            setExchangeRate({
              rate,
              lastUpdated: new Date(),
              loading: false,
              error: null,
            })
            return
          }
        }
      } catch (e) {
        console.log('Primary API failed, trying alternatives...')
      }

      // Fallback: Try using a CORS proxy with Yahoo Finance or another source
      try {
        // Using exchangerate.host (free, no API key)
        const response = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=MXN')
        if (response.ok) {
          const data = await response.json()
          const rate = data.rates?.MXN
          
          if (rate && rate > 0) {
            setExchangeRate({
              rate,
              lastUpdated: new Date(),
              loading: false,
              error: null,
            })
            return
          }
        }
      } catch (e) {
        console.log('Fallback API also failed')
      }

      // If all APIs fail, keep the fallback rate
      throw new Error('Unable to fetch live rate')
    } catch (error) {
      console.error('Error fetching exchange rate:', error)
      setExchangeRate(prev => ({
        ...prev,
        loading: false,
        error: 'Using fallback rate',
      }))
    }
  }

  useEffect(() => {
    // Fetch immediately
    fetchExchangeRate()

    // Refresh every 5 minutes
    const interval = setInterval(fetchExchangeRate, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return {
    rate: exchangeRate.rate,
    lastUpdated: exchangeRate.lastUpdated,
    loading: exchangeRate.loading,
    error: exchangeRate.error,
    refresh: fetchExchangeRate,
  }
}

