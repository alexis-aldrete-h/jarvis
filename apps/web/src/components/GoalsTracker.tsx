'use client'

import { useState } from 'react'
import HabitTracker from './HabitTracker'
import WeightTracker from './WeightTracker'
import { useWeight } from '@/hooks/useWeight'
import { useHabits } from '@/hooks/useHabits'

export default function GoalsTracker() {
  const [activeView, setActiveView] = useState<'summary' | 'habits' | 'weight'>('summary')
  const { weightEntries, weeklyGoals, seedMockData: seedWeightData } = useWeight()
  const { habits } = useHabits()
  
  // Get current weight (most recent entry)
  const currentWeight = weightEntries.length > 0 
    ? weightEntries[weightEntries.length - 1].weight 
    : null
  
  // Get current goal (most recent goal)
  const currentGoal = weeklyGoals.length > 0
    ? weeklyGoals[weeklyGoals.length - 1].targetWeight
    : null

  const menuItems = [
    {
      id: 'summary' as const,
      label: 'Summary',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="12" width="4" height="6" fill="#000000" rx="1"/>
          <rect x="10" y="8" width="4" height="10" fill="#000000" rx="1"/>
          <rect x="16" y="4" width="4" height="14" fill="#000000" rx="1"/>
        </svg>
      )
    },
    {
      id: 'habits' as const,
      label: 'Habit Tracker',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      )
    },
    {
      id: 'weight' as const,
      label: 'Weight Tracker',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2v20M8 4h8M8 20h8" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="7" r="2" fill="#000000"/>
          <circle cx="12" cy="17" r="2" fill="#000000"/>
        </svg>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Navigation Menu */}
      <div className="flex items-center gap-2 border-b border-slate-200/60 pb-0">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium smooth-transition border-b-2 ${
              activeView === item.id
                ? 'border-gradient-orangeRed text-text-primary font-semibold'
                : 'border-transparent text-text-tertiary hover:text-text-primary hover:border-gradient-magenta/40'
            }`}
          >
            <span className={`${activeView === item.id ? 'opacity-100' : 'opacity-60'}`}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Summary View */}
      {activeView === 'summary' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Goals Summary</h3>
                <p className="text-sm text-slate-500">Overview of your habits and weight tracking progress</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Habits Summary Card */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-slate-900">Habits</h4>
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-emerald-700 mb-2">{habits.length}</p>
                <p className="text-sm text-slate-600">Active habits tracked</p>
                <button
                  onClick={() => setActiveView('habits')}
                  className="mt-4 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  View Habit Tracker →
                </button>
              </div>

              {/* Weight Summary Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-slate-900">Weight</h4>
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20M8 4h8M8 20h8" />
                  </svg>
                </div>
                {currentWeight ? (
                  <>
                    <p className="text-3xl font-bold text-blue-700 mb-1">{currentWeight.toFixed(1)} lbs</p>
                    {currentGoal && (
                      <p className="text-sm text-slate-600 mb-2">
                        Goal: {currentGoal.toFixed(1)} lbs
                        {currentWeight < currentGoal && (
                          <span className="text-green-600 ml-2">✓ On track</span>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mb-2">{weightEntries.length} entries recorded</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-blue-700 mb-2">—</p>
                    <p className="text-sm text-slate-600 mb-2">No weight data yet</p>
                    <button
                      onClick={() => {
                        if (confirm('Load mock weight data?')) {
                          seedWeightData()
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Load mock data
                    </button>
                  </>
                )}
                <button
                  onClick={() => setActiveView('weight')}
                  className="mt-4 text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  View Weight Tracker →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Habit Tracker View */}
      {activeView === 'habits' && (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Habit Tracker</h3>
              <p className="text-sm text-slate-500">Build consistency and track your daily habits</p>
            </div>
          </div>
          <HabitTracker />
        </div>
      )}

      {/* Weight Tracker View */}
      {activeView === 'weight' && (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 shadow-lg shadow-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 2v20M8 4h8M8 20h8" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Weight Tracker</h3>
              <p className="text-sm text-slate-500">Track your weight progress over time</p>
            </div>
          </div>
          
          <WeightTracker />
        </div>
      )}
    </div>
  )
}

