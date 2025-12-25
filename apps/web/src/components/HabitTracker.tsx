'use client'

import { useState, useMemo } from 'react'
import { useHabits, HabitType } from '@/hooks/useHabits'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

export default function HabitTracker() {
  const {
    habits,
    addHabit,
    deleteHabit,
    toggleCompletion,
    isCompleted,
    getCompletionRate,
    getMonthlyCompletions,
    completions,
  } = useHabits()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'build' as HabitType,
    icon: '',
  })

  // Generate list of months (last 12 months + current + next 12 months)
  const availableMonths = useMemo(() => {
    const months: Date[] = []
    const today = new Date()
    // Go back 12 months
    for (let i = 12; i >= 1; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      months.push(date)
    }
    // Current month
    months.push(new Date(today.getFullYear(), today.getMonth(), 1))
    // Next 12 months
    for (let i = 1; i <= 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1)
      months.push(date)
    }
    return months
  }, [])

  const year = currentMonth.getFullYear()
  const monthNum = currentMonth.getMonth()
  const daysInMonth = new Date(year, monthNum + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, monthNum, 1).getDay()

  // Get all days of the month with their day of week
  const monthDays = useMemo(() => {
    const days: { day: number; date: string; dayOfWeek: number; isToday: boolean }[] = []
    const today = new Date()
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthNum, day)
      const dateStr = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({
        day,
        date: dateStr,
        dayOfWeek: date.getDay(),
        isToday:
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear(),
      })
    }
    return days
  }, [year, monthNum, daysInMonth])

  // Calculate trend data (completion rate over time)
  const trendData = useMemo(() => {
    const data: { day: number; completion: number }[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      let completedCount = 0
      habits.forEach(habit => {
        if (isCompleted(habit.id, dateStr)) {
          completedCount++
        }
      })
      data.push({
        day,
        completion: habits.length > 0 ? (completedCount / habits.length) * 100 : 0,
      })
    }
    return data
  }, [habits, monthDays, isCompleted, year, monthNum])

  // Calculate habit type distribution for donut chart
  const habitTypeData = useMemo(() => {
    const buildCount = habits.filter(h => h.type === 'build').length
    const destroyCount = habits.filter(h => h.type === 'destroy').length
    const total = habits.length
    
    if (total === 0) return []
    
    return [
      { name: 'Build', value: buildCount, percentage: total > 0 ? ((buildCount / total) * 100).toFixed(1) : '0' },
      { name: 'Destroy', value: destroyCount, percentage: total > 0 ? ((destroyCount / total) * 100).toFixed(1) : '0' },
    ]
  }, [habits])

  // Calculate complete vs incomplete tasks
  const completionStats = useMemo(() => {
    let totalPossible = habits.length * daysInMonth
    let completed = 0
    
    habits.forEach(habit => {
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        if (isCompleted(habit.id, dateStr)) {
          completed++
        }
      }
    })
    
    return {
      completed,
      incomplete: totalPossible - completed,
    }
  }, [habits, daysInMonth, isCompleted, year, monthNum])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    addHabit({
      name: formData.name,
      type: formData.type,
      icon: formData.icon || undefined,
    })

    setFormData({ name: '', type: 'build', icon: '' })
    setShowForm(false)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentMonth(newDate)
  }

  const COLORS = ['#171c24', '#6b7280', '#d1d5db', '#f3f4f6']

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <div className="relative">
            <select
              value={`${year}-${String(monthNum + 1).padStart(2, '0')}`}
              onChange={(e) => {
                const [selectedYear, selectedMonth] = e.target.value.split('-').map(Number)
                setCurrentMonth(new Date(selectedYear, selectedMonth - 1, 1))
              }}
              className="appearance-none bg-white border border-graphite/10 rounded-full px-4 py-2 pr-8 text-sm text-graphite hover:text-ink focus:outline-none focus:border-ink/40 smooth-transition cursor-pointer"
            >
              {availableMonths.map((month) => {
                const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
                const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                const isCurrent = 
                  month.getMonth() === new Date().getMonth() &&
                  month.getFullYear() === new Date().getFullYear()
                return (
                  <option key={monthKey} value={monthKey}>
                    {monthLabel} {isCurrent ? '(Current)' : ''}
                  </option>
                )
              })}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-graphite/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="bg-white border border-graphite/10 rounded-full px-3 py-2 text-sm text-graphite hover:text-ink hover:border-graphite/30 smooth-transition"
          >
            Today
          </button>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-white border border-graphite/10 rounded-full px-4 py-2 text-sm text-graphite hover:text-ink hover:border-graphite/30 smooth-transition"
        >
          {showForm ? 'Cancel' : '+ Habit'}
        </button>
      </div>

      {/* Add Habit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border border-graphite/10 rounded-xl bg-white/60 backdrop-blur-sm p-4 space-y-3 animate-fade">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Habit name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="flex-1 px-3 py-1.5 rounded-lg border-0 bg-white/80 text-ink placeholder-graphite/40 focus:outline-none focus:ring-1 focus:ring-ink/20 smooth-transition text-sm"
              required
            />
            <input
              type="text"
              placeholder="Icon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-16 px-2 py-1.5 rounded-lg border-0 bg-white/80 text-ink placeholder-graphite/40 focus:outline-none focus:ring-1 focus:ring-ink/20 smooth-transition text-sm text-center"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-white/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'build' })}
                className={`px-3 py-1 rounded-md smooth-transition text-xs font-medium ${
                  formData.type === 'build'
                    ? 'bg-ink text-white'
                    : 'text-graphite/60 hover:text-ink'
                }`}
              >
                Build
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'destroy' })}
                className={`px-3 py-1 rounded-md smooth-transition text-xs font-medium ${
                  formData.type === 'destroy'
                    ? 'bg-ink text-white'
                    : 'text-graphite/60 hover:text-ink'
                }`}
              >
                Destroy
              </button>
            </div>
            <button
              type="submit"
              className="ml-auto px-4 py-1.5 bg-ink text-white rounded-lg font-medium hover:bg-ink/90 smooth-transition text-xs"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* Trend Chart */}
      {habits.length > 0 && trendData.length > 0 && (
        <div className="panel p-6">
          <h3 className="text-lg font-semibold text-ink mb-4">Completion Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(23, 28, 36, 0.1)" />
                <XAxis
                  dataKey="day"
                  stroke="rgba(23, 28, 36, 0.4)"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="rgba(23, 28, 36, 0.4)"
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(23, 28, 36, 0.1)',
                    borderRadius: '0.75rem',
                    padding: '0.5rem',
                  }}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Line
                  type="monotone"
                  dataKey="completion"
                  stroke="#171c24"
                  strokeWidth={2}
                  dot={{ fill: '#171c24', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Monthly Overview */}
        <div className="lg:col-span-1 space-y-6">
          <div className="panel p-6">
            <h3 className="text-xl font-semibold text-ink mb-2">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-sm text-graphite/60 mb-6">Monthly Overview</p>

            {/* Habit Types Donut Chart */}
            {habitTypeData.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-ink mb-4">Habit Types</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={habitTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {habitTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid rgba(23, 28, 36, 0.1)',
                          borderRadius: '0.75rem',
                        }}
                        formatter={(value: number, name: string, props: any) => [
                          `${props.payload.percentage}%`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {habitTypeData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-graphite/70">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Complete vs Incomplete Bar Chart */}
            {habits.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-ink mb-4">Complete vs. Incomplete Tasks</h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Complete', value: completionStats.completed },
                      { name: 'Incomplete', value: completionStats.incomplete },
                    ]} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(23, 28, 36, 0.1)" />
                      <XAxis
                        dataKey="name"
                        stroke="rgba(23, 28, 36, 0.4)"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        stroke="rgba(23, 28, 36, 0.4)"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid rgba(23, 28, 36, 0.1)',
                          borderRadius: '0.75rem',
                        }}
                      />
                      <Bar dataKey="value" fill="#171c24" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid - Habits and Days */}
        <div className="lg:col-span-3">
          {habits.length === 0 ? (
            <div className="panel p-12 text-center">
              <p className="text-graphite/60 text-lg mb-2">No habits yet</p>
              <p className="text-graphite/40 text-sm">Add your first habit to start tracking</p>
            </div>
          ) : (
            <div className="panel p-2">
              <table className="w-full border-collapse" style={{ fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1 text-[9px] font-semibold text-graphite/70 uppercase border-b border-graphite/10" style={{ width: '100px', minWidth: '100px' }}>
                      Habit
                    </th>
                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <th key={`empty-day-header-${i}`} className="px-0 py-1 border-b border-graphite/10"></th>
                    ))}
                    {/* Day letters - one per day, directly above each date */}
                    {monthDays.map(({ dayOfWeek, day }) => {
                      const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                      return (
                        <th
                          key={`day-letter-${day}`}
                          className="text-center px-0 py-1 text-[8px] font-semibold text-graphite/70 uppercase border-b border-graphite/10"
                        >
                          {dayLetters[dayOfWeek]}
                        </th>
                      )
                    })}
                  </tr>
                  <tr>
                    <th className="text-left px-2 py-0.5 border-b border-graphite/10"></th>
                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <th key={`empty-date-header-${i}`} className="px-0 py-0.5 border-b border-graphite/10"></th>
                    ))}
                    {/* Date headers */}
                    {monthDays.map(({ day }) => {
                      const isToday =
                        day === new Date().getDate() &&
                        currentMonth.getMonth() === new Date().getMonth() &&
                        currentMonth.getFullYear() === new Date().getFullYear()
                      return (
                        <th
                          key={day}
                          className={`text-center px-0 py-0.5 text-[8px] font-medium text-graphite/60 border-b border-graphite/10 ${
                            isToday ? 'text-ink font-semibold bg-amber/10' : ''
                          }`}
                        >
                          {day}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {habits.map((habit, habitIndex) => (
                    <tr key={habit.id} className="border-b border-graphite/5 hover:bg-white/50">
                      <td className="px-2 py-1 sticky left-0 bg-white z-10" style={{ width: '100px', minWidth: '100px' }}>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px]">{habit.icon || '✓'}</span>
                          <span className="text-[10px] font-medium text-ink truncate">{habit.name}</span>
                          <button
                            onClick={() => deleteHabit(habit.id)}
                            className="ml-auto text-graphite/40 hover:text-ink smooth-transition flex-shrink-0"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      {/* Empty cells for days before month starts */}
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <td key={`empty-${habit.id}-${i}`} className="px-0 py-0.5"></td>
                      ))}
                      {/* Checkboxes for each day */}
                      {monthDays.map(({ date, day }) => {
                        const completed = isCompleted(habit.id, date)
                        const isToday =
                          day === new Date().getDate() &&
                          currentMonth.getMonth() === new Date().getMonth() &&
                          currentMonth.getFullYear() === new Date().getFullYear()
                        
                        return (
                          <td key={date} className="text-center px-0 py-0.5">
                            <button
                              onClick={() => toggleCompletion(habit.id, date)}
                              className={`w-3.5 h-3.5 rounded border smooth-transition flex items-center justify-center mx-auto ${
                                completed
                                  ? 'bg-ink border-ink text-white'
                                  : isToday
                                  ? 'border-amber/40 bg-amber/10 hover:border-ink/30'
                                  : 'border-graphite/20 bg-white hover:border-ink/30'
                              }`}
                            >
                              {completed && (
                                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
