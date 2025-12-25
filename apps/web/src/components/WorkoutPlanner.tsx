"use client"

import React, { useMemo, useState, useEffect } from "react"

type WorkoutTemplate = {
  id: string
  name: string
  duration: number
  calories: number
  type: string
  exercises: string[]
  image: string
}

const dayKeys = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const
const timeSlots = [
  { id: "6am", label: "6:00 am" },
  { id: "12pm", label: "12:00 pm" },
  { id: "6pm", label: "6:00 pm" },
] as const

const defaultWorkouts: WorkoutTemplate[] = [
  {
    id: "workout-upper",
    name: "Upper Body",
    duration: 60,
    calories: 350,
    type: "Strength",
    exercises: ["Bench Press", "Rows", "Shoulder Press", "Pull-ups"],
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "workout-lower",
    name: "Lower Body",
    duration: 60,
    calories: 400,
    type: "Strength",
    exercises: ["Squats", "Deadlifts", "Lunges", "Leg Press"],
    image: "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "workout-cardio",
    name: "Cardio",
    duration: 45,
    calories: 500,
    type: "Cardio",
    exercises: ["Running", "Cycling", "Rowing"],
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "workout-full",
    name: "Full Body",
    duration: 75,
    calories: 450,
    type: "Strength",
    exercises: ["Compound movements", "Full body circuit"],
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "workout-yoga",
    name: "Yoga",
    duration: 30,
    calories: 150,
    type: "Flexibility",
    exercises: ["Vinyasa flow", "Stretching", "Breathing"],
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "workout-hiit",
    name: "HIIT",
    duration: 20,
    calories: 300,
    type: "Cardio",
    exercises: ["Burpees", "Jump squats", "Mountain climbers"],
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "workout-core",
    name: "Core",
    duration: 25,
    calories: 200,
    type: "Strength",
    exercises: ["Planks", "Crunches", "Russian twists"],
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "workout-stretch",
    name: "Stretching",
    duration: 20,
    calories: 100,
    type: "Flexibility",
    exercises: ["Dynamic stretches", "Mobility work"],
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=200&q=80",
  },
]

type ScheduleState = Record<(typeof dayKeys)[number], Record<(typeof timeSlots)[number]["id"], string | null>>

const baseSchedule: ScheduleState = dayKeys.reduce((acc, day) => {
  const slots = timeSlots.reduce((slotAcc, slot) => ({ ...slotAcc, [slot.id]: null }), {} as any)
  return { ...acc, [day]: slots }
}, {} as ScheduleState)

const WORKOUT_STORAGE_KEY = 'jarvis_workout_schedule'

