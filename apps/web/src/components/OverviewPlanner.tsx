"use client"

import React, { useMemo, useState, useEffect } from "react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line } from 'recharts'

const dayKeys = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const

type DayData = {
  dietCalories: number
  workoutCalories: number
  vitalsCalories: number // Calories burned from vitals/activity
  expectedLoss?: number // Expected calorie loss for the day
}

const STORAGE_KEY = 'jarvis_health_overview'
const EXPECTED_LOSS_KEY = 'jarvis_health_expected_loss'
const WEIGHT_TRACKER_KEY = 'jarvis_health_weight_tracker'
const CALORIES_PER_KG = 7000 // 7000 calories = 1 kg

// Helper function to get meal calories (matching DietPlanner structure)
const getMealCalories = (mealId: string): number => {
  const mealCalories: Record<string, number> = {
    "meal-huevos": 243,
    "meal-picamix": 243,
    "meal-tortitas": 243,
    "meal-palomitas": 243,
    "meal-tostadas": 243,
    "meal-hotcakes": 243,
    "meal-chilaquiles": 243,
    "meal-huevos-cocidos": 243,
  }
  return mealCalories[mealId] || 0
}

// Helper function to get workout calories (matching WorkoutPlanner structure)
const getWorkoutCalories = (workoutId: string): number => {
  const workoutCalories: Record<string, number> = {
    "workout-upper": 350,
    "workout-lower": 400,
    "workout-cardio": 500,
    "workout-full": 450,
    "workout-yoga": 150,
    "workout-hiit": 300,
    "workout-core": 200,
    "workout-stretch": 100,
  }
  return workoutCalories[workoutId] || 0
}

