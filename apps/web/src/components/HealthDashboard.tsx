"use client"

import React, { useState } from "react"
import DietPlanner from "./DietPlanner"
import WorkoutPlanner from "./WorkoutPlanner"
import OverviewPlanner from "./OverviewPlanner"

export default function HealthDashboard() {
  const [activeSection, setActiveSection] = useState<'physical' | 'mental' | 'spirit'>('physical')
  const [physicalTab, setPhysicalTab] = useState<'workout' | 'diet' | 'overview'>('overview')

  return (
    <div className="min-h-screen bg-white text-[#1c1c1c]">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-4">
        {/* Main Navigation */}
        <div className="flex items-center justify-center gap-8 mb-6">
          {[
            { id: 'physical' as const, label: 'Physical' },
            { id: 'mental' as const, label: 'Mental' },
            { id: 'spirit' as const, label: 'Spirit' },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeSection === section.id
                  ? 'bg-[#a00060] text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Physical Section */}
        {activeSection === 'physical' && (
          <div className="space-y-4">
            {/* Physical Sub-Navigation */}
            <div className="flex items-center justify-center gap-6 mb-4">
              {[
                { id: 'workout' as const, label: 'Workout' },
                { id: 'diet' as const, label: 'Diet' },
                { id: 'overview' as const, label: 'Overview' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPhysicalTab(tab.id)}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    physicalTab === tab.id
                      ? 'bg-[#a00060] text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Workout, Diet, or Overview Content */}
            {physicalTab === 'workout' ? (
              <WorkoutPlanner />
            ) : physicalTab === 'diet' ? (
              <DietPlanner />
            ) : (
              <OverviewPlanner />
            )}
          </div>
        )}

        {/* Mental Section */}
        {activeSection === 'mental' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="text-4xl mb-4">🧠</div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Mental Health</h2>
            <p className="text-slate-600">Mental health tracking and resources coming soon...</p>
          </div>
        )}

        {/* Spirit Section */}
        {activeSection === 'spirit' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="text-4xl mb-4">✨</div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Spiritual Health</h2>
            <p className="text-slate-600">Spiritual health tracking and resources coming soon...</p>
          </div>
        )}
      </div>
    </div>
  )
}