export default function WorkoutPlanner() {
  const [schedule, setSchedule] = useState<ScheduleState>(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(WORKOUT_STORAGE_KEY)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch (e) {
          console.error('Failed to parse stored workout schedule:', e)
        }
      }
    }
    return baseSchedule
  })
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)
  const [draggingWorkoutId, setDraggingWorkoutId] = useState<string | null>(null)

  // Save to localStorage whenever schedule changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(schedule))
    }
  }, [schedule])

  const handleDragStart = (workoutId: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/workout-id", workoutId)
    setDraggingWorkoutId(workoutId)
    
    // Create a custom drag image that's smaller and transparent
    const dragImage = document.createElement("div")
    dragImage.style.position = "absolute"
    dragImage.style.top = "-1000px"
    dragImage.style.opacity = "0.5"
    dragImage.style.transform = "scale(0.7)"
    dragImage.style.pointerEvents = "none"
    document.body.appendChild(dragImage)
    
    const workout = defaultWorkouts.find((w) => w.id === workoutId)
    if (workout) {
      dragImage.innerHTML = `
        <div style="display: flex; gap: 8px; padding: 8px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <img src="${workout.image}" alt="${workout.name}" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover;" />
          <div style="font-size: 11px; font-weight: 600; color: #1e293b;">${workout.name}</div>
        </div>
      `
      e.dataTransfer.setDragImage(dragImage, 0, 0)
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(dragImage)
      }, 0)
    }
    
    // Make the original element semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4"
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingWorkoutId(null)
    // Restore opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1"
    }
  }

  const handleDragEnter =
    (day: (typeof dayKeys)[number], slotId: (typeof timeSlots)[number]["id"]) =>
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOverCell(`${day}-${slotId}`)
    }

  const handleDragLeave =
    (day: (typeof dayKeys)[number], slotId: (typeof timeSlots)[number]["id"]) =>
    (e: React.DragEvent) => {
      e.preventDefault()
      // Only clear the highlight if we're actually leaving the cell, not just moving to a child element
      const currentTarget = e.currentTarget as HTMLElement
      const relatedTarget = e.relatedTarget as HTMLElement | null
      
      // Check if the related target is still within the current target
      if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
        setDragOverCell(null)
      }
    }

  const handleDrop =
    (day: (typeof dayKeys)[number], slotId: (typeof timeSlots)[number]["id"]) =>
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOverCell(null)
      const workoutId = e.dataTransfer.getData("text/workout-id")
      if (!workoutId) return
      setSchedule((prev) => ({
        ...prev,
        [day]: { ...prev[day], [slotId]: workoutId },
      }))
    }

  const totals = useMemo(() => {
    const result: Record<(typeof dayKeys)[number], { calories: number; duration: number }> = {} as any
    dayKeys.forEach((day) => {
      const dayTotal = timeSlots.reduce((sum, slot) => {
        const workoutId = schedule[day][slot.id]
        const workout = defaultWorkouts.find((w) => w.id === workoutId)
        return {
          calories: sum.calories + (workout?.calories ?? 0),
          duration: sum.duration + (workout?.duration ?? 0),
        }
      }, { calories: 0, duration: 0 })
      result[day] = dayTotal
    })
    return result
  }, [schedule])

  const renderWorkoutChip = (workoutId: string | null) => {
    if (!workoutId) {
      return (
        <div className="flex flex-col items-center justify-center gap-0.5 text-[10px] text-slate-400">
          <div className="h-10 w-10 rounded-full border border-dashed border-slate-300 bg-white flex items-center justify-center">
            <span className="text-slate-300 text-sm">+</span>
          </div>
          <span className="text-slate-300 text-[9px]">--</span>
        </div>
      )
    }
    const workout = defaultWorkouts.find((w) => w.id === workoutId)
    if (!workout) return null
    return (
      <div className="flex flex-col items-center gap-0.5 text-[10px] text-slate-700 w-full max-w-full">
        <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
          <img src={workout.image} alt={workout.name} className="h-full w-full object-cover" />
        </div>
        <div className="font-semibold text-slate-800 text-center leading-tight text-[9px] px-0.5 truncate w-full">{workout.name}</div>
        <div className="text-[9px] text-slate-500 text-center w-full px-0.5 break-words">
          {workout.duration}min | {workout.calories} cal
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#1c1c1c] px-0">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-3 w-full">
          <div className="text-2xl font-semibold text-[#a00060]">Workout Planner</div>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <div className="min-w-[140px] flex-1 max-w-xs h-9 rounded-full border border-slate-200 bg-white px-3 flex items-center text-xs text-slate-700 shadow-inner">
              <span className="truncate">Week 1</span>
            </div>
            <div className="min-w-[100px] h-9 rounded-full border border-slate-200 bg-white px-3 flex items-center text-xs text-slate-700 shadow-inner">
              <span>5 days/week</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-sm" />
            <div className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-sm" />
          </div>
        </div>

        {/* Nav icons (static) */}
        <div className="flex items-center justify-center gap-6 text-xs text-slate-600 mb-4">
          {["Strength", "Cardio", "Flexibility", "HIIT", "Recovery"].map((label, idx) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="h-7 w-7 rounded-full border border-slate-200 bg-white shadow-sm" />
              <span className={`${idx === 0 ? "font-semibold text-slate-800 underline underline-offset-4" : ""}`}>{label}</span>
            </div>
          ))}
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-[minmax(0,4fr)_minmax(280px,1fr)] gap-4 w-full">
          {/* Planner */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
            <div className="grid grid-cols-[90px_repeat(7,1fr)] gap-y-2 gap-x-1.5">
              <div />
              {dayKeys.map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-slate-700 leading-tight">
                  {day}
                  <div className="text-[10px] text-slate-500">
                    {totals[day].calories} cal | {totals[day].duration} min
                  </div>
                </div>
              ))}

              {timeSlots.map((slot) => (
                <React.Fragment key={slot.id}>
                  <div className="text-[10px] text-slate-600 flex items-center justify-end pr-1">{slot.label}</div>
                  {dayKeys.map((day) => {
                    const cellKey = `${day}-${slot.id}`
                    const isDragOver = dragOverCell === cellKey
                    const isEmpty = !schedule[day][slot.id]
                    return (
                      <div
                        key={cellKey}
                        className={`rounded-xl border transition p-1.5 flex items-center justify-center h-[110px] w-full overflow-hidden ${
                          isDragOver && isEmpty
                            ? "bg-blue-50 border-blue-300 border-2"
                            : isEmpty
                            ? "border-slate-200/80 bg-white hover:bg-slate-50"
                            : "border-slate-200/80 bg-white"
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault()
                          // Also set dragOverCell on dragOver to ensure it stays highlighted
                          if (isEmpty && draggingWorkoutId) {
                            setDragOverCell(`${day}-${slot.id}`)
                          }
                        }}
                        onDragEnter={handleDragEnter(day, slot.id)}
                        onDragLeave={handleDragLeave(day, slot.id)}
                        onDrop={handleDrop(day, slot.id)}
                      >
                        {renderWorkoutChip(schedule[day][slot.id])}
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}

              <div />
              {dayKeys.map((day) => (
                <div key={`total-${day}`} className="text-center text-xs font-semibold text-slate-700">
                  {totals[day].calories} cal
                </div>
              ))}
            </div>
          </div>

          {/* Library */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-2">
            <div className="text-xs font-semibold text-slate-700 mb-1">Workouts</div>
            <div className="space-y-2">
              {defaultWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  draggable
                  onDragStart={handleDragStart(workout.id)}
                  onDragEnd={handleDragEnd}
                  className={`border border-slate-200 rounded-xl p-2 bg-white shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${
                    draggingWorkoutId === workout.id ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex gap-2">
                    <div className="h-12 w-12 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                      <img src={workout.image} alt={workout.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <div className="text-xs font-semibold text-slate-900">{workout.name}</div>
                      <div className="text-[10px] text-slate-600">
                        {workout.duration} min | {workout.calories} cal | {workout.type}
                      </div>
                      <ul className="text-[10px] text-slate-600 list-disc pl-3 space-y-0">
                        {workout.exercises.map((exercise) => (
                          <li key={exercise}>{exercise}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

