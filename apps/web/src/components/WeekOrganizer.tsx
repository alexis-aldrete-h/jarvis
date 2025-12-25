'use client'

import { useState } from 'react'
import { getWeekStart, getWeekEnd, formatDate, Task } from '@jarvis/shared'
import { useTasks } from '@/hooks/useTasks'

export default function WeekOrganizer() {
  const { tasks } = useTasks()
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const weekStart = getWeekStart(currentDate)
  const weekEnd = getWeekEnd(currentDate)
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  const getTasksForDay = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentDate(newDate)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-graphite/50">Week planner</p>
          <h2 className="text-3xl text-ink font-semibold">
            {formatDate(weekStart)} - {formatDate(weekEnd)}
          </h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigateWeek('prev')} className="pill px-4 py-2 text-sm text-graphite">
            ←
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="pill px-4 py-2 text-sm text-graphite">
            Today
          </button>
          <button onClick={() => navigateWeek('next')} className="pill px-4 py-2 text-sm text-graphite">
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((day, index) => {
          const dayTasks = getTasksForDay(day)
          const isToday =
            day.getDate() === new Date().getDate() &&
            day.getMonth() === new Date().getMonth() &&
            day.getFullYear() === new Date().getFullYear()

          return (
            <div
              key={index}
              className={`panel p-4 min-h-[220px] smooth-transition ${isToday ? 'border-ink/20' : ''}`}
            >
              <div className="mb-4">
                <p className="text-xs text-graphite/50 uppercase tracking-[0.3em] mb-1">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className={`text-2xl font-semibold ${isToday ? 'text-ink' : 'text-graphite'}`}>
                  {day.getDate()}
                </p>
              </div>
              <div className="space-y-2">
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-graphite/50">Clear</p>
                ) : (
                  dayTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TaskItem({ task }: { task: Task }) {
  const priorityStyles = {
    low: 'border-l-graphite/20',
    medium: 'border-l-amber/50',
    high: 'border-l-ink/40',
    urgent: 'border-l-ink',
  }

  return (
    <div
      className={`bg-white rounded-lg p-2.5 border-l-2 ${priorityStyles[task.priority]} ${
        task.status === 'completed' ? 'opacity-50' : ''
      }`}
    >
      <p className={`text-sm font-semibold ${
        task.status === 'completed' ? 'line-through text-graphite/40' : 'text-ink'
      }`}>
        {task.title}
      </p>
      {task.status !== 'completed' && (
        <p className="text-xs text-graphite/60 mt-1 uppercase tracking-[0.3em]">{task.priority}</p>
      )}
    </div>
  )
}
