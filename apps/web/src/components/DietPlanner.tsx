"use client"

import React, { useMemo, useState, useEffect } from "react"

type MealTemplate = {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  ingredients: string[]
  image: string
}

const dayKeys = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const
const timeSlots = [
  { id: "7am", label: "7:00 am" },
  { id: "1030am", label: "10:30 am" },
  { id: "2pm", label: "2:00 pm" },
  { id: "530pm", label: "5:30 pm" },
  { id: "8pm", label: "8:00 pm" },
] as const

const defaultMeals: MealTemplate[] = [
  {
    id: "meal-huevos",
    name: "Huevos con Verdura",
    calories: 243,
    protein: 1,
    carbs: 1,
    fat: 0.3,
    ingredients: ["2 claras de huevo", "1 huevo entero", "2 tortillas de nopal", "1/4 de aguacate"],
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "meal-picamix",
    name: "Picamix",
    calories: 243,
    protein: 1,
    carbs: 1,
    fat: 0.3,
    ingredients: ["Mix de verduras", "Proteína", "Especias"],
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "meal-tortitas",
    name: "Tortitas de Pavo",
    calories: 243,
    protein: 1,
    carbs: 1,
    fat: 0.3,
    ingredients: ["Pavo", "Claras", "Verduras"],
    image: "https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "meal-palomitas",
    name: "Palomitas",
    calories: 243,
    protein: 1,
    carbs: 1,
    fat: 0.3,
    ingredients: ["Maíz", "Aceite ligero", "Sal"],
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "meal-tostadas",
    name: "Tostadas de Queso",
    calories: 243,
    protein: 1,
    carbs: 1,
    fat: 0.3,
    ingredients: ["Tostadas", "Queso", "Salsa"],
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "meal-hotcakes",
    name: "Hot Cakes de Avena",
    calories: 243,
    protein: 1,
    carbs: 1,
    fat: 0.3,
    ingredients: ["Avena", "2 claras de huevo", "1 huevo entero"],
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "meal-chilaquiles",
    name: "Chilaquiles con Pollo",
    calories: 243,
    protein: 1,
    carbs: 1,
    fat: 0.3,
    ingredients: ["Chilaquiles", "Pollo", "2 tortillas de nopal", "Aguacate"],
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "meal-huevos-cocidos",
    name: "Huevos Cocidos",
    calories: 243,
    protein: 1,
    carbs: 1,
    fat: 0.3,
    ingredients: ["2 claras de huevo", "1 huevo entero"],
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=200&q=80",
  },
]

type ScheduleState = Record<(typeof dayKeys)[number], Record<(typeof timeSlots)[number]["id"], string | null>>

const baseSchedule: ScheduleState = dayKeys.reduce((acc, day) => {
  const slots = timeSlots.reduce((slotAcc, slot) => ({ ...slotAcc, [slot.id]: null }), {} as any)
  return { ...acc, [day]: slots }
}, {} as ScheduleState)

const DIET_STORAGE_KEY = 'jarvis_diet_schedule'