export default function OverviewPlanner() {
  const [weekData, setWeekData] = useState<Record<(typeof dayKeys)[number], DayData>>(() => {
    // Load from localStorage or initialize
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          // Ensure expectedLoss exists for all days
          dayKeys.forEach(day => {
            if (!parsed[day] || parsed[day].expectedLoss === undefined) {
              parsed[day] = {
                ...parsed[day],
                expectedLoss: 0,
              }
            }
          })
          return parsed
        } catch (e) {
          console.error('Failed to parse stored overview data:', e)
        }
      }
    }
    // Initialize with default values
    const defaultData: Record<(typeof dayKeys)[number], DayData> = {} as any
    dayKeys.forEach(day => {
      defaultData[day] = {
        dietCalories: 0,
        workoutCalories: 0,
        vitalsCalories: 0,
        expectedLoss: 0,
      }
    })
    return defaultData
  })

  const [weeklyExpectedLoss, setWeeklyExpectedLoss] = useState<number>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(EXPECTED_LOSS_KEY)
      if (stored) {
        try {
          return parseFloat(stored) || 0
        } catch (e) {
          console.error('Failed to parse expected loss:', e)
        }
      }
    }
    return 0
  })

  const [trackerView, setTrackerView] = useState<'calories' | 'weight'>('calories')
  
  const [weightData, setWeightData] = useState(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(WEIGHT_TRACKER_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          return {
            currentWeight: parsed.currentWeight || 0,
            targetWeight: parsed.targetWeight || 0,
            startingWeight: parsed.startingWeight || parsed.currentWeight || 0,
          }
        } catch (e) {
          console.error('Failed to parse weight data:', e)
        }
      }
    }
    return {
      currentWeight: 0,
      targetWeight: 0,
      startingWeight: 0,
    }
  })

  // Load data from DietPlanner and WorkoutPlanner
  useEffect(() => {
    const loadData = () => {
      // Load diet data
      const dietData = localStorage.getItem('jarvis_diet_schedule')
      if (dietData) {
        try {
          const schedule = JSON.parse(dietData)
          setWeekData(prev => {
            const updated = { ...prev }
            dayKeys.forEach(day => {
              if (schedule[day]) {
                let totalCalories = 0
                Object.values(schedule[day]).forEach((mealId: any) => {
                  if (mealId) {
                    // Get meal calories from default meals
                    const meal = getMealCalories(mealId)
                    totalCalories += meal
                  }
                })
                updated[day].dietCalories = totalCalories
              }
            })
            return updated
          })
        } catch (e) {
          console.error('Failed to load diet data:', e)
        }
      }

      // Load workout data
      const workoutData = localStorage.getItem('jarvis_workout_schedule')
      if (workoutData) {
        try {
          const schedule = JSON.parse(workoutData)
          setWeekData(prev => {
            const updated = { ...prev }
            dayKeys.forEach(day => {
              if (schedule[day]) {
                let totalCalories = 0
                Object.values(schedule[day]).forEach((workoutId: any) => {
                  if (workoutId) {
                    const calories = getWorkoutCalories(workoutId)
                    totalCalories += calories
                  }
                })
                updated[day].workoutCalories = totalCalories
              }
            })
            return updated
          })
        } catch (e) {
          console.error('Failed to load workout data:', e)
        }
      }
    }

    loadData()
    
    // Listen for storage changes to update when diet/workout planners change
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jarvis_diet_schedule' || e.key === 'jarvis_workout_schedule') {
        loadData()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Also poll for changes (since storage event doesn't fire in same window)
    const interval = setInterval(loadData, 1000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  // Save to localStorage whenever weekData changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(weekData))
    }
  }, [weekData])

  // Save weight data to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(WEIGHT_TRACKER_KEY, JSON.stringify(weightData))
    }
  }, [weightData])

  const handleVitalsChange = (day: (typeof dayKeys)[number], value: string) => {
    const numValue = parseFloat(value) || 0
    setWeekData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        vitalsCalories: numValue,
      }
    }))
  }

  const handleExpectedLossChange = (day: (typeof dayKeys)[number], value: string) => {
    const numValue = parseFloat(value) || 0
    setWeekData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        expectedLoss: numValue,
      }
    }))
  }

  const handleWeeklyExpectedLossChange = (value: string) => {
    const numValue = parseFloat(value) || 0
    setWeeklyExpectedLoss(numValue)
    if (typeof window !== 'undefined') {
      localStorage.setItem(EXPECTED_LOSS_KEY, numValue.toString())
    }
  }

  const dailyTotals = useMemo(() => {
    const totals: Record<(typeof dayKeys)[number], { consumed: number; burned: number; net: number; actualLoss: number; expectedLoss: number }> = {} as any
    dayKeys.forEach(day => {
      const consumed = weekData[day].dietCalories
      const burned = weekData[day].workoutCalories + weekData[day].vitalsCalories
      const net = consumed - burned
      const actualLoss = net < 0 ? Math.abs(net) : 0 // Only count negative net as loss
      const expectedLoss = weekData[day].expectedLoss || 0
      totals[day] = { consumed, burned, net, actualLoss, expectedLoss }
    })
    return totals
  }, [weekData])

  const weeklyTotal = useMemo(() => {
    const totalConsumed = dayKeys.reduce((sum, day) => sum + dailyTotals[day].consumed, 0)
    const totalBurned = dayKeys.reduce((sum, day) => sum + dailyTotals[day].burned, 0)
    const netTotal = totalConsumed - totalBurned
    const actualLoss = netTotal < 0 ? Math.abs(netTotal) : 0
    const expectedLoss = weeklyExpectedLoss || dayKeys.reduce((sum, day) => sum + (dailyTotals[day].expectedLoss || 0), 0)
    return { consumed: totalConsumed, burned: totalBurned, net: netTotal, actualLoss, expectedLoss }
  }, [dailyTotals, weeklyExpectedLoss])

  // Prepare chart data for calories
  const calorieChartData = useMemo(() => {
    return dayKeys.map(day => {
      const dayTotal = dailyTotals[day]
      const expected = dayTotal.expectedLoss || (weeklyExpectedLoss / 7)
      const actual = dayTotal.actualLoss
      return {
        day: day.substring(0, 3), // Short day name
        'Expected Loss': Math.round(expected),
        'Actual Loss': Math.round(actual),
      }
    })
  }, [dailyTotals, weeklyExpectedLoss])

  // Calculate weight loss from calories (7000 cal = 1 kg)
  const weightLossData = useMemo(() => {
    const cumulativeExpected = 0
    const cumulativeActual = 0
    
    return dayKeys.map((day, index) => {
      const dayTotal = dailyTotals[day]
      const expected = dayTotal.expectedLoss || (weeklyExpectedLoss / 7)
      const actual = dayTotal.actualLoss
      
      // Calculate cumulative weight loss
      const expectedKg = (expected / CALORIES_PER_KG)
      const actualKg = (actual / CALORIES_PER_KG)
      
      // Calculate cumulative from start of week
      const prevDays = dayKeys.slice(0, index)
      const cumulativeExpectedKg = prevDays.reduce((sum, d) => {
        const dt = dailyTotals[d]
        const exp = dt.expectedLoss || (weeklyExpectedLoss / 7)
        return sum + (exp / CALORIES_PER_KG)
      }, 0) + expectedKg
      
      const cumulativeActualKg = prevDays.reduce((sum, d) => {
        const dt = dailyTotals[d]
        return sum + (dt.actualLoss / CALORIES_PER_KG)
      }, 0) + actualKg
      
      return {
        day: day.substring(0, 3),
        'Expected Weight Loss (kg)': Math.round(cumulativeExpectedKg * 100) / 100,
        'Actual Weight Loss (kg)': Math.round(cumulativeActualKg * 100) / 100,
        'Daily Expected': Math.round(expectedKg * 100) / 100,
        'Daily Actual': Math.round(actualKg * 100) / 100,
      }
    })
  }, [dailyTotals, weeklyExpectedLoss])

  // Calculate total weight loss
  const totalWeightLoss = useMemo(() => {
    const totalExpectedCalories = weeklyTotal.expectedLoss
    const totalActualCalories = weeklyTotal.actualLoss
    
    return {
      expectedKg: totalExpectedCalories / CALORIES_PER_KG,
      actualKg: totalActualCalories / CALORIES_PER_KG,
    }
  }, [weeklyTotal])

  return (
    <div className="min-h-screen bg-white text-[#1c1c1c] px-0">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6 w-full">
          <div className="text-2xl font-semibold text-[#a00060]">Weekly Overview</div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">
              <span className="font-semibold">Net Calories:</span>{" "}
              <span className={`text-lg font-bold ${weeklyTotal.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {weeklyTotal.net > 0 ? '+' : ''}{weeklyTotal.net.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Calendar Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="grid grid-cols-7 gap-3">
            {dayKeys.map((day) => {
              const dayData = weekData[day]
              const totals = dailyTotals[day]
              
              return (
                <div
                  key={day}
                  className="border border-slate-200 rounded-xl p-3 bg-white hover:shadow-md transition-shadow"
                >
                  {/* Day Header */}
                  <div className="text-center mb-3">
                    <div className="text-sm font-semibold text-slate-800 mb-1">{day}</div>
                    <div className={`text-xs font-bold ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Net: {totals.net > 0 ? '+' : ''}{totals.net}
                    </div>
                  </div>

                  {/* Diet Calories */}
                  <div className="mb-2">
                    <label className="text-[10px] text-slate-500 mb-1 block">Diet (cal)</label>
                    <div className="text-sm font-semibold text-blue-600 bg-blue-50 rounded px-2 py-1 text-center">
                      {dayData.dietCalories}
                    </div>
                  </div>

                  {/* Workout Calories */}
                  <div className="mb-2">
                    <label className="text-[10px] text-slate-500 mb-1 block">Workout (cal)</label>
                    <div className="text-sm font-semibold text-purple-600 bg-purple-50 rounded px-2 py-1 text-center">
                      {dayData.workoutCalories}
                    </div>
                  </div>

                  {/* Vitals Calories Input */}
                  <div className="mb-2">
                    <label className="text-[10px] text-slate-500 mb-1 block">Vitals (cal)</label>
                    <input
                      type="number"
                      value={dayData.vitalsCalories || ''}
                      onChange={(e) => handleVitalsChange(day, e.target.value)}
                      placeholder="0"
                      className="w-full text-sm font-semibold text-orange-600 bg-orange-50 rounded px-2 py-1 text-center border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>

                  {/* Expected Loss Input */}
                  <div className="mb-2">
                    <label className="text-[10px] text-slate-500 mb-1 block">Expected Loss (cal)</label>
                    <input
                      type="number"
                      value={dayData.expectedLoss || ''}
                      onChange={(e) => handleExpectedLossChange(day, e.target.value)}
                      placeholder="0"
                      className="w-full text-sm font-semibold text-indigo-600 bg-indigo-50 rounded px-2 py-1 text-center border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>

                  {/* Daily Summary */}
                  <div className="mt-3 pt-2 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-1 text-[9px] mb-1">
                      <div>
                        <div className="text-slate-500">Consumed</div>
                        <div className="font-semibold text-slate-800">{totals.consumed}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Burned</div>
                        <div className="font-semibold text-slate-800">{totals.burned}</div>
                      </div>
                    </div>
                    {totals.expectedLoss > 0 && (
                      <div className="mt-1 pt-1 border-t border-slate-100">
                        {trackerView === 'calories' ? (
                          <div className="text-[9px] text-slate-500">Loss: <span className="font-semibold text-slate-800">{Math.round(totals.actualLoss)}</span> / <span className="font-semibold text-indigo-600">{Math.round(totals.expectedLoss)}</span> cal</div>
                        ) : (
                          <div className="text-[9px] text-slate-500">
                            Loss: <span className="font-semibold text-slate-800">{(totals.actualLoss / CALORIES_PER_KG).toFixed(2)}</span> / <span className="font-semibold text-indigo-600">{(totals.expectedLoss / CALORIES_PER_KG).toFixed(2)}</span> kg
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Weekly Summary */}
          <div className="mt-6 pt-4 border-t border-slate-300">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Total Consumed</div>
                <div className="text-2xl font-bold text-blue-600">{weeklyTotal.consumed.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Total Burned</div>
                <div className="text-2xl font-bold text-red-600">{weeklyTotal.burned.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Net Calories</div>
                <div className={`text-2xl font-bold ${weeklyTotal.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {weeklyTotal.net > 0 ? '+' : ''}{weeklyTotal.net.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Daily Average</div>
                <div className={`text-2xl font-bold ${weeklyTotal.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {weeklyTotal.net > 0 ? '+' : ''}{Math.round(weeklyTotal.net / 7).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calorie/Weight Loss Tracker */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              {trackerView === 'calories' ? 'Calorie Loss Tracker' : 'Weight Loss Tracker'}
            </h3>
            <div className="flex items-center gap-4">
              {/* Toggle View */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setTrackerView('calories')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    trackerView === 'calories'
                      ? 'bg-white text-[#a00060] shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Calories
                </button>
                <button
                  onClick={() => setTrackerView('weight')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    trackerView === 'weight'
                      ? 'bg-white text-[#a00060] shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Weight
                </button>
              </div>
              
              {trackerView === 'calories' ? (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">Weekly Target:</label>
                  <input
                    type="number"
                    value={weeklyExpectedLoss || ''}
                    onChange={(e) => handleWeeklyExpectedLossChange(e.target.value)}
                    placeholder="0"
                    className="w-24 text-sm font-semibold text-slate-800 bg-slate-50 rounded px-3 py-1.5 text-center border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#a00060]"
                  />
                  <span className="text-sm text-slate-500">cal</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Current Weight:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weightData.currentWeight || ''}
                      onChange={(e) => setWeightData(prev => ({ ...prev, currentWeight: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-20 text-sm font-semibold text-slate-800 bg-slate-50 rounded px-2 py-1.5 text-center border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#a00060]"
                    />
                    <span className="text-sm text-slate-500">kg</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Target Weight:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weightData.targetWeight || ''}
                      onChange={(e) => setWeightData(prev => ({ ...prev, targetWeight: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-20 text-sm font-semibold text-slate-800 bg-slate-50 rounded px-2 py-1.5 text-center border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#a00060]"
                    />
                    <span className="text-sm text-slate-500">kg</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="mb-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
            <h4 className="text-sm font-semibold text-slate-700 mb-4 text-center">
              {trackerView === 'calories' ? 'Daily Calorie Loss Comparison' : 'Daily Weight Loss Comparison'}
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              {trackerView === 'calories' ? (
                <BarChart data={calorieChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#64748b"
                    fontSize={12}
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tick={{ fill: '#64748b' }}
                    label={{ value: 'Calories', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} cal`, '']}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="rect"
                  />
                  <Bar 
                    dataKey="Expected Loss" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    name="Expected Loss"
                  />
                  <Bar 
                    dataKey="Actual Loss" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                    name="Actual Loss"
                  />
                </BarChart>
              ) : (
                <LineChart data={weightLossData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#64748b"
                    fontSize={12}
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tick={{ fill: '#64748b' }}
                    label={{ value: 'Weight Loss (kg)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)} kg`, '']}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Expected Weight Loss (kg)" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="Expected Weight Loss"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Actual Weight Loss (kg)" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="Actual Weight Loss"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
            <div className="mt-4 text-xs text-slate-500 text-center">
              {trackerView === 'calories' ? (
                <>
                  <span className="inline-flex items-center gap-1 mr-4">
                    <span className="w-3 h-3 rounded bg-blue-500"></span> Expected
                  </span>
                  <span className="inline-flex items-center gap-1 mr-4">
                    <span className="w-3 h-3 rounded bg-green-500"></span> Actual
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 mr-4">
                    <span className="w-3 h-3 rounded bg-blue-500"></span> Expected
                  </span>
                  <span className="inline-flex items-center gap-1 mr-4">
                    <span className="w-3 h-3 rounded bg-green-500"></span> Actual
                  </span>
                  <span className="text-slate-400 ml-4">(Based on 7000 cal = 1 kg)</span>
                </>
              )}
            </div>
          </div>

          {/* Weekly Comparison */}
          <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl">
            {trackerView === 'calories' ? (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-slate-600 mb-2">Expected Loss</div>
                    <div className="text-3xl font-bold text-blue-600">{weeklyTotal.expectedLoss.toLocaleString()} cal</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-2">Actual Loss</div>
                    <div className={`text-3xl font-bold ${weeklyTotal.actualLoss > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                      {weeklyTotal.actualLoss.toLocaleString()} cal
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {weeklyTotal.expectedLoss > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Progress</span>
                      <span>
                        {weeklyTotal.expectedLoss > 0 
                          ? `${Math.min(100, Math.round((weeklyTotal.actualLoss / weeklyTotal.expectedLoss) * 100))}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          weeklyTotal.actualLoss >= weeklyTotal.expectedLoss
                            ? 'bg-green-500'
                            : weeklyTotal.actualLoss > 0
                            ? 'bg-yellow-500'
                            : 'bg-slate-300'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, (weeklyTotal.actualLoss / weeklyTotal.expectedLoss) * 100))}%`
                        }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {weeklyTotal.actualLoss >= weeklyTotal.expectedLoss ? (
                        <span className="text-green-600 font-semibold">✓ Target achieved!</span>
                      ) : weeklyTotal.actualLoss > 0 ? (
                        <span className="text-yellow-600">
                          {Math.round(weeklyTotal.expectedLoss - weeklyTotal.actualLoss).toLocaleString()} cal remaining
                        </span>
                      ) : (
                        <span className="text-slate-400">No calorie deficit yet</span>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <div className="text-sm text-slate-600 mb-2">Expected Weight Loss</div>
                    <div className="text-3xl font-bold text-blue-600">{totalWeightLoss.expectedKg.toFixed(2)} kg</div>
                    <div className="text-xs text-slate-500 mt-1">
                      ({weeklyTotal.expectedLoss.toLocaleString()} cal)
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-2">Actual Weight Loss</div>
                    <div className={`text-3xl font-bold ${totalWeightLoss.actualKg > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                      {totalWeightLoss.actualKg.toFixed(2)} kg
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      ({weeklyTotal.actualLoss.toLocaleString()} cal)
                    </div>
                  </div>
                </div>

                {/* Weight Progress */}
                {weightData.currentWeight > 0 && weightData.targetWeight > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Current Weight</div>
                        <div className="text-lg font-bold text-slate-800">{weightData.currentWeight} kg</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Target Weight</div>
                        <div className="text-lg font-bold text-blue-600">{weightData.targetWeight} kg</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Remaining</div>
                        <div className={`text-lg font-bold ${(weightData.currentWeight - weightData.targetWeight) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {Math.abs(weightData.currentWeight - weightData.targetWeight).toFixed(1)} kg
                        </div>
                      </div>
                    </div>
                    {weeklyTotal.expectedLoss > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                          <span>Weight Loss Progress</span>
                          <span>
                            {totalWeightLoss.expectedKg > 0 
                              ? `${Math.min(100, Math.round((totalWeightLoss.actualKg / totalWeightLoss.expectedKg) * 100))}%`
                              : '0%'}
                          </span>
                        </div>
                        <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              totalWeightLoss.actualKg >= totalWeightLoss.expectedKg
                                ? 'bg-green-500'
                                : totalWeightLoss.actualKg > 0
                                ? 'bg-yellow-500'
                                : 'bg-slate-300'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(0, (totalWeightLoss.actualKg / totalWeightLoss.expectedKg) * 100))}%`
                            }}
                          />
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {totalWeightLoss.actualKg >= totalWeightLoss.expectedKg ? (
                            <span className="text-green-600 font-semibold">✓ Weekly target achieved!</span>
                          ) : totalWeightLoss.actualKg > 0 ? (
                            <span className="text-yellow-600">
                              {(totalWeightLoss.expectedKg - totalWeightLoss.actualKg).toFixed(2)} kg remaining
                            </span>
                          ) : (
                            <span className="text-slate-400">No weight loss yet</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Daily Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Daily Breakdown</h4>
            <div className="grid grid-cols-7 gap-2">
              {dayKeys.map((day) => {
                const dayTotal = dailyTotals[day]
                const expected = dayTotal.expectedLoss || (weeklyExpectedLoss / 7)
                const actual = dayTotal.actualLoss
                const percentage = expected > 0 ? Math.min(100, (actual / expected) * 100) : 0
                
                // Weight calculations
                const expectedKg = expected / CALORIES_PER_KG
                const actualKg = actual / CALORIES_PER_KG
                const weightPercentage = expectedKg > 0 ? Math.min(100, (actualKg / expectedKg) * 100) : 0
                
                return (
                  <div key={day} className="border border-slate-200 rounded-lg p-2 bg-white">
                    <div className="text-[10px] font-semibold text-slate-600 mb-1 text-center">{day}</div>
                    <div className="space-y-1">
                      {trackerView === 'calories' ? (
                        <>
                          <div>
                            <div className="text-[9px] text-slate-500">Expected</div>
                            <div className="text-xs font-bold text-blue-600">{Math.round(expected)} cal</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-500">Actual</div>
                            <div className={`text-xs font-bold ${actual > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                              {Math.round(actual)} cal
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <div className="text-[9px] text-slate-500">Expected</div>
                            <div className="text-xs font-bold text-blue-600">{expectedKg.toFixed(2)} kg</div>
                            <div className="text-[8px] text-slate-400">{Math.round(expected)} cal</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-500">Actual</div>
                            <div className={`text-xs font-bold ${actualKg > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                              {actualKg.toFixed(2)} kg
                            </div>
                            <div className="text-[8px] text-slate-400">{Math.round(actual)} cal</div>
                          </div>
                        </>
                      )}
                      <div className="mt-1">
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              (trackerView === 'calories' ? actual : actualKg) >= (trackerView === 'calories' ? expected : expectedKg)
                                ? 'bg-green-500'
                                : (trackerView === 'calories' ? actual : actualKg) > 0
                                ? 'bg-yellow-500'
                                : 'bg-slate-300'
                            }`}
                            style={{ 
                              width: `${Math.min(100, trackerView === 'calories' ? percentage : weightPercentage)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Daily Expected Loss Inputs */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Set Daily Expected Loss</h4>
            <div className="grid grid-cols-7 gap-2">
              {dayKeys.map((day) => (
                <div key={day} className="space-y-1">
                  <label className="text-[10px] text-slate-500 block text-center">{day}</label>
                  <input
                    type="number"
                    value={weekData[day].expectedLoss || ''}
                    onChange={(e) => handleExpectedLossChange(day, e.target.value)}
                    placeholder="0"
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 rounded px-2 py-1 text-center border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#a00060]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

