'use client'

import { useState } from 'react'
import TaskManager from '@/components/TaskManager'
import WeekOrganizer from '@/components/WeekOrganizer'
import FinanceManager from '@/components/FinanceManager'
import GoalsTracker from '@/components/GoalsTracker'
import LifeAsGame from '@/components/LifeAsGame'
import HealthDashboard from '@/components/HealthDashboard'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'finances' | 'goals' | 'life' | 'health'>('tasks')

  const tabs: { id: typeof activeTab; label: string; icon: string }[] = [
    { id: 'tasks', label: 'Tasks', icon: '→' },
    { id: 'finances', label: 'Finances', icon: '💰' },
    { id: 'goals', label: 'Goals Tracker', icon: '🎯' },
    { id: 'health', label: 'Health', icon: '💪' },
    { id: 'life', label: 'Mi vida como videojuego', icon: '🎮' },
  ]

  return (
    <main className="min-h-screen relative flex">
      <div className="absolute inset-0 pointer-events-none">
        <div className="float-animation absolute w-96 h-96 bg-white/50 rounded-full blur-[140px] top-10 left-10" />
        <div className="float-animation absolute w-[26rem] h-[26rem] bg-blush/60 rounded-full blur-[150px] bottom-[-4rem] right-10" />
      </div>

      {/* Left Sidebar Navigation */}
      <aside className="relative z-10 w-64 flex-shrink-0 border-r border-pearl/30 bg-white/40 backdrop-blur-xl">
        <div className="sticky top-0 p-6 space-y-8 h-screen overflow-y-auto">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-slate/70">Navigation</p>
            <h2 className="text-2xl font-semibold text-ink">Jarvis</h2>
          </div>

          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full px-4 py-3 rounded-lg smooth-transition text-left flex items-center gap-3 ${
                  activeTab === tab.id
                    ? 'bg-ink text-white shadow-pill'
                    : 'text-slate hover:bg-pearl/50 hover:text-ink'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-8 border-t border-pearl/30">
            <div className="soft-pill p-4">
              <p className="text-xs uppercase tracking-[0.4em] text-slate/70 mb-2">Status</p>
              <p className="text-sm text-ink font-medium">Quietly powerful</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        {activeTab === 'tasks' ? (
          <TaskManager />
        ) : (
          <div className="max-w-6xl mx-auto px-6 pb-0 pt-14 space-y-10 fade-up mb-0">
            <header className="space-y-6">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-slate/70">
                  {tabs.find(t => t.id === activeTab)?.label}
                </p>
                <h1 className="text-4xl md:text-5xl font-semibold text-ink mt-3">
                  {activeTab === 'finances' && 'Track your balance'}
                  {activeTab === 'goals' && 'Build consistency'}
                  {activeTab === 'health' && 'Health & performance'}
                  {activeTab === 'life' && 'Mi vida como videojuego'}
                </h1>
                <p className="text-slate mt-4 max-w-2xl">
                  {activeTab === 'finances' && 'Monitor income, expenses, and financial trajectory.'}
                  {activeTab === 'goals' && 'Track habits and build consistency in your daily routine.'}
                  {activeTab === 'health' && 'Plan meals, workouts, fasting, and habits to drive progress.'}
                  {activeTab === 'life' && 'Convertí mis metas y hábitos en un sistema de niveles, vida, experiencia y moneda ficticia.'}
                </p>
              </div>
            </header>

            <section className="space-y-10 mb-0 pb-0">
              {activeTab === 'finances' && <FinanceManager />}
              {activeTab === 'goals' && <GoalsTracker />}
              {activeTab === 'health' && <HealthDashboard />}
              {activeTab === 'life' && <LifeAsGame />}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