export default function DietPlanner() {
  const [schedule, setSchedule] = useState<ScheduleState>(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DIET_STORAGE_KEY)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch (e) {
          console.error('Failed to parse stored diet schedule:', e)
        }
      }
    }
    return baseSchedule
  })
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)
  const [draggingMealId, setDraggingMealId] = useState<string | null>(null)

  // Save to localStorage whenever schedule changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(schedule))
    }
  }, [schedule])

  const handleDragStart = (mealId: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/meal-id", mealId)
    setDraggingMealId(mealId)
    
    // Create a custom drag image that's smaller and transparent
    const dragImage = document.createElement("div")
    dragImage.style.position = "absolute"
    dragImage.style.top = "-1000px"
    dragImage.style.opacity = "0.5"
    dragImage.style.transform = "scale(0.7)"
    dragImage.style.pointerEvents = "none"
    document.body.appendChild(dragImage)
    
    const meal = defaultMeals.find((m) => m.id === mealId)
    if (meal) {
      dragImage.innerHTML = `
        <div style="display: flex; gap: 8px; padding: 8px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <img src="${meal.image}" alt="${meal.name}" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover;" />
          <div style="font-size: 11px; font-weight: 600; color: #1e293b;">${meal.name}</div>
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
    setDraggingMealId(null)
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
      const mealId = e.dataTransfer.getData("text/meal-id")
      if (!mealId) return
      setSchedule((prev) => ({
        ...prev,
        [day]: { ...prev[day], [slotId]: mealId },
      }))
    }

  const totals = useMemo(() => {
    const result: Record<(typeof dayKeys)[number], number> = {} as any
    dayKeys.forEach((day) => {
      const total = timeSlots.reduce((sum, slot) => {
        const mealId = schedule[day][slot.id]
        const meal = defaultMeals.find((m) => m.id === mealId)
        return sum + (meal?.calories ?? 0)
      }, 0)
      result[day] = total
    })
    return result
  }, [schedule])

  const renderMealChip = (mealId: string | null) => {
    if (!mealId) {
      return (
        <div className="flex flex-col items-center justify-center gap-0.5 text-[10px] text-slate-400">
          <div className="h-10 w-10 rounded-full border border-dashed border-slate-300 bg-white flex items-center justify-center">
            <span className="text-slate-300 text-sm">+</span>
          </div>
          <span className="text-slate-300 text-[9px]">--</span>
        </div>
      )
    }
    const meal = defaultMeals.find((m) => m.id === mealId)
    if (!meal) return null
    return (
      <div className="flex flex-col items-center gap-0.5 text-[10px] text-slate-700 w-full max-w-full">
        <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
          <img src={meal.image} alt={meal.name} className="h-full w-full object-cover" />
        </div>
        <div className="font-semibold text-slate-800 text-center leading-tight text-[9px] px-0.5 truncate w-full">{meal.name}</div>
        <div className="text-[9px] text-slate-500 text-center w-full px-0.5 break-words">
          {meal.calories} cal | P:{meal.protein} | C:{meal.carbs} | G:{meal.fat}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#1c1c1c] px-0">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-3 w-full">
          <div className="text-2xl font-semibold text-[#a00060]">Kiwi</div>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <div className="min-w-[140px] flex-1 max-w-xs h-9 rounded-full border border-slate-200 bg-white px-3 flex items-center text-xs text-slate-700 shadow-inner">
              <span className="truncate">DAAH-0001</span>
            </div>
            <div className="min-w-[100px] h-9 rounded-full border border-slate-200 bg-white px-3 flex items-center text-xs text-slate-700 shadow-inner">
              <span>2,200 cal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-sm" />
            <div className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-sm" />
          </div>
        </div>

        {/* Nav icons (static) */}
        <div className="flex items-center justify-center gap-6 text-xs text-slate-600 mb-4">
          {["Dietas", "Desayunos", "Snacks", "Comidas", "Cenas"].map((label, idx) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="h-7 w-7 rounded-full border border-slate-200 bg-white shadow-sm" />
              <span className={`${idx === 1 ? "font-semibold text-slate-800 underline underline-offset-4" : ""}`}>{label}</span>
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
                  <div className="text-[10px] text-slate-500">2200 cal | P:1 | C:1 | G:0.3</div>
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
                          if (isEmpty && draggingMealId) {
                            setDragOverCell(`${day}-${slot.id}`)
                          }
                        }}
                        onDragEnter={handleDragEnter(day, slot.id)}
                        onDragLeave={handleDragLeave(day, slot.id)}
                        onDrop={handleDrop(day, slot.id)}
                      >
                        {renderMealChip(schedule[day][slot.id])}
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}

              <div />
              {dayKeys.map((day) => (
                <div key={`total-${day}`} className="text-center text-xs font-semibold text-slate-700">
                  {totals[day]} cal
                </div>
              ))}
            </div>
          </div>

          {/* Library */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-2">
            <div className="text-xs font-semibold text-slate-700 mb-1">Desayunos</div>
            <div className="space-y-2">
              {defaultMeals.map((meal) => (
                <div
                  key={meal.id}
                  draggable
                  onDragStart={handleDragStart(meal.id)}
                  onDragEnd={handleDragEnd}
                  className={`border border-slate-200 rounded-xl p-2 bg-white shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${
                    draggingMealId === meal.id ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex gap-2">
                    <div className="h-12 w-12 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                      <img src={meal.image} alt={meal.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <div className="text-xs font-semibold text-slate-900">{meal.name}</div>
                      <div className="text-[10px] text-slate-600">
                        {meal.calories} cal | P:{meal.protein} | C:{meal.carbs} | G:{meal.fat}
                      </div>
                      <ul className="text-[10px] text-slate-600 list-disc pl-3 space-y-0">
                        {meal.ingredients.map((ing) => (
                          <li key={ing}>{ing}</li>
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

