'use client'

import { useState, useMemo } from 'react'
import { useWeight } from '@/hooks/useWeight'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Dot } from 'recharts'

export default function WeightTracker() {
  const {
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
    formatDate,
    seedMockData,
  } = useWeight()

  const [showWeightForm, setShowWeightForm] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [weightFormData, setWeightFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    notes: '',
  })
  const [goalFormData, setGoalFormData] = useState({
    weekStart: '',
    targetWeight: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const entriesPerPage = 10

  // Get all Sundays (milestones) for the chart
  const milestones = useMemo(() => {
    if (weightEntries.length === 0) return []
    
    const dates = weightEntries.map(e => new Date(e.date))
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
    
    // Extend range a bit for better visualization
    minDate.setDate(minDate.getDate() - 7)
    maxDate.setDate(maxDate.getDate() + 7)
    
    return getSundaysBetween(minDate, maxDate)
  }, [weightEntries, getSundaysBetween])

  // Prepare chart data with actual weight, ideal weight, and milestones
  const chartData = useMemo(() => {
    if (weightEntries.length === 0) return []

    const dataMap = new Map<string, { date: string; actualWeight?: number; idealWeight?: number; isMilestone: boolean }>()
    
    // Add all weight entries
    weightEntries.forEach(entry => {
      const date = entry.date
      const goal = getGoalForWeek(date)
      const dateObj = new Date(date)
      dataMap.set(date, {
        date,
        actualWeight: entry.weight,
        idealWeight: goal?.targetWeight,
        isMilestone: dateObj.getDay() === 0, // Sunday
      })
    })

    // Add all Sundays (milestones) even if no weight entry - this ensures ReferenceLines align properly
    milestones.forEach(sunday => {
      const dateStr = formatDate(sunday)
      if (!dataMap.has(dateStr)) {
        const goal = getGoalForWeek(dateStr)
        dataMap.set(dateStr, {
          date: dateStr,
          idealWeight: goal?.targetWeight,
          isMilestone: true,
        })
      } else {
        const existing = dataMap.get(dateStr)!
        dataMap.set(dateStr, { ...existing, isMilestone: true })
      }
    })

    // Convert to array and sort by date
    const sorted = Array.from(dataMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        ...item,
        dateFormatted: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }))
    
    return sorted
  }, [weightEntries, weeklyGoals, milestones, getGoalForWeek, formatDate])

  // Get all Sunday dates for milestone lines (only Sundays, not all dates)
  const sundayMilestones = useMemo(() => {
    if (chartData.length === 0) return []
    
    const sundays: { date: string; dateFormatted: string }[] = []
    
    // Get all dates from chart data
    const dates = chartData.map(d => new Date(d.date))
    if (dates.length === 0) return []
    
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
    
    // Extend range a bit
    minDate.setDate(minDate.getDate() - 7)
    maxDate.setDate(maxDate.getDate() + 7)
    
    // Find all Sundays in the range
    const current = new Date(minDate)
    while (current.getDay() !== 0) {
      current.setDate(current.getDate() + 1)
    }
    
    while (current <= maxDate) {
      const dateStr = formatDate(current)
      const dateFormatted = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      sundays.push({ date: dateStr, dateFormatted })
      current.setDate(current.getDate() + 7)
    }
    
    return sundays
  }, [chartData, formatDate])

  // Calculate Y-axis domain based on data range for better scaling
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 200]
    
    const allWeights: number[] = []
    chartData.forEach(item => {
      if (item.actualWeight !== undefined && item.actualWeight !== null) {
        allWeights.push(item.actualWeight)
      }
      if (item.idealWeight !== undefined && item.idealWeight !== null) {
        allWeights.push(item.idealWeight)
      }
    })
    
    if (allWeights.length === 0) return [0, 200]
    
    const minWeight = Math.min(...allWeights)
    const maxWeight = Math.max(...allWeights)
    const range = maxWeight - minWeight
    
    // Add 10% padding above and below, with minimum range of 10 lbs
    const padding = Math.max(range * 0.1, 5)
    const domainMin = Math.max(0, Math.floor(minWeight - padding))
    const domainMax = Math.ceil(maxWeight + padding)
    
    return [domainMin, domainMax]
  }, [chartData])

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!weightFormData.weight) return

    const weight = parseFloat(weightFormData.weight)
    if (isNaN(weight) || weight <= 0) return

    if (editingEntry) {
      updateWeightEntry(editingEntry, {
        date: weightFormData.date,
        weight,
        notes: weightFormData.notes || undefined,
      })
      setEditingEntry(null)
    } else {
      addWeightEntry({
        date: weightFormData.date,
        weight,
        notes: weightFormData.notes || undefined,
      })
    }

    setWeightFormData({
      date: new Date().toISOString().split('T')[0],
      weight: '',
      notes: '',
    })
    setShowWeightForm(false)
  }

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!goalFormData.weekStart || !goalFormData.targetWeight) return

    const targetWeight = parseFloat(goalFormData.targetWeight)
    if (isNaN(targetWeight) || targetWeight <= 0) return

    // Ensure weekStart is a Sunday
    const date = new Date(goalFormData.weekStart)
    const day = date.getDay()
    const diff = date.getDate() - day
    const sunday = new Date(date.setDate(diff))
    const sundayStr = formatDate(sunday)

    if (editingGoal) {
      updateWeeklyGoal(editingGoal, {
        weekStart: sundayStr,
        targetWeight,
      })
      setEditingGoal(null)
    } else {
      addWeeklyGoal({
        weekStart: sundayStr,
        targetWeight,
      })
    }

    setGoalFormData({
      weekStart: '',
      targetWeight: '',
    })
    setShowGoalForm(false)
  }

  const getSundayOfWeek = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setShowWeightForm(true)
            setEditingEntry(null)
            setWeightFormData({
              date: new Date().toISOString().split('T')[0],
              weight: '',
              notes: '',
            })
          }}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg smooth-transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Weight Entry
        </button>
        <button
          onClick={() => {
            setShowGoalForm(true)
            setEditingGoal(null)
            const nextSunday = getSundayOfWeek(new Date())
            setGoalFormData({
              weekStart: formatDate(nextSunday),
              targetWeight: '',
            })
          }}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 smooth-transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Set Weekly Goal
        </button>
        {weightEntries.length === 0 && (
          <button
            onClick={() => {
              if (confirm('This will add mock weight data. Continue?')) {
                seedMockData()
              }
            }}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 smooth-transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Load Mock Data
          </button>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Weight Progress</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid 
                  strokeDasharray="2 2" 
                  stroke="#e5e7eb" 
                  opacity={0.4}
                  vertical={true}
                  horizontal={true}
                />
                <XAxis 
                  dataKey="dateFormatted" 
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                />
                <YAxis 
                  domain={yAxisDomain}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={{ stroke: '#d1d5db' }}
                  label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                  allowDecimals={true}
                  tickFormatter={(value) => value.toFixed(1)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.98)",
                    border: "2px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: "12px",
                    padding: "12px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)"
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'actualWeight') return [`${value.toFixed(1)} lbs`, 'Actual Weight']
                    if (name === 'idealWeight') return [`${value.toFixed(1)} lbs`, 'Ideal Weight (Goal)']
                    return [value, name]
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="actualWeight"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  name="Actual Weight"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="idealWeight"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#10b981', r: 4 }}
                  name="Ideal Weight"
                  connectNulls
                />
                {/* Milestone markers (Sundays only) - Vertical lines */}
                {sundayMilestones.map((sunday, index) => {
                  // Check if there's a data point for this Sunday, otherwise use the formatted date
                  const dataPoint = chartData.find(d => d.date === sunday.date)
                  const xValue = dataPoint?.dateFormatted || sunday.dateFormatted
                  
                  return (
                    <ReferenceLine
                      key={`milestone-${sunday.date}-${index}`}
                      x={xValue}
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      strokeDasharray="6 4"
                      label={{ value: 'Sun', position: 'top', fill: '#f59e0b', fontSize: 9, fontWeight: 'bold' }}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span className="text-slate-600">Actual Weight</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-500 border-dashed"></div>
              <span className="text-slate-600">Ideal Weight (Goal)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-amber-500 border-dashed"></div>
              <span className="text-slate-600">Sunday Milestones</span>
            </div>
          </div>
        </div>
      )}

      {/* Weight Entry Form Modal */}
      {showWeightForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowWeightForm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {editingEntry ? 'Edit Weight Entry' : 'Add Weight Entry'}
            </h3>
            <form onSubmit={handleWeightSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                <input
                  type="date"
                  value={weightFormData.date}
                  onChange={(e) => setWeightFormData({ ...weightFormData, date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Weight (lbs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightFormData.weight}
                  onChange={(e) => setWeightFormData({ ...weightFormData, weight: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter weight"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Notes (optional)</label>
                <textarea
                  value={weightFormData.notes}
                  onChange={(e) => setWeightFormData({ ...weightFormData, notes: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any notes..."
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 smooth-transition"
                >
                  {editingEntry ? 'Update' : 'Add'} Entry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWeightForm(false)
                    setEditingEntry(null)
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 smooth-transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Weekly Goal Form Modal */}
      {showGoalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowGoalForm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {editingGoal ? 'Edit Weekly Goal' : 'Set Weekly Goal'}
            </h3>
            <form onSubmit={handleGoalSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Week Start (Sunday)</label>
                <input
                  type="date"
                  value={goalFormData.weekStart}
                  onChange={(e) => setGoalFormData({ ...goalFormData, weekStart: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Will automatically adjust to the Sunday of that week</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Target Weight (lbs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={goalFormData.targetWeight}
                  onChange={(e) => setGoalFormData({ ...goalFormData, targetWeight: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter target weight"
                  required
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 smooth-transition"
                >
                  {editingGoal ? 'Update' : 'Set'} Goal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGoalForm(false)
                    setEditingGoal(null)
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 smooth-transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Weight Entries Table */}
      {weightEntries.length > 0 && (() => {
        const totalPages = Math.ceil(weightEntries.length / entriesPerPage)
        const startIndex = (currentPage - 1) * entriesPerPage
        const endIndex = startIndex + entriesPerPage
        const paginatedEntries = weightEntries.slice().reverse().slice(startIndex, endIndex)
        
        return (
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/60 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                  <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Weight Entries</h3>
                </div>
                <div className="text-xs text-text-tertiary">
                  Showing {startIndex + 1}-{Math.min(endIndex, weightEntries.length)} of {weightEntries.length}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/60 bg-slate-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Weight (lbs)</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Notes</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {paginatedEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-blue-50/30 smooth-transition group">
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-primary">
                          {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className="text-sm font-semibold text-blue-600">{entry.weight.toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-secondary">{entry.notes || '—'}</span>
                      </td>
                      <td className="text-right px-4 py-3">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                          <button
                            onClick={() => {
                              setEditingEntry(entry.id)
                              setWeightFormData({
                                date: entry.date,
                                weight: entry.weight.toString(),
                                notes: entry.notes || '',
                              })
                              setShowWeightForm(true)
                            }}
                            className="text-text-tertiary hover:text-blue-600 text-xs px-2 py-1 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteWeightEntry(entry.id)}
                            className="text-text-tertiary hover:text-red-600 text-xs px-2 py-1 rounded"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-blue-50/30 font-semibold border-t-2 border-blue-200">
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-primary">Total Entries</span>
                    </td>
                    <td className="text-right px-4 py-3">
                      <span className="text-sm text-text-primary">{weightEntries.length}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-tertiary">—</span>
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200/60 bg-slate-50/30 flex items-center justify-between">
                <div className="text-xs text-text-tertiary">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg smooth-transition ${
                      currentPage === 1
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 text-xs font-semibold rounded-lg smooth-transition ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg smooth-transition ${
                      currentPage === totalPages
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Weekly Goals Table */}
      {weeklyGoals.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/60 bg-gradient-to-r from-green-50/50 to-emerald-50/50">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Weekly Goals</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/60 bg-slate-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Week Start (Sunday)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Target Weight (lbs)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {weeklyGoals.slice().reverse().map((goal) => (
                  <tr key={goal.id} className="hover:bg-green-50/30 smooth-transition group">
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-primary">
                        {new Date(goal.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3">
                      <span className="text-sm font-semibold text-green-600">{goal.targetWeight.toFixed(1)}</span>
                    </td>
                    <td className="text-right px-4 py-3">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 smooth-transition">
                        <button
                          onClick={() => {
                            setEditingGoal(goal.id)
                            setGoalFormData({
                              weekStart: goal.weekStart,
                              targetWeight: goal.targetWeight.toString(),
                            })
                            setShowGoalForm(true)
                          }}
                          className="text-text-tertiary hover:text-green-600 text-xs px-2 py-1 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteWeeklyGoal(goal.id)}
                          className="text-text-tertiary hover:text-red-600 text-xs px-2 py-1 rounded"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-green-50/30 font-semibold border-t-2 border-green-200">
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-primary">Total Goals</span>
                  </td>
                  <td className="text-right px-4 py-3">
                    <span className="text-sm text-text-primary">{weeklyGoals.length}</span>
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

