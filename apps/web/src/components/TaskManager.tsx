"use client"

import React, { useEffect, useMemo, useState, useRef } from "react"
import { Task, TaskPriority, TaskStatus, TaskDifficulty, Subtask } from "@jarvis/shared"
import { useTasks } from "@/hooks/useTasks"
import { useGanttContext } from "@/contexts/GanttContext"
import { formatDate, getWeekStart, getWeekEnd } from "@jarvis/shared"
import { GanttProject, GanttTask, GanttSubtask, GanttStatus } from "@jarvis/shared"
import ProjectPlanner from "./ProjectPlanner"
import Projects2Page from "./Projects2Page"
import GanttV2Page from "./GanttV2Page"
// import ProjectsView from "./ProjectsView"

const POMODORO_WORK_DURATION = 25 * 60 // 25 minutes in seconds
const POMODORO_REST_DURATION = 5 * 60 // 5 minutes in seconds

const priorityStyles: Record<TaskPriority, string> = {
  low: "text-blue-600 border-blue-300 bg-blue-50",
  medium: "text-slate-700 border-slate-300 bg-slate-100",
  high: "text-orange-600 border-orange-300 bg-orange-50",
  urgent: "text-white bg-gradient-to-r from-orange-500 to-red-600 border-red-600",
}

const columnConfig: { status: TaskStatus | "sprint" | "today" | "routine"; label: string; hint: string }[] = [
  { status: "todo", label: "Backlog", hint: "Not started" },
  { status: "sprint", label: "Sprint Tasks", hint: "Sprint focus" },
  { status: "routine", label: "Routine", hint: "Weekly repetitive tasks" },
  { status: "today", label: "Today Tasks", hint: "Due today" },
  { status: "in-progress", label: "Active", hint: "In motion" },
  { status: "completed", label: "Complete", hint: "Signed off" },
]

const difficultyLabels: Record<number, string> = {
  1: '<1hr',
  2: '<4hrs',
  3: '1 day',
  5: '3 days',
  8: '1 week',
}

function SubtaskColumn({
  column,
  tasks,
  updateTask,
  toggleSubtask,
  deleteSubtask,
  gradient,
  onStartFocus,
  addTask,
  subtaskColumnAssignments,
  setSubtaskColumnAssignments,
  ganttSubtasks,
  updateGanttSubtask,
  deleteGanttSubtask,
  ganttTasks,
  updateGanttTask,
  deleteGanttTask,
}: {
  column: { status: TaskStatus | "sprint" | "today" | "routine"; label: string; hint: string; subtasks: Array<{ subtask: Subtask; parentTask: Task }>; ganttSubtasks?: Array<{ ganttSubtask: GanttSubtask; parentTask: GanttTask; parentProject: GanttProject }>; ganttTasks?: Array<{ ganttTask: GanttTask; parentProject: GanttProject }> }
  tasks: Task[]
  updateTask: (id: string, updates: Partial<Task>) => void
  toggleSubtask: (taskId: string, subtaskId: string) => void
  deleteSubtask: (taskId: string, subtaskId: string) => void
  gradient: { from: string; to: string; accent: string }
  onStartFocus: (taskId: string) => void
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  subtaskColumnAssignments: Map<string, TaskStatus | "sprint" | "today" | "routine">
  setSubtaskColumnAssignments: React.Dispatch<React.SetStateAction<Map<string, TaskStatus | "sprint" | "today" | "routine">>>
  ganttSubtasks?: Array<{ ganttSubtask: GanttSubtask; parentTask: GanttTask; parentProject: GanttProject }>
  updateGanttSubtask?: (projectId: string, taskId: string, subtaskId: string, updates: Partial<GanttSubtask>) => void
  deleteGanttSubtask?: (projectId: string, taskId: string, subtaskId: string) => void
  ganttTasks?: Array<{ ganttTask: GanttTask; parentProject: GanttProject }>
  updateGanttTask?: (projectId: string, taskId: string, updates: Partial<GanttTask>) => void
  deleteGanttTask?: (projectId: string, taskId: string) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const data = e.dataTransfer.getData('text/plain')
    if (data && (data.startsWith('subtask:') || data.startsWith('gantt-subtask:') || data.startsWith('gantt-task:'))) {
      e.dataTransfer.dropEffect = 'move'
      setIsDragOver(true)
    } else {
      e.dataTransfer.dropEffect = 'none'
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set drag over to false if we're actually leaving the column container
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!e.currentTarget.contains(relatedTarget)) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const data = e.dataTransfer.getData('text/plain')
    if (data && data.startsWith('subtask:')) {
      const [, parentTaskId, subtaskId] = data.split(':')
      const parentTask = tasks.find(t => t.id === parentTaskId)
      const subtask = parentTask?.subtasks?.find(st => st.id === subtaskId)
      
      if (parentTask && subtask && !subtask.completed) {
        // Store the column assignment for this subtask
        // This allows individual subtasks to be moved independently while remaining as subtasks
        setSubtaskColumnAssignments(prev => {
          const newMap = new Map(prev)
          newMap.set(subtaskId, column.status)
          return newMap
        })
      }
    } else if (data && data.startsWith('gantt-subtask:')) {
      // Handle Gantt subtask drop - update status
      const [, projectId, taskId, subtaskId] = data.split(':')
      if (updateGanttSubtask) {
        // Map column status to Gantt status
        const ganttStatusMap: Record<TaskStatus | "sprint" | "today" | "routine", GanttStatus> = {
          'todo': 'backlog',
          'sprint': 'sprint',
          'routine': 'routine' as GanttStatus,
          'today': 'today',
          'in-progress': 'active',
          'completed': 'completed',
          'cancelled': 'backlog',
        }
        const newStatus = ganttStatusMap[column.status] || 'backlog'
        updateGanttSubtask(projectId, taskId, subtaskId, { status: newStatus })
      }
    } else if (data && data.startsWith('gantt-task:')) {
      // Handle Gantt task drop - update status
      const [, projectId, taskId] = data.split(':')
      if (updateGanttTask) {
        // Map column status to Gantt status
        const ganttStatusMap: Record<TaskStatus | "sprint" | "today" | "routine", GanttStatus> = {
          'todo': 'backlog',
          'sprint': 'sprint',
          'routine': 'routine' as GanttStatus,
          'today': 'today',
          'in-progress': 'active',
          'completed': 'completed',
          'cancelled': 'backlog',
        }
        const newStatus = ganttStatusMap[column.status] || 'backlog'
        updateGanttTask(projectId, taskId, { status: newStatus })
      }
    }
  }

  return (
    <div
      className={`rounded-xl border-2 bg-gradient-to-b ${gradient.from} ${gradient.to} border-${gradient.accent}-200/60 p-4 flex flex-col ${
        isDragOver ? 'ring-2 ring-blue-400 border-blue-400' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-sm font-bold text-slate-900 mb-0.5">{column.label}</h3>
        <p className="text-[10px] text-slate-500">{column.hint}</p>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-600">
            {(column.subtasks?.length || 0) + (ganttSubtasks?.length || 0) + (ganttTasks?.length || 0)} {(column.subtasks?.length || 0) + (ganttSubtasks?.length || 0) + (ganttTasks?.length || 0) === 1 ? 'item' : 'items'}
          </div>
          {(() => {
            // Calculate total hours for this column
            // 1 story point = 1 hour (direct mapping)
            const storyPointsToHours = (points?: number): number => {
              if (!points || points <= 0) return 1 // Default to 1 hour if no points
              return points // Direct mapping: story points = hours
            }
            
            let totalHours = 0
            
            // Add hours from regular subtasks (if they have time estimates or story points)
            column.subtasks?.forEach(({ subtask }) => {
              // Regular subtasks might have difficulty which maps to story points
              // For now, default to 1 hour if no explicit time estimate
              totalHours += 1 // Default for regular subtasks
            })
            
            // Add hours from Gantt subtasks
            ganttSubtasks?.forEach(({ ganttSubtask }) => {
              totalHours += storyPointsToHours(ganttSubtask.storyPoints)
            })
            
            // Add hours from Gantt tasks (use totalPoints for tasks without subtasks, matches projects table)
            ganttTasks?.forEach(({ ganttTask }) => {
              totalHours += storyPointsToHours((ganttTask as any).totalPoints)
            })
            
            // Format total hours
            const formatHours = (hours: number): string => {
              if (hours === 0.5) return '30 min'
              if (hours === 1) return '1 hr'
              if (hours < 1) return `${Math.round(hours * 60)} min`
              if (hours % 1 === 0) return `${hours} hrs`
              const wholeHours = Math.floor(hours)
              const minutes = Math.round((hours - wholeHours) * 60)
              return minutes > 0 ? `${wholeHours} hrs ${minutes} min` : `${wholeHours} hrs`
            }
            
            return (
              <div className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {formatHours(totalHours)}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Subtasks List */}
      <div 
        className="space-y-2"
        onDragOver={(e) => {
          // Allow drag over on the container as well
          e.preventDefault()
          e.stopPropagation()
          const data = e.dataTransfer.getData('text/plain')
          if (data && (data.startsWith('subtask:') || data.startsWith('gantt-subtask:'))) {
            e.dataTransfer.dropEffect = 'move'
            setIsDragOver(true)
          }
        }}
      >
        {(column.subtasks?.length || 0) === 0 && (ganttSubtasks?.length || 0) === 0 && (ganttTasks?.length || 0) === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-xs">No subtasks</p>
          </div>
        ) : (
          <>
            {/* Regular subtasks */}
            {column.subtasks?.map(({ subtask, parentTask }) => {
              // Create a unique key that includes both parent and subtask IDs
              const uniqueKey = `${parentTask.id}-${subtask.id}`
              return (
                <SubtaskCard
                  key={uniqueKey}
                  subtask={subtask}
                  parentTask={parentTask}
                  onToggle={() => toggleSubtask(parentTask.id, subtask.id)}
                  onDelete={() => deleteSubtask(parentTask.id, subtask.id)}
                  onStartFocus={() => onStartFocus(parentTask.id)}
                />
              )
            })}
            {/* Gantt subtasks */}
            {ganttSubtasks?.map(({ ganttSubtask, parentTask, parentProject }) => {
              // Include status in key to ensure React re-renders when status changes
              const uniqueKey = `gantt-${parentProject.id}-${parentTask.id}-${ganttSubtask.id}-${ganttSubtask.status || 'backlog'}`
              return (
                <GanttSubtaskCard
                  key={uniqueKey}
                  subtask={ganttSubtask}
                  parentTask={parentTask}
                  parentProject={parentProject}
                  onUpdate={(updates) => updateGanttSubtask?.(parentProject.id, parentTask.id, ganttSubtask.id, updates)}
                  onDelete={() => deleteGanttSubtask?.(parentProject.id, parentTask.id, ganttSubtask.id)}
                  columnStatus={column.status}
                />
              )
            })}
            {/* Gantt tasks without subtasks */}
            {ganttTasks?.map(({ ganttTask, parentProject }) => {
              // Include status in key to ensure React re-renders when status changes
              const uniqueKey = `gantt-task-${parentProject.id}-${ganttTask.id}-${ganttTask.status || 'backlog'}`
              return (
                <GanttTaskCard
                  key={uniqueKey}
                  task={ganttTask}
                  parentProject={parentProject}
                  onUpdate={(updates) => updateGanttTask?.(parentProject.id, ganttTask.id, updates)}
                  onDelete={() => deleteGanttTask?.(parentProject.id, ganttTask.id)}
                  columnStatus={column.status}
                />
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

// Helper function to convert hex color to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Helper function to convert story points to hours for display
// 1 story point = 1 hour (direct mapping)
const storyPointsToHoursDisplay = (points?: number): string => {
  if (!points || points <= 0) return '1 hr'
  const hours = points // Direct mapping: story points = hours
  if (hours === 0.5) return '30 min'
  if (hours === 1) return '1 hr'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours % 1 === 0) return `${hours} hrs`
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  return minutes > 0 ? `${wholeHours} hrs ${minutes} min` : `${wholeHours} hrs`
}

// Helper function to convert hours to story points
// 1 hour = 1 story point (direct mapping)
const hoursToStoryPoints = (hours: number): number => {
  if (!hours || hours <= 0) return 1 // Default to 1 story point if no hours
  return hours // Direct mapping: hours = story points
}

// Helper function to convert story points to hours
// 1 story point = 1 hour (direct mapping)
const storyPointsToHours = (points?: number): number => {
  if (!points || points <= 0) return 1 // Default to 1 hour if no points
  return points // Direct mapping: story points = hours
}

// Gantt Subtask Card Component
// Custom comparison to ensure re-render when status changes
const GanttSubtaskCard = React.memo(function GanttSubtaskCard({
  subtask,
  parentTask,
  parentProject,
  onUpdate,
  onDelete,
  columnStatus,
  onDragStartCallback,
}: {
  subtask: GanttSubtask
  parentTask: GanttTask
  parentProject: GanttProject
  onUpdate: (updates: Partial<GanttSubtask>) => void
  onDelete: () => void
  columnStatus: TaskStatus | "sprint" | "today" | "routine"
  onDragStartCallback?: (data: { type: 'subtask', projectId: string, taskId: string, subtaskId: string }) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingName, setEditingName] = useState(subtask.name)
  const [editingHours, setEditingHours] = useState<string>(String(storyPointsToHours(subtask.storyPoints)))
  const [lastClickInfo, setLastClickInfo] = useState<{ time: number } | null>(null)

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // Handle click for manual double-click detection
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const now = Date.now()
    
    // Check if this is a double-click (within 300ms)
    if (lastClickInfo && now - lastClickInfo.time < 300) {
      e.preventDefault()
      setIsEditing(true)
      setEditingName(subtask.name)
      setEditingHours(String(storyPointsToHours(subtask.storyPoints)))
      setLastClickInfo(null)
    } else {
      // Store this click for potential double-click
      setLastClickInfo({ time: now })
      setTimeout(() => {
        setLastClickInfo(prev => prev?.time === now ? null : prev)
      }, 300)
    }
  }

  // Also keep native double-click as fallback
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsEditing(true)
    setEditingName(subtask.name)
    setEditingHours(String(storyPointsToHours(subtask.storyPoints)))
    setLastClickInfo(null)
  }

  const handleSaveEdit = () => {
    const hoursValue = parseFloat(editingHours) || 0.5
    onUpdate({
      name: editingName.trim() || subtask.name,
      storyPoints: hoursToStoryPoints(hoursValue),
    })
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingName(subtask.name)
    setEditingHours(String(storyPointsToHours(subtask.storyPoints)))
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (isEditing) {
      e.preventDefault()
      return
    }
    // Prevent drag if this might be a double-click attempt
    if (lastClickInfo) {
      const timeSinceClick = Date.now() - lastClickInfo.time
      if (timeSinceClick < 400) {
        e.preventDefault()
        setLastClickInfo(null)
        return
      }
    }
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `gantt-subtask:${parentProject.id}:${parentTask.id}:${subtask.id}`)
    // Store dragged item data for preview
    if (onDragStartCallback) {
      onDragStartCallback({ type: 'subtask', projectId: parentProject.id, taskId: parentTask.id, subtaskId: subtask.id })
    }
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.offsetWidth / 2, e.currentTarget.offsetHeight / 2)
    }
    setLastClickInfo(null)
  }

  const isCompleted = subtask.status === 'completed'
  const projectColor = parentProject.color || '#3b82f6'
  
  // Generate task color by lightening the project color (blend with white)
  const lightenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = (num >> 16) & 0xFF
    const g = (num >> 8) & 0xFF
    const b = num & 0xFF
    // Blend with white (255, 255, 255)
    const newR = Math.round(r + (255 - r) * percent)
    const newG = Math.round(g + (255 - g) * percent)
    const newB = Math.round(b + (255 - b) * percent)
    return `#${((newR << 16) | (newG << 8) | newB).toString(16).padStart(6, '0')}`
  }
  
  const taskColor = parentTask.color || lightenColor(projectColor, 0.25)

  return (
    <div
      draggable={!isEditing}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={!isEditing ? "Double-click to edit" : ""}
      className={`group relative rounded-md border border-slate-200 backdrop-blur-sm p-2.5 smooth-transition ${
        isCompleted 
          ? "opacity-60 cursor-not-allowed" 
          : isEditing
          ? "ring-2 ring-blue-400 cursor-default min-w-[200px]"
          : isDragging
          ? "border-blue-300 bg-blue-50 shadow-sm opacity-75 cursor-grabbing"
          : "hover:bg-slate-100 hover:border-slate-300 cursor-move"
      }`}
      style={{
        backgroundColor: isCompleted 
          ? 'rgba(241, 245, 249, 0.5)' 
          : isDragging
          ? undefined
          : hexToRgba(projectColor, 0.08), // 8% opacity for subtle tint
        borderLeftColor: projectColor,
        borderLeftWidth: '3px',
      }}
    >
      <div className="flex items-start gap-1.5 pl-1">
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Project and Task tags at the top */}
          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
            <span 
              className="text-[8px] px-1.5 py-0.5 rounded font-medium text-white truncate max-w-full"
              style={{ backgroundColor: projectColor }}
              title={parentProject.name}
            >
              {parentProject.name}
            </span>
            <span className="text-[8px] text-slate-400 flex-shrink-0">→</span>
            <span 
              className="text-[8px] px-1.5 py-0.5 rounded font-medium text-white truncate max-w-full"
              style={{ backgroundColor: taskColor }}
              title={parentTask.name}
            >
              {parentTask.name}
            </span>
          </div>
          
          {isEditing ? (
            <div className="space-y-2 min-w-0">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit()
                  } else if (e.key === 'Escape') {
                    handleCancelEdit()
                  }
                }}
                className="w-full px-2 py-1.5 text-[11px] border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Subtask name"
                autoFocus
              />
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-[10px] text-slate-600 whitespace-nowrap">Hours:</label>
                <select
                  value={editingHours}
                  onChange={(e) => setEditingHours(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit()
                    } else if (e.key === 'Escape') {
                      handleCancelEdit()
                    }
                  }}
                  className="w-20 px-2 py-1.5 text-[10px] border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 flex-shrink-0"
                >
                  <option value="0.5">30 min</option>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((hour) => (
                    <option key={hour} value={hour}>
                      {hour === 1 ? '1 hr' : `${hour} hrs`}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5 ml-auto flex-shrink-0">
                  <button
                    onClick={handleSaveEdit}
                    className="px-2.5 py-1 text-[10px] font-medium bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors whitespace-nowrap"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-2.5 py-1 text-[10px] font-medium bg-slate-300 hover:bg-slate-400 text-slate-800 rounded transition-colors whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p
                className={`text-[11px] leading-snug break-words ${
                  isCompleted ? "line-through text-slate-400" : "text-slate-600"
                }`}
                title={subtask.name}
              >
                {subtask.name}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {/* Estimate hours - prominent display */}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-white border border-slate-900">
                  {storyPointsToHoursDisplay(subtask.storyPoints)}
                </span>
            {subtask.priority && (
              <span className={`text-[8px] px-1 py-0.5 rounded border ${
                subtask.priority === 'urgent' 
                  ? 'bg-red-100 text-red-600 border-red-200'
                  : subtask.priority === 'high'
                  ? 'bg-orange-100 text-orange-600 border-orange-200'
                  : subtask.priority === 'medium'
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-blue-100 text-blue-600 border-blue-200'
              }`}>
                {subtask.priority}
              </span>
            )}
          </div>
            </>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 smooth-transition">
            <button
              type="button"
              draggable={false}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onDelete()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 smooth-transition"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: re-render if status changes or subtask data changes
  return (
    prevProps.subtask.id === nextProps.subtask.id &&
    prevProps.subtask.status === nextProps.subtask.status &&
    prevProps.subtask.name === nextProps.subtask.name &&
    prevProps.subtask.storyPoints === nextProps.subtask.storyPoints &&
    prevProps.parentTask.id === nextProps.parentTask.id &&
    prevProps.parentProject.id === nextProps.parentProject.id &&
    prevProps.columnStatus === nextProps.columnStatus
  )
})

// Gantt Task Card Component (for tasks without subtasks)
const GanttTaskCard = React.memo(function GanttTaskCard({
  task,
  parentProject,
  onUpdate,
  onDelete,
  columnStatus,
  onDragStartCallback,
}: {
  task: GanttTask
  parentProject: GanttProject
  onUpdate: (updates: Partial<GanttTask>) => void
  onDelete: () => void
  columnStatus: TaskStatus | "sprint" | "today" | "routine"
  onDragStartCallback?: (data: { type: 'task', projectId: string, taskId: string }) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingName, setEditingName] = useState(task.name)
  const [editingHours, setEditingHours] = useState<string>(String(storyPointsToHours((task as any).totalPoints)))
  const [lastClickInfo, setLastClickInfo] = useState<{ time: number } | null>(null)

  // Handle click for manual double-click detection
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const now = Date.now()
    
    // Check if this is a double-click (within 300ms)
    if (lastClickInfo && now - lastClickInfo.time < 300) {
      e.preventDefault()
      setIsEditing(true)
      setEditingName(task.name)
      setEditingHours(String(storyPointsToHours((task as any).totalPoints)))
      setLastClickInfo(null)
    } else {
      // Store this click for potential double-click
      setLastClickInfo({ time: now })
      setTimeout(() => {
        setLastClickInfo(prev => prev?.time === now ? null : prev)
      }, 300)
    }
  }

  // Also keep native double-click as fallback
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsEditing(true)
    setEditingName(task.name)
    setEditingHours(storyPointsToHours((task as any).totalPoints))
    setLastClickInfo(null)
  }

  const handleSaveEdit = () => {
    const hoursValue = parseFloat(editingHours) || 0.5
    onUpdate({
      name: editingName.trim() || task.name,
      totalPoints: hoursToStoryPoints(hoursValue),
    } as any)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingName(task.name)
    setEditingHours(String(storyPointsToHours((task as any).totalPoints)))
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (isEditing) {
      e.preventDefault()
      return
    }
    // Prevent drag if this might be a double-click attempt
    if (lastClickInfo) {
      const timeSinceClick = Date.now() - lastClickInfo.time
      if (timeSinceClick < 400) {
        e.preventDefault()
        setLastClickInfo(null)
        return
      }
    }
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `gantt-task:${parentProject.id}:${task.id}`)
    // Store dragged item data for preview
    if (onDragStartCallback) {
      onDragStartCallback({ type: 'task', projectId: parentProject.id, taskId: task.id })
    }
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.offsetWidth / 2, e.currentTarget.offsetHeight / 2)
    }
    setLastClickInfo(null)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const isCompleted = task.status === 'completed'
  const projectColor = parentProject.color || '#3b82f6'
  
  // Generate task color by lightening the project color (blend with white)
  const lightenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = (num >> 16) & 0xFF
    const g = (num >> 8) & 0xFF
    const b = num & 0xFF
    // Blend with white (255, 255, 255)
    const newR = Math.round(r + (255 - r) * percent)
    const newG = Math.round(g + (255 - g) * percent)
    const newB = Math.round(b + (255 - b) * percent)
    return `#${((newR << 16) | (newG << 8) | newB).toString(16).padStart(6, '0')}`
  }
  
  const taskColor = task.color || lightenColor(projectColor, 0.25)

  return (
    <div
      draggable={!isEditing}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={!isEditing ? "Double-click to edit" : ""}
      className={`group relative rounded-md border border-slate-200 backdrop-blur-sm p-2.5 smooth-transition ${
        isCompleted 
          ? "opacity-60 cursor-not-allowed" 
          : isEditing
          ? "ring-2 ring-blue-400 cursor-default min-w-[200px]"
          : isDragging
          ? "border-blue-300 bg-blue-50 shadow-sm opacity-75 cursor-grabbing"
          : "hover:bg-slate-100 hover:border-slate-300 cursor-move"
      }`}
      style={{
        backgroundColor: isCompleted 
          ? 'rgba(241, 245, 249, 0.5)' 
          : isDragging
          ? undefined
          : hexToRgba(projectColor, 0.08), // 8% opacity for subtle tint
        borderLeftColor: projectColor,
        borderLeftWidth: '3px',
      }}
    >
      <div className="flex items-start gap-1.5 pl-1">
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Project tag at the top */}
          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
            <span 
              className="text-[8px] px-1.5 py-0.5 rounded font-medium text-white truncate max-w-full"
              style={{ backgroundColor: projectColor }}
              title={parentProject.name}
            >
              {parentProject.name}
            </span>
            <span 
              className="text-[8px] px-1.5 py-0.5 rounded font-medium text-white flex-shrink-0"
              style={{ backgroundColor: taskColor }}
            >
              TASK
            </span>
          </div>
          
          {/* Task name */}
          {isEditing ? (
            <div className="space-y-2 min-w-0">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit()
                  } else if (e.key === 'Escape') {
                    handleCancelEdit()
                  }
                }}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Task name"
                autoFocus
              />
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-[10px] text-slate-600 whitespace-nowrap">Hours:</label>
                <select
                  value={editingHours}
                  onChange={(e) => setEditingHours(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit()
                    } else if (e.key === 'Escape') {
                      handleCancelEdit()
                    }
                  }}
                  className="w-20 px-2 py-1.5 text-[10px] border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 flex-shrink-0"
                >
                  <option value="0.5">30 min</option>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((hour) => (
                    <option key={hour} value={hour}>
                      {hour === 1 ? '1 hr' : `${hour} hrs`}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5 ml-auto flex-shrink-0">
                  <button
                    onClick={handleSaveEdit}
                    className="px-2.5 py-1 text-[10px] font-medium bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors whitespace-nowrap"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-2.5 py-1 text-[10px] font-medium bg-slate-300 hover:bg-slate-400 text-slate-800 rounded transition-colors whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p 
                className={`text-xs font-medium text-slate-800 mb-1.5 break-words ${isCompleted ? 'line-through' : ''}`}
                title={task.name || '(Untitled Task)'}
              >
                {task.name || '(Untitled Task)'}
              </p>
              
              {/* Priority and Hours */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {/* Estimate hours - prominent display */}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-white border border-slate-900">
                  {storyPointsToHoursDisplay((task as any).totalPoints)}
                </span>
            {task.priority && (
              <span className={`text-[8px] px-1.5 py-0.5 rounded font-medium ${
                task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {task.priority}
              </span>
            )}
              </div>
            </>
          )}
        </div>
        
        {/* Delete button */}
        {!isEditing && (
          <button
            type="button"
            draggable={false}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onDelete()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 smooth-transition opacity-0 group-hover:opacity-100"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: re-render if status changes or task data changes
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.name === nextProps.task.name &&
    (prevProps.task as any).totalPoints === (nextProps.task as any).totalPoints &&
    prevProps.parentProject.id === nextProps.parentProject.id &&
    prevProps.columnStatus === nextProps.columnStatus
  )
})

const SubtaskCard = React.memo(function SubtaskCard({
  subtask,
  parentTask,
  onToggle,
  onDelete,
  onStartFocus,
}: {
  subtask: Subtask
  parentTask: Task
  onToggle: () => void
  onDelete: () => void
  onStartFocus: () => void
}) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    if (subtask.completed) {
      e.preventDefault()
      return
    }
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `subtask:${parentTask.id}:${subtask.id}`)
    // Set drag image to be the element itself
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.offsetWidth / 2, e.currentTarget.offsetHeight / 2)
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  return (
    <div
      draggable={!subtask.completed}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group relative rounded-md border border-slate-200 bg-slate-50/70 backdrop-blur-sm p-2.5 smooth-transition ${
        subtask.completed 
          ? "opacity-60 cursor-not-allowed" 
          : isDragging
          ? "border-blue-300 bg-blue-50 shadow-sm opacity-75 cursor-grabbing"
          : "hover:bg-slate-100 hover:border-slate-300 cursor-move"
      }`}
    >
      {/* Subtask indicator - small left border */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-300 rounded-l-md" />
      
      <div className="flex items-start gap-1.5 pl-1">
        <button
          type="button"
          draggable={false}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onToggle()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 smooth-transition ${
            subtask.completed
              ? "bg-emerald-500 border-emerald-600 text-white"
              : "border-slate-300 hover:border-emerald-500 bg-white"
          }`}
        >
          {subtask.completed && (
            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={`text-[11px] leading-snug ${
              subtask.completed ? "line-through text-slate-400" : "text-slate-600"
            }`}
          >
            {subtask.title}
          </p>
          <p className="text-[9px] text-slate-400 mt-0.5 font-medium">From: {parentTask.title}</p>
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {subtask.priority && (
              <span className={`text-[8px] px-1 py-0.5 rounded border ${
                subtask.priority === 'urgent' 
                  ? 'bg-red-100 text-red-600 border-red-200'
                  : subtask.priority === 'high'
                  ? 'bg-orange-100 text-orange-600 border-orange-200'
                  : subtask.priority === 'medium'
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-blue-100 text-blue-600 border-blue-200'
              }`}>
                {subtask.priority}
              </span>
            )}
            {subtask.difficulty && (
              <span className="text-[8px] px-1 py-0.5 rounded bg-blue-100 text-blue-600 border border-blue-200">
                {difficultyLabels[subtask.difficulty]}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 smooth-transition">
          <button
            type="button"
            draggable={false}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onStartFocus()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 text-blue-500 hover:text-blue-600 rounded hover:bg-blue-50 smooth-transition"
            title="Start Focus Session"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            type="button"
            draggable={false}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onDelete()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 smooth-transition"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
})

// Helper function to get today's date as YYYY-MM-DD
const getTodayString = (): string => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// Helper to get date N days from today
const getDateDaysFromToday = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}


export default function TaskManager() {
  const { tasks, addTask, updateTask, deleteTask, toggleTaskStatus, toggleSubtask, addSubtask, deleteSubtask } = useTasks()
  const { projects, addProject, updateProject, deleteProject, addTask: addGanttTask, updateTask: updateGanttTask, deleteTask: deleteGanttTask, addSubtask: addGanttSubtask, updateSubtask: updateGanttSubtask, deleteSubtask: deleteGanttSubtask } = useGanttContext()
  const [view, setView] = useState<"board" | "weeklyplan" | "focus" | "projects2" | "ganttv2">("board")
  // Track individual subtask column assignments (subtaskId -> column status)
  const [subtaskColumnAssignments, setSubtaskColumnAssignments] = useState<Map<string, TaskStatus | "sprint" | "today" | "routine">>(new Map())
  // Track which subtasks we've already processed for auto-assignment
  const [processedSubtaskIds, setProcessedSubtaskIds] = useState<Set<string>>(new Set())
  const [creatingTaskInColumn, setCreatingTaskInColumn] = useState<TaskStatus | "sprint" | "today" | null>(null)
  const [newTaskData, setNewTaskData] = useState<{
    status: TaskStatus
    title: string
    description: string
    priority: TaskPriority
    difficulty: TaskDifficulty | undefined
    dueDate: string
    startDate: string
    category: string
  } | null>(null)
  const [newSubtask, setNewSubtask] = useState("")
  const [showSubtaskInput, setShowSubtaskInput] = useState(false)
  const [subtaskDifficulty, setSubtaskDifficulty] = useState<TaskDifficulty | undefined>(undefined)
  const [subtaskPriority, setSubtaskPriority] = useState<TaskPriority>("medium")
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(null)
  const [editSubtaskData, setEditSubtaskData] = useState<{ title: string; difficulty?: TaskDifficulty; priority?: TaskPriority } | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskData, setEditTaskData] = useState<Partial<Task> | null>(null)
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false)
  const [pendingExitAction, setPendingExitAction] = useState<(() => void) | null>(null)
  const [isContinuingEdit, setIsContinuingEdit] = useState(false)
  const isClosingConfirmModalRef = useRef(false)

  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()))

  // Drag and drop state for timeline
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [resizingTaskId, setResizingTaskId] = useState<string | null>(null)
  const [resizeSide, setResizeSide] = useState<'left' | 'right' | null>(null)
  const [resizeStartX, setResizeStartX] = useState<number>(0)
  const [dragOverDay, setDragOverDay] = useState<Date | null>(null)
  const [dragOverHour, setDragOverHour] = useState<number | null>(null)
  const [dragOverHalf, setDragOverHalf] = useState<'upper' | 'lower' | null>(null) // Track which half of hour is hovered
  const [draggedItemData, setDraggedItemData] = useState<{ type: 'task' | 'subtask', projectId: string, taskId: string, subtaskId?: string } | null>(null)
  const draggedItemDataRef = useRef<{ type: 'task' | 'subtask', projectId: string, taskId: string, subtaskId?: string } | null>(null)
  // State for creating routine tasks in Weekly Plan
  const [isCreatingRoutineTask, setIsCreatingRoutineTask] = useState(false)
  const [newRoutineTaskName, setNewRoutineTaskName] = useState('')
  const [newRoutineTaskHours, setNewRoutineTaskHours] = useState<number>(0.5)
  // State for editing scheduled blocks in weekly plan
  const [editingScheduledBlockId, setEditingScheduledBlockId] = useState<string | null>(null)
  const [editingBlockName, setEditingBlockName] = useState('')
  const [editingBlockHours, setEditingBlockHours] = useState<string>('1')
  // Track clicks for manual double-click detection (needed because draggable interferes with native double-click)
  const [lastClickInfo, setLastClickInfo] = useState<{ id: string; time: number } | null>(null)
  // State for tooltip
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Force re-render after updates
  const [updateTrigger, setUpdateTrigger] = useState(0)
  // State for delete confirmation modal for sprint/routine tasks
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    item: {
      id: string
      name: string
      type: 'task' | 'subtask'
      projectId: string
      taskId?: string
      subtaskId?: string
      isRoutine: boolean
      projectName: string
      taskName?: string
    }
  } | null>(null)
  // Store routine task instances that have been scheduled (so they can be dragged multiple times)
  const ROUTINE_INSTANCES_KEY = 'jarvis_routine_instances'
  
  type RoutineInstance = {
    id: string
    originalId: string
    projectId: string
    taskId?: string
    subtaskId?: string
    name: string
    startDate: string
    dueDate: string
    type: 'task' | 'subtask'
    totalPoints?: number
    storyPoints?: number
    projectColor: string
    taskColor?: string
    projectName: string
    taskName?: string
  }
  
  // Load routine instances from localStorage on mount
  const [routineInstances, setRoutineInstances] = useState<Array<RoutineInstance>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(ROUTINE_INSTANCES_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          // Filter out instances that are too old (older than 2 weeks) to prevent localStorage bloat
          const twoWeeksAgo = new Date()
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
          return parsed.filter((inst: RoutineInstance) => {
            const instanceDate = new Date(inst.startDate)
            return instanceDate >= twoWeeksAgo
          })
        } catch (e) {
          console.error('Failed to load routine instances:', e)
          return []
        }
      }
    }
    return []
  })
  
  // Save routine instances to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ROUTINE_INSTANCES_KEY, JSON.stringify(routineInstances))
    }
  }, [routineInstances])
  
  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current)
      }
    }
  }, [])
  
  const [resizeStartCol, setResizeStartCol] = useState<number>(0)

  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_WORK_DURATION)
  const [isRunning, setIsRunning] = useState(false)
  const [isRestPeriod, setIsRestPeriod] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [accumulatedTime, setAccumulatedTime] = useState(0) // in seconds

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    if (isRunning && focusTaskId) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            // Timer finished
            if (isRestPeriod) {
              // Rest period finished, go back to work
              setIsRestPeriod(false)
              setSecondsLeft(POMODORO_WORK_DURATION)
            setIsRunning(false)
            } else {
              // Work period finished, start rest
              setIsRestPeriod(true)
              setSecondsLeft(POMODORO_REST_DURATION)
              // Save the work time (25 minutes) and add to time log
              const task = tasks.find(t => t.id === focusTaskId)
              if (task) {
                const currentTime = task.timeSpent || 0
                const now = new Date()
                const startTime = new Date(now.getTime() - 25 * 60 * 1000) // 25 minutes ago
                const timeEntry = {
                  id: `time-${Date.now()}-${Math.random()}`,
                  duration: 25,
                  startTime: startTime.toISOString(),
                  endTime: now.toISOString(),
                  type: 'work' as const,
                }
                const timeLog = task.timeLog || []
                updateTask(focusTaskId, { 
                  timeSpent: currentTime + 25,
                  timeLog: [...timeLog, timeEntry]
                })
              }
            }
            return prev
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, focusTaskId, isRestPeriod, tasks, updateTask])

  // Handle resize functionality
  useEffect(() => {
    if (!resizingTaskId || !resizeSide) return

    const handleMouseMove = (e: MouseEvent) => {
      const timelineContainer = document.querySelector('.bg-white.rounded-2xl.border.border-slate-200\\/60')
      if (!timelineContainer) return

      const rect = timelineContainer.getBoundingClientRect()
      const x = e.clientX - rect.left
      const dayWidth = rect.width / 7
      const dayIndex = Math.floor(x / dayWidth)
      const dayIndexClamped = Math.max(0, Math.min(6, dayIndex))
      
      const task = tasks.find(t => t.id === resizingTaskId)
      if (!task || !task.startDate || !task.dueDate) return

      const normalizeDate = (date: Date) => {
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        return d
      }

      // Calculate weekDays from currentWeekStart
      const weekDaysArray = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(currentWeekStart)
        date.setDate(date.getDate() + i)
        return date
      })

      const currentStart = normalizeDate(new Date(task.startDate))
      const currentEnd = normalizeDate(new Date(task.dueDate))
      const targetDate = normalizeDate(new Date(weekDaysArray[dayIndexClamped]))

      if (resizeSide === 'left') {
        // Resize from left - update start date
        if (targetDate <= currentEnd) {
          updateTask(resizingTaskId, {
            startDate: targetDate.toISOString().split('T')[0],
          })
        }
      } else if (resizeSide === 'right') {
        // Resize from right - update end date
        if (targetDate >= currentStart) {
          updateTask(resizingTaskId, {
            dueDate: targetDate.toISOString().split('T')[0],
          })
        }
      }
    }

    const handleMouseUp = () => {
      setResizingTaskId(null)
      setResizeSide(null)
      setResizeStartX(0)
      setResizeStartCol(0)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingTaskId, resizeSide, tasks, updateTask, currentWeekStart])

  // Track time when session starts/stops
  useEffect(() => {
    if (isRunning && focusTaskId && !isRestPeriod && sessionStartTime === null) {
      setSessionStartTime(Date.now())
    }
    if (!isRunning && sessionStartTime !== null && focusTaskId && !isRestPeriod) {
      // Calculate time spent in this session
      const endTime = Date.now()
      const timeSpent = Math.floor((endTime - sessionStartTime) / 1000 / 60) // in minutes
      if (timeSpent > 0) {
        const task = tasks.find(t => t.id === focusTaskId)
        if (task) {
          const currentTime = task.timeSpent || 0
          const timeEntry = {
            id: `time-${Date.now()}-${Math.random()}`,
            duration: timeSpent,
            startTime: new Date(sessionStartTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            type: 'work' as const,
          }
          const timeLog = task.timeLog || []
          updateTask(focusTaskId, { 
            timeSpent: currentTime + timeSpent,
            timeLog: [...timeLog, timeEntry]
          })
        }
      }
      setSessionStartTime(null)
    }
  }, [isRunning, focusTaskId, isRestPeriod, sessionStartTime, tasks, updateTask])

  // Auto-assign new subtasks to Backlog (todo) column
  useEffect(() => {
    // Find all subtasks that don't have a column assignment yet and haven't been processed
    const newSubtasks: Array<{ subtaskId: string }> = []
    
    tasks.forEach((task) => {
      if (task.subtasks) {
        task.subtasks.forEach((subtask) => {
          if (!subtask.completed && 
              !subtaskColumnAssignments.has(subtask.id) && 
              !processedSubtaskIds.has(subtask.id)) {
            newSubtasks.push({ subtaskId: subtask.id })
          }
        })
      }
    })
    
    // Assign new subtasks to "todo" (Backlog) column
    if (newSubtasks.length > 0) {
      setSubtaskColumnAssignments(prev => {
        const newMap = new Map(prev)
        newSubtasks.forEach(({ subtaskId }) => {
          newMap.set(subtaskId, "todo")
        })
        return newMap
      })
      
      // Mark these subtasks as processed
      setProcessedSubtaskIds(prev => {
        const newSet = new Set(prev)
        newSubtasks.forEach(({ subtaskId }) => {
          newSet.add(subtaskId)
        })
        return newSet
      })
    }
  }, [tasks, view, subtaskColumnAssignments, processedSubtaskIds])

  const groupedTasks = useMemo(() => {
    return columnConfig.map((column) => {
      let filteredTasks: Task[] = []
      
      if (column.status === "sprint") {
        // Sprint tasks: filter by category "sprint" or tag "sprint", and not completed/cancelled
        filteredTasks = tasks.filter((task) => 
          task.status !== "completed" && 
          task.status !== "cancelled" &&
          (task.category?.toLowerCase() === "sprint" || task.tags?.some(tag => tag.toLowerCase() === "sprint"))
        )
      } else if (column.status === "today") {
        // Today tasks: due today and not completed/cancelled
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        filteredTasks = tasks.filter((task) => {
          if (task.status === "completed" || task.status === "cancelled") return false
          if (!task.dueDate) return false
          const taskDate = new Date(task.dueDate)
          taskDate.setHours(0, 0, 0, 0)
          return (
            taskDate.getFullYear() === today.getFullYear() &&
            taskDate.getMonth() === today.getMonth() &&
            taskDate.getDate() === today.getDate()
          )
        })
      } else {
        // Regular status-based columns
        filteredTasks = tasks.filter((task) => task.status === column.status && task.status !== "cancelled")
      }
      
      return {
        ...column,
        tasks: filteredTasks,
      }
    })
  }, [tasks])

  // Group Gantt subtasks and tasks (without subtasks) by their status for board view
  // Map Gantt status to column status: backlog->todo, sprint->sprint, today->today, active->in-progress, completed->completed, refinement->todo, routine->routine
  const groupedGanttSubtasks = useMemo(() => {
    // Map Gantt status to column status
    const mapGanttStatusToColumn = (ganttStatus?: string): TaskStatus | "sprint" | "today" | "routine" | null => {
      if (!ganttStatus) return "todo" // Default to backlog/todo
      switch (ganttStatus) {
        case 'backlog': return 'todo'
        case 'sprint': return 'sprint'
        case 'routine': return 'routine'
        case 'today': return 'today'
        case 'active': return 'in-progress'
        case 'completed': return 'completed'
        case 'refinement': return 'todo' // Refinement maps to todo/backlog column
        default: return 'todo'
      }
    }

    // Extract all subtasks from Gantt projects
    const allGanttSubtasks: Array<{ 
      subtask: GanttSubtask; 
      parentTask: GanttTask; 
      parentProject: GanttProject 
    }> = []
    
    // Extract all tasks that don't have subtasks
    const allGanttTasksWithoutSubtasks: Array<{
      task: GanttTask;
      parentProject: GanttProject;
    }> = []
    
    projects.forEach((project) => {
      project.children?.forEach((task) => {
        // Check if task has subtasks
        const hasSubtasks = task.children && task.children.length > 0
        
        if (hasSubtasks) {
          // Extract subtasks
        task.children?.forEach((subtask) => {
          allGanttSubtasks.push({ subtask, parentTask: task, parentProject: project })
        })
        } else {
          // Task without subtasks - include it in the board
          allGanttTasksWithoutSubtasks.push({ task, parentProject: project })
        }
      })
    })

    // Group by column status
    return columnConfig.map((column) => {
      const subtasksWithParent = allGanttSubtasks
        .filter(({ subtask }) => {
          const columnStatus = mapGanttStatusToColumn(subtask.status)
          return columnStatus === column.status
        })
        .map(({ subtask, parentTask, parentProject }) => ({
          ganttSubtask: subtask,
          parentTask,
          parentProject,
        }))

      const tasksWithoutSubtasks = allGanttTasksWithoutSubtasks
        .filter(({ task }) => {
          const columnStatus = mapGanttStatusToColumn(task.status)
          return columnStatus === column.status
        })
        .map(({ task, parentProject }) => ({
          ganttTask: task,
          parentProject,
        }))

      return {
        ...column,
        ganttSubtasks: subtasksWithParent,
        ganttTasks: tasksWithoutSubtasks,
      }
    })
  }, [projects, updateTrigger])

  // Group subtasks by their parent task's status/column for board view
  // Each subtask should only appear in one column (priority: explicit assignment > sprint > today > status)
  const groupedSubtasks = useMemo(() => {
    // Track which subtasks have already been assigned to a column
    const assignedSubtaskIds = new Set<string>()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return columnConfig.map((column) => {
      const subtasksWithParent: Array<{ subtask: Subtask; parentTask: Task }> = []
      
      // First, collect subtasks that have explicit column assignments matching this column
      tasks.forEach((task) => {
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((subtask) => {
            if (!subtask.completed && !assignedSubtaskIds.has(subtask.id)) {
              const assignedColumn = subtaskColumnAssignments.get(subtask.id)
              if (assignedColumn === column.status) {
                subtasksWithParent.push({ subtask, parentTask: task })
                assignedSubtaskIds.add(subtask.id)
              }
            }
          })
        }
      })
      
      // Then, get all tasks that match this column (for subtasks without explicit assignments)
      let parentTasks: Task[] = []
      
      if (column.status === "sprint") {
        // Sprint tasks: filter by category "sprint" or tag "sprint", and not completed/cancelled
        parentTasks = tasks.filter((task) => 
          task.status !== "completed" && 
          task.status !== "cancelled" &&
          (task.category?.toLowerCase() === "sprint" || task.tags?.some(tag => tag.toLowerCase() === "sprint"))
        )
      } else if (column.status === "today") {
        // Today tasks: due today and not completed/cancelled, AND not already in sprint
        parentTasks = tasks.filter((task) => {
          if (task.status === "completed" || task.status === "cancelled") return false
          // Exclude tasks that are in sprint
          if (task.category?.toLowerCase() === "sprint" || task.tags?.some(tag => tag.toLowerCase() === "sprint")) {
            return false
          }
          if (!task.dueDate) return false
          const taskDate = new Date(task.dueDate)
          taskDate.setHours(0, 0, 0, 0)
          return (
            taskDate.getFullYear() === today.getFullYear() &&
            taskDate.getMonth() === today.getMonth() &&
            taskDate.getDate() === today.getDate()
          )
        })
      } else {
        // Regular status-based columns: exclude tasks that are in sprint or today
        parentTasks = tasks.filter((task) => {
          if (task.status !== column.status || task.status === "cancelled") return false
          // Exclude tasks that are in sprint
          if (task.category?.toLowerCase() === "sprint" || task.tags?.some(tag => tag.toLowerCase() === "sprint")) {
            return false
          }
          // Exclude tasks that are due today
          if (task.dueDate) {
            const taskDate = new Date(task.dueDate)
            taskDate.setHours(0, 0, 0, 0)
            if (
              taskDate.getFullYear() === today.getFullYear() &&
              taskDate.getMonth() === today.getMonth() &&
              taskDate.getDate() === today.getDate()
            ) {
              return false
            }
          }
          return true
        })
      }
      
      // Extract all subtasks from matching parent tasks (that don't have explicit assignments)
      parentTasks.forEach((task) => {
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((subtask) => {
            if (!subtask.completed && !assignedSubtaskIds.has(subtask.id)) {
              // Only include if this subtask doesn't have an explicit assignment to a different column
              const assignedColumn = subtaskColumnAssignments.get(subtask.id)
              if (!assignedColumn || assignedColumn === column.status) {
                subtasksWithParent.push({ subtask, parentTask: task })
                assignedSubtaskIds.add(subtask.id)
              }
            }
          })
        }
      })
      
      return {
        ...column,
        subtasks: subtasksWithParent,
      }
    })
  }, [tasks, subtaskColumnAssignments])

  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart])

  // Convert story points to hours
  // 1 story point = 1 hour (direct mapping)
  const storyPointsToHours = (points?: number): number => {
    if (!points || points <= 0) return 1 // Default to 1 hour if no points
    return points // Direct mapping: story points = hours
  }

  // Get all scheduled tasks and subtasks for the current week
  const scheduledItems = useMemo(() => {
    const items: Array<{
      id: string
      projectId: string
      taskId?: string
      subtaskId?: string
      name: string
      startDate: Date
      endDate: Date
      startHour: number
      durationHours: number
      projectColor: string
      taskColor?: string
      type: 'task' | 'subtask'
      projectName: string
      taskName?: string
    }> = []

    const weekStart = new Date(currentWeekStart)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    projects.forEach((project) => {
      project.children?.forEach((task) => {
        // Tasks without subtasks
        if (!task.children || task.children.length === 0) {
            if (task.startDate) {
              const startDate = new Date(task.startDate)
              startDate.setHours(0, 0, 0, 0) // Normalize to start of day
              
              // Check if task falls within the current week
              if (startDate >= weekStart && startDate < weekEnd) {
                // Get the actual start hour from the startDate if it has time info
                const actualStartDate = new Date(task.startDate)
                // Check if date string includes time (has 'T' separator) - only show tasks explicitly scheduled with time
                const hasTime = task.startDate.includes('T')
                // Only include tasks that were explicitly scheduled in the weekly calendar (have time component)
                if (!hasTime) return // Skip tasks without time - they weren't scheduled in weekly calendar
                const startHour = actualStartDate.getHours()
                
                // Only include items that start between 5 AM and 12 AM (midnight)
                // 12 AM is hour 0, so we check for hours >= 5 or hour === 0
                if ((startHour >= 5 && startHour < 24) || startHour === 0) {
                  // Calculate duration from totalPoints (for tasks without subtasks, matches projects table)
                  let durationHours = storyPointsToHours((task as any).totalPoints)
                  if (task.endDate) {
                    const endDate = new Date(task.endDate)
                    const calculatedDuration = (endDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60) // Convert to hours
                    // Use the calculated duration if it's valid and totalPoints aren't available
                    if (calculatedDuration > 0 && (!(task as any).totalPoints || (task as any).totalPoints <= 0)) {
                      durationHours = calculatedDuration
                    }
                  }
                  
                  // For display, convert hour 0 (12 AM) to 24 for easier calculation
                  const displayStartHour = startHour === 0 ? 24 : startHour
                  const endHour = displayStartHour + durationHours
                  const clampedEndHour = Math.min(endHour, 24) // 24 represents 12 AM (midnight)
                  const clampedDurationHours = clampedEndHour - displayStartHour
                  
                  // Only add if the task has any visible duration within the 5 AM - 12 AM window
                  if (clampedDurationHours > 0) {
                    items.push({
                      id: task.id,
                      projectId: project.id,
                      taskId: task.id,
                      name: task.name,
                      startDate: actualStartDate,
                      endDate: new Date(actualStartDate.getTime() + clampedDurationHours * 60 * 60 * 1000),
                      startHour: displayStartHour, // Store display hour (5-24) for rendering
                      durationHours: clampedDurationHours,
                      projectColor: project.color || '#3b82f6',
                      taskColor: task.color,
                      type: 'task',
                      projectName: project.name,
                    })
                  }
                }
            }
          }
        } else {
          // Subtasks
          task.children.forEach((subtask) => {
            if (subtask.startDate) {
              const startDate = new Date(subtask.startDate)
              startDate.setHours(0, 0, 0, 0) // Normalize to start of day
              
              // Check if subtask falls within the current week
              if (startDate >= weekStart && startDate < weekEnd) {
                // Get the actual start hour from the startDate if it has time info
                const actualStartDate = new Date(subtask.startDate)
                // Check if date string includes time (has 'T' separator) - only show subtasks explicitly scheduled with time
                const hasTime = subtask.startDate.includes('T')
                // Only include subtasks that were explicitly scheduled in the weekly calendar (have time component)
                if (!hasTime) return // Skip subtasks without time - they weren't scheduled in weekly calendar
                const startHour = actualStartDate.getHours()
                
                // Only include items that start between 5 AM and 12 AM (midnight)
                // 12 AM is hour 0, so we check for hours >= 5 or hour === 0
                if ((startHour >= 5 && startHour < 24) || startHour === 0) {
                  // Calculate duration from story points, or from stored dates if story points not available
                  let durationHours = storyPointsToHours(subtask.storyPoints)
                  if (subtask.endDate) {
                    const endDate = new Date(subtask.endDate)
                    const calculatedDuration = (endDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60) // Convert to hours
                    // Use the calculated duration if it's valid and story points aren't available
                    if (calculatedDuration > 0 && (!subtask.storyPoints || subtask.storyPoints <= 0)) {
                      durationHours = calculatedDuration
                    }
                  }
                  
                  // For display, convert hour 0 (12 AM) to 24 for easier calculation
                  const displayStartHour = startHour === 0 ? 24 : startHour
                  const endHour = displayStartHour + durationHours
                  const clampedEndHour = Math.min(endHour, 24) // 24 represents 12 AM (midnight)
                  const clampedDurationHours = clampedEndHour - displayStartHour
                  
                  // Only add if the subtask has any visible duration within the 5 AM - 12 AM window
                  if (clampedDurationHours > 0) {
                    items.push({
                      id: subtask.id,
                      projectId: project.id,
                      taskId: task.id,
                      subtaskId: subtask.id,
                      name: subtask.name,
                      startDate: actualStartDate,
                      endDate: new Date(actualStartDate.getTime() + clampedDurationHours * 60 * 60 * 1000),
                      startHour: displayStartHour, // Store display hour (5-24) for rendering
                      durationHours: clampedDurationHours,
                      projectColor: project.color || '#3b82f6',
                      taskColor: task.color,
                      type: 'subtask',
                      projectName: project.name,
                      taskName: task.name,
                    })
                  }
                }
              }
            }
          })
        }
      })
    })

    // Add routine instances to scheduled items
    routineInstances.forEach((instance) => {
      const startDate = new Date(instance.startDate)
      startDate.setHours(0, 0, 0, 0)
      
      const weekStart = new Date(currentWeekStart)
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      
      if (startDate >= weekStart && startDate < weekEnd) {
        const actualStartDate = new Date(instance.startDate)
        const hasTime = instance.startDate.includes('T')
        if (!hasTime) return
        
        const startHour = actualStartDate.getHours()
        if ((startHour >= 5 && startHour < 24) || startHour === 0) {
          let durationHours = instance.type === 'task' 
            ? storyPointsToHours(instance.totalPoints)
            : storyPointsToHours(instance.storyPoints)
          
          if (instance.dueDate) {
            const endDate = new Date(instance.dueDate)
            const calculatedDuration = (endDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60)
            if (calculatedDuration > 0 && ((instance.type === 'task' && (!instance.totalPoints || instance.totalPoints <= 0)) || 
                (instance.type === 'subtask' && (!instance.storyPoints || instance.storyPoints <= 0)))) {
              durationHours = calculatedDuration
            }
          }
          
          const displayStartHour = startHour === 0 ? 24 : startHour
          const endHour = displayStartHour + durationHours
          const clampedEndHour = Math.min(endHour, 24)
          const clampedDurationHours = clampedEndHour - displayStartHour
          
          if (clampedDurationHours > 0) {
            items.push({
              id: instance.id,
              projectId: instance.projectId,
              taskId: instance.taskId,
              subtaskId: instance.subtaskId,
              name: instance.name,
              startDate: actualStartDate,
              endDate: new Date(actualStartDate.getTime() + clampedDurationHours * 60 * 60 * 1000),
              startHour: displayStartHour,
              durationHours: clampedDurationHours,
              projectColor: instance.projectColor,
              taskColor: instance.taskColor,
              type: instance.type,
              projectName: instance.projectName,
              taskName: instance.taskName,
            })
          }
        }
      }
    })

    return items
  }, [projects, currentWeekStart, routineInstances])

  // Calculate total hours per day
  const hoursPerDay = useMemo(() => {
    const hoursMap = new Map<string, number>()
    
    // Initialize all week days to 0
    weekDays.forEach((day) => {
      const dayCopy = new Date(day)
      dayCopy.setHours(0, 0, 0, 0)
      const dayKey = `${dayCopy.getFullYear()}-${String(dayCopy.getMonth() + 1).padStart(2, '0')}-${String(dayCopy.getDate()).padStart(2, '0')}`
      hoursMap.set(dayKey, 0)
    })
    
    // Sum hours for each scheduled item
    scheduledItems.forEach((item) => {
      const itemDate = new Date(item.startDate)
      itemDate.setHours(0, 0, 0, 0)
      const itemKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`
      
      // Check if this item's date matches any of the week days
      const matchingDay = weekDays.find(day => {
        const dayCopy = new Date(day)
        dayCopy.setHours(0, 0, 0, 0)
        return dayCopy.getTime() === itemDate.getTime()
      })
      
      if (matchingDay) {
        const currentHours = hoursMap.get(itemKey) || 0
        hoursMap.set(itemKey, currentHours + item.durationHours)
      }
    })
    
    return hoursMap
  }, [scheduledItems, weekDays])

  // Build a quick lookup set of scheduled ids (tasks & subtasks) for the current week
  const scheduledIdsThisWeek = useMemo(() => {
    const ids = new Set<string>()
    scheduledItems.forEach((item) => ids.add(item.id))
    return ids
  }, [scheduledItems])

  // Tasks and subtasks currently in the Sprint column (for weekly schedule sidebar)
  // Hide items that are already scheduled this week
  const sprintTasksForSchedule = useMemo(() => {
    const tasks = groupedGanttSubtasks.find(c => c.status === 'sprint')?.ganttTasks || []
    return tasks.filter(({ ganttTask }) => !scheduledIdsThisWeek.has(ganttTask.id))
  }, [groupedGanttSubtasks, scheduledIdsThisWeek])

  const sprintSubtasksForSchedule = useMemo(() => {
    const subtasks = groupedGanttSubtasks.find(c => c.status === 'sprint')?.ganttSubtasks || []
    return subtasks.filter(({ ganttSubtask }) => !scheduledIdsThisWeek.has(ganttSubtask.id))
  }, [groupedGanttSubtasks, scheduledIdsThisWeek])

  // Tasks and subtasks currently in the Routine column (for weekly schedule sidebar)
  // Routine tasks stay in the column even when scheduled (they can be dragged multiple times)
  const routineTasksForSchedule = useMemo(() => {
    return groupedGanttSubtasks.find(c => c.status === 'routine')?.ganttTasks || []
  }, [groupedGanttSubtasks, updateTrigger, projects])

  const routineSubtasksForSchedule = useMemo(() => {
    return groupedGanttSubtasks.find(c => c.status === 'routine')?.ganttSubtasks || []
  }, [groupedGanttSubtasks, updateTrigger, projects])

  // Handle deleting sprint/routine tasks from all places
  const handleConfirmDelete = () => {
    if (!deleteConfirmModal) return
    
    const { item } = deleteConfirmModal
    
    // For routine tasks, remove all routine instances from calendar first
    if (item.isRoutine) {
      if (item.type === 'task' && item.taskId) {
        setRoutineInstances(prev => prev.filter(instance => !(instance.originalId === item.taskId && instance.type === 'task')))
      } else if (item.type === 'subtask' && item.subtaskId) {
        setRoutineInstances(prev => prev.filter(instance => !(instance.originalId === item.subtaskId && instance.type === 'subtask')))
      }
    }
    
    // Delete the task/subtask from all places (board, gantt, projects table, calendar)
    // This will automatically remove it from calendar schedule, board section, gantt chart, and projects table
    if (item.type === 'task' && item.taskId && item.projectId && deleteGanttTask) {
      deleteGanttTask(item.projectId, item.taskId)
    } else if (item.type === 'subtask' && item.taskId && item.subtaskId && item.projectId && deleteGanttSubtask) {
      deleteGanttSubtask(item.projectId, item.taskId, item.subtaskId)
    }
    
    setDeleteConfirmModal(null)
  }

  // Handle creating a routine task
  const handleCreateRoutineTask = () => {
    if (!newRoutineTaskName.trim()) return

    // Find or create a "Routine" project
    let routineProject = projects.find(p => p.name.toLowerCase() === 'routine')
    
    if (!routineProject) {
      // Create a new "Routine" project
      const newProject = addProject('Routine')
      const projectId = newProject.id
      
      // Set the project status to routine
      updateProject(projectId, { status: 'routine' as GanttStatus })
      
      // Wait for state to update before adding task
      // Use setTimeout to ensure the project is in state
      setTimeout(() => {
          // Create the task in the Routine project
        // We have the projectId, so we don't need to find the project
          const newTask = addGanttTask(projectId, newRoutineTaskName.trim())
          
          // Set task status to routine and set hours (totalPoints)
        // updateTask now uses functional updates, so it will use the latest state
        setTimeout(() => {
          updateGanttTask(projectId, newTask.id, {
            status: 'routine' as GanttStatus,
            totalPoints: newRoutineTaskHours,
          } as any)
        }, 50)
        
        // Reset form
        setIsCreatingRoutineTask(false)
        setNewRoutineTaskName('')
        setNewRoutineTaskHours(0.5)
      }, 100)
    } else {
      // Project already exists, create task immediately
      const newTask = addGanttTask(routineProject.id, newRoutineTaskName.trim())
      
      // Set task status to routine and set hours (totalPoints)
      // updateTask now uses functional updates, so it will use the latest state
      setTimeout(() => {
      updateGanttTask(routineProject.id, newTask.id, {
        status: 'routine' as GanttStatus,
        totalPoints: newRoutineTaskHours,
      } as any)
      }, 50)

      // Reset form
      setIsCreatingRoutineTask(false)
      setNewRoutineTaskName('')
      setNewRoutineTaskHours(1)
    }
  }

  const todaysTasks = useMemo(() => {
    const today = new Date()
    return tasks.filter((task) => {
      if (task.status === "completed" || task.status === "cancelled") return false
      if (!task.dueDate) return true
      const taskDate = new Date(task.dueDate)
      return (
        taskDate.getFullYear() === today.getFullYear() &&
        taskDate.getMonth() === today.getMonth() &&
        taskDate.getDate() === today.getDate()
      )
    })
  }, [tasks])

  const activeFocusTask = focusTaskId ? tasks.find((task) => task.id === focusTaskId) : undefined
  const currentDuration = isRestPeriod ? POMODORO_REST_DURATION : POMODORO_WORK_DURATION
  const progressPercent = ((currentDuration - secondsLeft) / currentDuration) * 100
  
  // Get all tasks from board (not just today's)
  const boardTasks = useMemo(() => {
    return tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled")
  }, [tasks])

  // Get top 3 priority tasks for Today view
  const todayTasks = useMemo(() => {
    const priorityOrder: Record<TaskPriority, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    }
    
    return tasks
      .filter((task) => task.status !== "completed" && task.status !== "cancelled")
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 3)
  }, [tasks])

  const handleCreateNewTask = (status: TaskStatus | "sprint" | "today") => {
    setCreatingTaskInColumn(status)
    // For sprint and today columns, default to "todo" status but add category/tag
    const taskStatus: TaskStatus = status === "sprint" || status === "today" ? "todo" : status
    setNewTaskData({
      status: taskStatus,
      title: "",
      description: "",
      priority: "medium",
      difficulty: undefined,
      dueDate: status === "today" ? new Date().toISOString().split('T')[0] : "",
      startDate: "",
      category: status === "sprint" ? "sprint" : "",
    })
  }

  const handleSaveNewTask = () => {
    if (!newTaskData || !newTaskData.title.trim()) return

    // If creating in sprint column, ensure category is set
    const category = creatingTaskInColumn === "sprint" 
      ? "sprint" 
      : (newTaskData.category || undefined)
    
    // If creating in today column, ensure dueDate is today
    const dueDate = creatingTaskInColumn === "today"
      ? new Date().toISOString().split('T')[0]
      : (newTaskData.dueDate || undefined)

    const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: newTaskData.title,
      description: newTaskData.description || undefined,
      priority: newTaskData.priority,
      difficulty: newTaskData.difficulty,
      status: newTaskData.status,
      dueDate: dueDate,
      startDate: newTaskData.startDate || undefined,
      category: category,
    }

    addTask(newTask)
    setCreatingTaskInColumn(null)
    setNewTaskData(null)
  }

  const handleCancelNewTask = () => {
    setCreatingTaskInColumn(null)
    setNewTaskData(null)
  }

  const hasFormProgress = (data: typeof newTaskData) => {
    if (!data) return false
    return !!(
      data.title.trim() ||
      data.description.trim() ||
      data.dueDate ||
      data.startDate ||
      data.category ||
      data.difficulty ||
      data.priority !== "medium"
    )
  }

  const hasEditProgress = (originalTask: Task | undefined, editData: Partial<Task> | null) => {
    if (!originalTask || !editData) return false
    return !!(
      (editData.title && editData.title !== originalTask.title) ||
      (editData.description !== undefined && editData.description !== originalTask.description) ||
      (editData.dueDate !== undefined && editData.dueDate !== originalTask.dueDate) ||
      (editData.startDate !== undefined && editData.startDate !== originalTask.startDate) ||
      (editData.category !== undefined && editData.category !== originalTask.category) ||
      (editData.difficulty !== undefined && editData.difficulty !== originalTask.difficulty) ||
      (editData.priority !== undefined && editData.priority !== originalTask.priority)
    )
  }

  const handleExitCreateForm = () => {
    if (hasFormProgress(newTaskData)) {
      setPendingExitAction(() => handleCancelNewTask)
      setShowExitConfirmModal(true)
    } else {
      handleCancelNewTask()
    }
  }

  const handleExitEditForm = () => {
    // Don't do anything if confirmation modal is already open, we're closing it, or user chose to continue editing
    if (showExitConfirmModal || isClosingConfirmModalRef.current || isContinuingEdit) {
      return
    }
    
    const originalTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : undefined
    if (hasEditProgress(originalTask, editTaskData)) {
      setPendingExitAction(() => {
        setEditingTaskId(null)
        setEditTaskData(null)
        setEditingSubtaskIndex(null)
        setEditSubtaskData(null)
        setNewSubtask("")
        setSubtaskDifficulty(undefined)
        setSubtaskPriority("medium")
        setShowSubtaskInput(false)
      })
      setShowExitConfirmModal(true)
    } else {
      setEditingTaskId(null)
      setEditTaskData(null)
      setEditingSubtaskIndex(null)
      setEditSubtaskData(null)
      setNewSubtask("")
      setSubtaskDifficulty(undefined)
      setSubtaskPriority("medium")
      setShowSubtaskInput(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30 w-full">
      {/* Main Content */}
      <main className="h-full flex flex-col overflow-hidden overflow-x-hidden w-full bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
        {/* Enhanced Header with Improved Navigation */}
        <header className="relative border-b border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-sm sticky top-0 z-50">
          {/* Gradient accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          
          <div className="px-4 sm:px-6 lg:px-8">
            {/* Top Bar - Logo and Actions */}
            <div className="flex items-center justify-between py-4 gap-4">
              {/* Logo/Brand Section */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-sm" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                    Task Flow
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium">Intelligent task management</p>
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
              {/* Enhanced Search */}
                <div className="relative hidden md:block">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search tasks..."
                    className="pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50/80 backdrop-blur-sm border border-slate-200/60 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300/60 w-56 smooth-transition"
                />
              </div>
              
                {/* Quick Stats */}
                <div className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                  <div className="px-3 py-1 text-center">
                    <div className="text-base font-bold text-slate-900">{tasks.filter(t => t.status === "todo").length}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">BACKLOG</div>
                </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="px-3 py-1 text-center">
                    <div className="text-base font-bold text-slate-900">{tasks.filter(t => t.status === "in-progress").length}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">ACTIVE</div>
                </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="px-3 py-1 text-center">
                    <div className="text-base font-bold text-emerald-600">{tasks.filter(t => t.status === "completed").length}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">DONE</div>
                  </div>
                </div>
                </div>
              </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-0.5 border-t border-slate-200 bg-slate-50/30 px-2">
              {([
                { 
                  id: "projects2", 
                  label: "Projects Table", 
                  description: "Jira-style table view",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )
                },
                { 
                  id: "ganttv2", 
                  label: "Gantt Chart", 
                  description: "Strategic timeline view",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  )
                },
                { 
                  id: "board", 
                  label: "Board", 
                  description: "Kanban board view",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                  )
                },
                { 
                  id: "weeklyplan", 
                  label: "Weekly Plan", 
                  description: "Weekly timeline schedule",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )
                },
                { 
                  id: "focus", 
                  label: "Today's Plan", 
                  description: "Focus mode",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-t-lg ${
                    view === item.id
                      ? "text-slate-900 bg-white shadow-sm border-t border-x border-slate-200"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  }`}
                  title={item.description}
                >
                  <span className={`transition-colors ${view === item.id ? "text-slate-700" : "text-slate-400 group-hover:text-slate-600"}`}>
                    {item.icon}
                  </span>
                  <span className="hidden sm:inline">{item.label}</span>
                  {view === item.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className={`flex-1 overflow-x-hidden px-4 sm:px-6 lg:px-8 py-6 lg:py-8 ${view === "board" ? "overflow-y-auto flex flex-col" : "overflow-y-auto"}`}>
          {/* Exit Confirmation Modal */}
          {showExitConfirmModal && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  // Don't close - user needs to explicitly choose
                  return
                }
              }}
            >
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  // Don't close on backdrop click - user needs to explicitly choose
                }}
              />
              
              {/* Modal Content */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 bg-white rounded-2xl border border-slate-200 shadow-xl p-6 max-w-md w-full"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                    </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Are you sure you want to exit?</h3>
                    <p className="text-sm text-slate-600 mt-1">You have unsaved changes that will be lost.</p>
                                </div>
                              </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.nativeEvent.stopImmediatePropagation()
                      // Set flags to prevent backdrop from triggering
                      isClosingConfirmModalRef.current = true
                      setIsContinuingEdit(true)
                      // Just close the confirmation modal, don't do anything else
                      setShowExitConfirmModal(false)
                      setPendingExitAction(null)
                      // Reset flags after a delay to allow state to update
                      setTimeout(() => {
                        isClosingConfirmModalRef.current = false
                        setIsContinuingEdit(false)
                      }, 500)
                    }}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 smooth-transition"
                  >
                    Continue Editing
                  </button>
                              <button
                                type="button"
                                onClick={(e) => {
                              e.preventDefault()
                      e.stopPropagation()
                      if (pendingExitAction) {
                        pendingExitAction()
                      }
                      setShowExitConfirmModal(false)
                      setPendingExitAction(null)
                    }}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 smooth-transition shadow-sm"
                  >
                    Exit Without Saving
                                </button>
                          </div>
                        </div>
            </div>
          )}

          {/* Edit Task Modal */}
          {editingTaskId && editTaskData && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ pointerEvents: showExitConfirmModal || isClosingConfirmModalRef.current ? 'none' : 'auto' }}
            >
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-sm cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!showExitConfirmModal && !isClosingConfirmModalRef.current && !isContinuingEdit) {
                    handleExitEditForm()
                  }
                }}
                style={{ pointerEvents: showExitConfirmModal || isClosingConfirmModalRef.current || isContinuingEdit ? 'none' : 'auto' }}
              />
              
              {/* Modal Content */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (editingTaskId && editTaskData.title) {
                    const task = tasks.find(t => t.id === editingTaskId)
                    if (task) {
                      updateTask(editingTaskId, {
                        title: editTaskData.title,
                        description: editTaskData.description,
                        priority: editTaskData.priority || task.priority,
                        difficulty: editTaskData.difficulty,
                        dueDate: editTaskData.dueDate,
                        startDate: editTaskData.startDate,
                        category: editTaskData.category,
                      })
                    }
                    setEditingTaskId(null)
                    setEditTaskData(null)
                    setEditingSubtaskIndex(null)
                    setEditSubtaskData(null)
                    setNewSubtask("")
                    setSubtaskDifficulty(undefined)
                    setSubtaskPriority("medium")
                    setShowSubtaskInput(false)
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 panel animate-fade border border-graphite/5 w-full max-w-5xl bg-white shadow-xl overflow-hidden"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Modal Header with Buttons */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-graphite/5">
                  <h2 className="text-lg font-semibold text-ink">Edit Task</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExitEditForm}
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-graphite/10 bg-white text-graphite/70 hover:border-graphite/20 hover:text-ink smooth-transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-medium rounded-lg bg-ink text-white hover:bg-ink/90 smooth-transition shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] divide-x-0 lg:divide-x divide-graphite/10">
                  {/* Main Task Form - Left Side */}
                  <div className="p-6 space-y-5">
                    {/* Task Title */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-graphite/70 font-medium block">Task Title</label>
                      <input
                        type="text"
                        placeholder="Enter task title"
                        value={editTaskData.title || ""}
                        onChange={(e) => setEditTaskData({ ...editTaskData, title: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-graphite/10 bg-white focus:outline-none focus:border-graphite/30 focus:bg-white smooth-transition placeholder:text-graphite/40"
                        required
                        autoFocus
                      />
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-graphite/70 font-medium block">Category</label>
                      <select
                        value={editTaskData.category || ""}
                        onChange={(e) => setEditTaskData({ ...editTaskData, category: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-graphite/10 bg-white focus:outline-none focus:border-graphite/30 focus:bg-white smooth-transition appearance-none cursor-pointer"
                      >
                        <option value="">Select...</option>
                        <option value="chores">Chores</option>
                        <option value="personal-brand">Personal Brand</option>
                        <option value="flight-training">Flight Training</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Task Details */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-graphite/70 font-medium block">Task Details <span className="text-graphite/50 font-normal">(optional)</span></label>
                      <textarea
                        placeholder="Add more details about this task..."
                        value={editTaskData.description || ""}
                        onChange={(e) => setEditTaskData({ ...editTaskData, description: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-graphite/10 bg-white focus:outline-none focus:border-graphite/30 focus:bg-white smooth-transition resize-none placeholder:text-graphite/40"
                        rows={3}
                      />
                    </div>

                    {/* Time Estimate */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-graphite/70 font-medium block">Time Estimate</label>
                      <div className="flex gap-1.5">
                        {([1, 2, 3, 5, 8] as TaskDifficulty[]).map((diff) => {
                          const labels: Record<TaskDifficulty, string> = {
                            1: '<1hr',
                            2: '<4hrs',
                            3: '1d',
                            5: '3d',
                            8: '1w',
                          }
                          return (
                            <button
                              key={diff}
                              type="button"
                              onClick={() => setEditTaskData({ ...editTaskData, difficulty: editTaskData.difficulty === diff ? undefined : diff })}
                              className={`flex-1 px-2 py-2 rounded-lg border smooth-transition text-center ${
                                editTaskData.difficulty === diff
                                  ? 'bg-ink text-white border-ink shadow-sm'
                                  : 'bg-white border-graphite/10 text-graphite/70 hover:border-graphite/20 hover:text-ink'
                              }`}
                            >
                              <div className="font-semibold text-xs leading-tight">{diff}</div>
                              <div className="text-[9px] opacity-80 mt-0.5 leading-tight">{labels[diff]}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Priority - Visual Chips */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-graphite/70 font-medium block">Priority</label>
                      <div className="flex gap-2">
                        {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((priority) => {
                          const priorityConfig = {
                            low: { label: 'Low', color: 'bg-blue-500', dot: 'bg-blue-500' },
                            medium: { label: 'Medium', color: 'bg-amber-500', dot: 'bg-amber-500' },
                            high: { label: 'High', color: 'bg-orange-500', dot: 'bg-orange-500' },
                            urgent: { label: 'Urgent', color: 'bg-red-500', dot: 'bg-red-500' },
                          }
                          const config = priorityConfig[priority]
                          return (
                            <button
                              key={priority}
                              type="button"
                              onClick={() => setEditTaskData({ ...editTaskData, priority })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border smooth-transition text-xs font-medium ${
                                editTaskData.priority === priority
                                  ? 'border-ink bg-ink/5'
                                  : 'border-graphite/10 bg-white hover:border-graphite/20'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                              <span className={editTaskData.priority === priority ? 'text-ink font-semibold' : 'text-graphite/70'}>
                                {config.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-graphite/70 font-medium block">Start Date <span className="text-graphite/50 font-normal">(optional)</span></label>
                        <input
                          type="date"
                          value={editTaskData.startDate ? (typeof editTaskData.startDate === 'string' ? editTaskData.startDate.split('T')[0] : new Date(editTaskData.startDate).toISOString().split('T')[0]) : ""}
                          onChange={(e) => setEditTaskData({ ...editTaskData, startDate: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-graphite/10 bg-white focus:outline-none focus:border-graphite/30 focus:bg-white smooth-transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-graphite/70 font-medium block">Due Date <span className="text-graphite/50 font-normal">(optional)</span></label>
                        <input
                          type="date"
                          value={editTaskData.dueDate ? (typeof editTaskData.dueDate === 'string' ? editTaskData.dueDate.split('T')[0] : new Date(editTaskData.dueDate).toISOString().split('T')[0]) : ""}
                          onChange={(e) => setEditTaskData({ ...editTaskData, dueDate: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-graphite/10 bg-white focus:outline-none focus:border-graphite/30 focus:bg-white smooth-transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subtasks Section - Right Side */}
                  <div className="p-6 space-y-4 bg-gradient-to-br from-graphite/5 to-white border-t lg:border-t-0 lg:border-l border-graphite/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-ink/20 rounded-full"></div>
                        <label className="text-xs text-graphite/70 font-semibold uppercase tracking-wider">Subtasks</label>
                      </div>
                      {!showSubtaskInput && (
                        <button
                          type="button"
                          onClick={() => setShowSubtaskInput(true)}
                          className="text-xs text-graphite/60 hover:text-ink smooth-transition flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add
                        </button>
                      )}
                    </div>
                    {(() => {
                      const task = tasks.find(t => t.id === editingTaskId)
                      const taskSubtasks = task?.subtasks || []
                      return taskSubtasks.length > 0 ? (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                          {taskSubtasks.map((subtask, index) => {
                            const isEditing = editingSubtaskIndex === index && editingTaskId === task?.id
                            return isEditing ? (
                              // Edit Mode
                              <div key={subtask.id} className="space-y-3 p-4 rounded-xl border-2 border-ink/30 bg-white shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-graphite/10">
                                  <div className="w-1.5 h-1.5 rounded-full bg-ink/40"></div>
                                  <span className="text-xs font-semibold text-ink uppercase tracking-wider">Edit Subtask</span>
                                </div>
                                
                                <input
                                  type="text"
                                  placeholder="Subtask title..."
                                  value={editSubtaskData?.title || ""}
                                  onChange={(e) => setEditSubtaskData({ ...editSubtaskData!, title: e.target.value })}
                                  className="w-full px-3 py-2 text-sm rounded-lg border border-ink/20 bg-white focus:outline-none focus:border-ink/40 focus:bg-white smooth-transition placeholder:text-graphite/40"
                                  autoFocus
                                />
                                
                                {/* Edit Time Estimate */}
                                <div className="space-y-1.5">
                                  <label className="text-[10px] text-graphite/60 font-medium uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-ink/30"></span>
                                    Time Estimate
                                  </label>
                                  <div className="flex gap-1">
                                    {([1, 2, 3, 5, 8] as TaskDifficulty[]).map((diff) => {
                                      const labels: Record<TaskDifficulty, string> = {
                                        1: '<1hr',
                                        2: '<4hrs',
                                        3: '1d',
                                        5: '3d',
                                        8: '1w',
                                      }
                                      return (
                                        <button
                                          key={diff}
                                          type="button"
                                          onClick={() => setEditSubtaskData({ ...editSubtaskData!, difficulty: editSubtaskData?.difficulty === diff ? undefined : diff })}
                                          className={`flex-1 px-1.5 py-1 rounded-md border smooth-transition text-center ${
                                            editSubtaskData?.difficulty === diff
                                              ? 'bg-ink text-white border-ink shadow-sm'
                                              : 'bg-white border-graphite/10 text-graphite/70 hover:border-graphite/20 hover:text-ink'
                                          }`}
                                        >
                                          <div className="font-semibold text-[10px] leading-tight">{diff}</div>
                                          <div className="text-[8px] opacity-80 mt-0.5 leading-tight">{labels[diff]}</div>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* Edit Priority */}
                                <div className="space-y-1.5">
                                  <label className="text-[10px] text-graphite/60 font-medium uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-ink/30"></span>
                                    Priority
                                  </label>
                                  <div className="flex gap-1.5">
                                    {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((priority) => {
                                      const priorityConfig = {
                                        low: { label: 'Low', dot: 'bg-blue-500' },
                                        medium: { label: 'Medium', dot: 'bg-amber-500' },
                                        high: { label: 'High', dot: 'bg-orange-500' },
                                        urgent: { label: 'Urgent', dot: 'bg-red-500' },
                                      }
                                      const config = priorityConfig[priority]
                                      return (
                                        <button
                                          key={priority}
                                          type="button"
                                          onClick={() => setEditSubtaskData({ ...editSubtaskData!, priority })}
                                          className={`flex items-center gap-1 px-2 py-1 rounded-md border smooth-transition text-[10px] font-medium ${
                                            editSubtaskData?.priority === priority
                                              ? 'border-ink bg-ink/5'
                                              : 'border-graphite/10 bg-white hover:border-graphite/20'
                                          }`}
                                        >
                                          <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                          <span className={editSubtaskData?.priority === priority ? 'text-ink font-semibold' : 'text-graphite/70'}>
                                            {config.label}
                                          </span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-graphite/10">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSubtaskIndex(null)
                                      setEditSubtaskData(null)
                                    }}
                                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-graphite/10 bg-white text-graphite/70 hover:border-graphite/20 hover:text-ink smooth-transition"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (editSubtaskData?.title.trim() && editingTaskId) {
                                        const task = tasks.find(t => t.id === editingTaskId)
                                        if (task && task.subtasks) {
                                          const updatedSubtasks = task.subtasks.map((st, idx) =>
                                            idx === index
                                              ? {
                                                  ...st,
                                                  title: editSubtaskData.title.trim(),
                                                  difficulty: editSubtaskData.difficulty,
                                                  priority: editSubtaskData.priority,
                                                  updatedAt: new Date().toISOString(),
                                                }
                                              : st
                                          )
                                          updateTask(editingTaskId, { subtasks: updatedSubtasks })
                                        }
                                        setEditingSubtaskIndex(null)
                                        setEditSubtaskData(null)
                                      }
                                    }}
                                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-ink text-white hover:bg-ink/90 smooth-transition shadow-sm"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Display Mode
                              <div
                                key={subtask.id}
                                onClick={() => {
                                  setEditingSubtaskIndex(index)
                                  setEditSubtaskData({
                                    title: subtask.title,
                                    difficulty: subtask.difficulty,
                                    priority: subtask.priority,
                                  })
                                }}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/50 border border-graphite/5 cursor-pointer hover:border-ink/30 hover:shadow-sm smooth-transition group"
                              >
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${subtask.completed ? 'bg-ink border-ink' : 'border-graphite/20'}`}>
                                  {subtask.completed && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-xs block ${subtask.completed ? 'line-through text-graphite/50' : 'text-ink'}`}>{subtask.title}</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {subtask.difficulty && (
                                      <span className="text-[9px] text-graphite/60 px-1.5 py-0.5 rounded bg-graphite/5">
                                        {subtask.difficulty} • {difficultyLabels[subtask.difficulty]}
                                      </span>
                                    )}
                                    {subtask.priority && (
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${priorityStyles[subtask.priority]}`}>
                                        {subtask.priority}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-graphite/50 text-center py-4">No subtasks</p>
                      )
                    })()}

                    {/* Add Subtask Input - Hidden until clicked */}
                    {showSubtaskInput && (
                      <div className="space-y-3 p-4 rounded-xl border-2 border-ink/20 bg-white shadow-sm">
                        {/* Subtask Header */}
                        <div className="flex items-center gap-2 pb-2 border-b border-graphite/10">
                          <div className="w-1.5 h-1.5 rounded-full bg-ink/40"></div>
                          <span className="text-xs font-semibold text-ink uppercase tracking-wider">New Subtask</span>
                        </div>
                        
                        <input
                          type="text"
                          placeholder="Subtask title..."
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newSubtask.trim() && editingTaskId) {
                              e.preventDefault()
                              const task = tasks.find(t => t.id === editingTaskId)
                              if (task) {
                                const now = new Date().toISOString()
                                const newSubtaskObj: Subtask = {
                                  id: `subtask-${Date.now()}-${Math.random()}`,
                                  title: newSubtask.trim(),
                                  completed: false,
                                  difficulty: subtaskDifficulty,
                                  priority: subtaskPriority,
                                  createdAt: now,
                                  updatedAt: now,
                                }
                                const updatedSubtasks = [...(task.subtasks || []), newSubtaskObj]
                                updateTask(editingTaskId, { subtasks: updatedSubtasks })
                                setNewSubtask("")
                                setSubtaskDifficulty(undefined)
                                setSubtaskPriority("medium")
                                setShowSubtaskInput(false)
                              }
                            }
                          }}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-ink/20 bg-white focus:outline-none focus:border-ink/40 focus:bg-white smooth-transition placeholder:text-graphite/40"
                          autoFocus
                        />
                        
                        {/* Subtask Time Estimate */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-graphite/60 font-medium uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-ink/30"></span>
                            Time Estimate
                          </label>
                          <div className="flex gap-1">
                            {([1, 2, 3, 5, 8] as TaskDifficulty[]).map((diff) => {
                              const labels: Record<TaskDifficulty, string> = {
                                1: '<1hr',
                                2: '<4hrs',
                                3: '1d',
                                5: '3d',
                                8: '1w',
                              }
                              return (
                                <button
                                  key={diff}
                                  type="button"
                                  onClick={() => setSubtaskDifficulty(subtaskDifficulty === diff ? undefined : diff)}
                                  className={`flex-1 px-1.5 py-1 rounded-md border smooth-transition text-center ${
                                    subtaskDifficulty === diff
                                      ? 'bg-ink text-white border-ink shadow-sm'
                                      : 'bg-white border-graphite/10 text-graphite/70 hover:border-graphite/20 hover:text-ink'
                                  }`}
                                >
                                  <div className="font-semibold text-[10px] leading-tight">{diff}</div>
                                  <div className="text-[8px] opacity-80 mt-0.5 leading-tight">{labels[diff]}</div>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Subtask Priority */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-graphite/60 font-medium uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-ink/30"></span>
                            Priority
                          </label>
                          <div className="flex gap-1.5">
                            {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((priority) => {
                              const priorityConfig = {
                                low: { label: 'Low', dot: 'bg-blue-500' },
                                medium: { label: 'Medium', dot: 'bg-amber-500' },
                                high: { label: 'High', dot: 'bg-orange-500' },
                                urgent: { label: 'Urgent', dot: 'bg-red-500' },
                              }
                              const config = priorityConfig[priority]
                              return (
                                <button
                                  key={priority}
                                  type="button"
                                  onClick={() => setSubtaskPriority(priority)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-md border smooth-transition text-[10px] font-medium ${
                                    subtaskPriority === priority
                                      ? 'border-ink bg-ink/5'
                                      : 'border-graphite/10 bg-white hover:border-graphite/20'
                                  }`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                  <span className={subtaskPriority === priority ? 'text-ink font-semibold' : 'text-graphite/70'}>
                                    {config.label}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-graphite/10">
                          <button
                            type="button"
                            onClick={() => {
                              setNewSubtask("")
                              setSubtaskDifficulty(undefined)
                              setSubtaskPriority("medium")
                              setShowSubtaskInput(false)
                            }}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-graphite/10 bg-white text-graphite/70 hover:border-graphite/20 hover:text-ink smooth-transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (newSubtask.trim() && editingTaskId) {
                                const task = tasks.find(t => t.id === editingTaskId)
                                if (task) {
                                  const now = new Date().toISOString()
                                  const newSubtaskObj: Subtask = {
                                    id: `subtask-${Date.now()}-${Math.random()}`,
                                    title: newSubtask.trim(),
                                    completed: false,
                                    difficulty: subtaskDifficulty,
                                    priority: subtaskPriority,
                                    createdAt: now,
                                    updatedAt: now,
                                  }
                                  const updatedSubtasks = [...(task.subtasks || []), newSubtaskObj]
                                  updateTask(editingTaskId, { subtasks: updatedSubtasks })
                                  setNewSubtask("")
                                  setSubtaskDifficulty(undefined)
                                  setSubtaskPriority("medium")
                                  setShowSubtaskInput(false)
                                }
                              }
                            }}
                            className="w-10 h-10 rounded-full bg-ink text-white hover:bg-ink/90 smooth-transition flex items-center justify-center flex-shrink-0 shadow-sm"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}

              {view === "board" && (
                <section className="grid gap-5 lg:grid-cols-5">
                    {groupedSubtasks.map((column, idx) => {
                      const columnGradients = [
                        { from: "from-slate-50", to: "to-blue-50/50", accent: "blue" },
                        { from: "from-slate-50", to: "to-purple-50/50", accent: "purple" },
                        { from: "from-slate-50", to: "to-emerald-50/50", accent: "emerald" },
                        { from: "from-slate-50", to: "to-orange-50/50", accent: "orange" },
                        { from: "from-slate-50", to: "to-slate-100/50", accent: "slate" },
                      ]
                      const gradient = columnGradients[idx] || columnGradients[0]
                      
                      return (
                      <SubtaskColumn
                        key={column.status}
                        column={{
                          ...column,
                        ganttSubtasks: groupedGanttSubtasks.find(c => c.status === column.status)?.ganttSubtasks || [],
                        ganttTasks: groupedGanttSubtasks.find(c => c.status === column.status)?.ganttTasks || []
                        }}
                        tasks={tasks}
                        updateTask={updateTask}
                        toggleSubtask={toggleSubtask}
                        deleteSubtask={deleteSubtask}
                        gradient={gradient}
                        onStartFocus={(taskId) => {
                          setFocusTaskId(taskId)
                          setSecondsLeft(POMODORO_WORK_DURATION)
                          setIsRunning(false)
                          setIsRestPeriod(false)
                          setSessionStartTime(null)
                          setView("focus")
                        }}
                        addTask={addTask}
                        subtaskColumnAssignments={subtaskColumnAssignments}
                        setSubtaskColumnAssignments={setSubtaskColumnAssignments}
                        ganttSubtasks={groupedGanttSubtasks.find(c => c.status === column.status)?.ganttSubtasks}
                        updateGanttSubtask={updateGanttSubtask}
                        deleteGanttSubtask={deleteGanttSubtask}
                      ganttTasks={groupedGanttSubtasks.find(c => c.status === column.status)?.ganttTasks}
                      updateGanttTask={updateGanttTask}
                      deleteGanttTask={deleteGanttTask}
                      />
                      )
                    })}
                  </section>
              )}

              {view === "weeklyplan" && (
                <section className="space-y-4 flex flex-col flex-1 min-h-0">
            <div className="flex justify-between items-center flex-shrink-0">
              <div>
                <p className="text-xs tracking-[0.2em] text-slate-500 uppercase font-semibold">Weekly Timeline</p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {formatDate(currentWeekStart)} - {formatDate(getWeekEnd(currentWeekStart))}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Clear all scheduled tasks and subtasks from weekly calendar
                    if (confirm('Are you sure you want to remove all tasks and subtasks from the weekly calendar?')) {
                      projects.forEach((project) => {
                        project.children?.forEach((task) => {
                          // Tasks without subtasks
                          if (!task.children || task.children.length === 0) {
                            if (task.startDate && task.startDate.includes('T')) {
                              // Clear time-based scheduling
                              updateGanttTask?.(project.id, task.id, {
                                startDate: '',
                                dueDate: '',
                              } as any)
                            }
                          } else {
                            // Subtasks
                            task.children.forEach((subtask) => {
                              if (subtask.startDate && subtask.startDate.includes('T')) {
                                // Clear time-based scheduling
                                updateGanttSubtask?.(project.id, task.id, subtask.id, {
                                  startDate: '',
                                  dueDate: '',
                                } as any)
                              }
                            })
                          }
                        })
                      })
                    }
                  }}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl smooth-transition hover:bg-red-600 shadow-sm font-semibold"
                  title="Clear all scheduled items from weekly calendar"
                >
                  Clear All
                </button>
                <button
                  onClick={() =>
                    setCurrentWeekStart((prev) => getWeekStart(new Date(prev.getTime() - 7 * 86400000)))
                  }
                  className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl smooth-transition text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentWeekStart(getWeekStart(new Date()))}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-xl smooth-transition hover:shadow-md shadow-sm font-semibold"
                >
                  Today
                </button>
                <button
                  onClick={() =>
                    setCurrentWeekStart((prev) => getWeekStart(new Date(prev.getTime() + 7 * 86400000)))
                  }
                  className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl smooth-transition text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Undated Tasks Section */}
            {(() => {
              const undatedTasks = tasks.filter(
                (task) => !task.startDate && !task.dueDate && task.status !== "completed" && task.status !== "cancelled"
              )
              
              if (undatedTasks.length === 0) return null
              
              return (
                <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm mb-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Undated Tasks</p>
                  <div className="flex flex-wrap gap-2">
                    {undatedTasks.map((task) => {
                      const getCategoryBgColor = () => {
                        if (!task.category) return 'bg-white'
                        switch (task.category) {
                          case 'chores':
                            return 'bg-blue-100'
                          case 'personal-brand':
                            return 'bg-purple-100'
                          case 'flight-training':
                            return 'bg-amber-100'
                          case 'other':
                            return 'bg-slate-100'
                          default:
                            return 'bg-white'
                        }
                      }
                      
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedTaskId(task.id)
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', task.id)
                          }}
                          onDragEnd={() => {
                            setDraggedTaskId(null)
                          }}
                          className={`${getCategoryBgColor()} rounded-lg border border-slate-200 px-3 py-2 cursor-move hover:shadow-md smooth-transition flex items-center gap-2`}
                        >
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          <span className="text-xs font-medium text-slate-900">{task.title}</span>
                          {task.difficulty && (
                            <span className="text-[9px] text-slate-600">{difficultyLabels[task.difficulty]}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* Weekly Schedule View */}
            <div className="flex gap-4 flex-1 min-h-0 relative">
              {/* Sprint Tasks Sidebar */}
            <div 
                className="w-64 bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm flex-shrink-0 flex flex-col h-full relative z-30"
              onDragOver={(e) => {
                  // Check if this is a scheduled task
                  if (e.dataTransfer.types.includes('application/scheduled-task')) {
                e.preventDefault()
                    e.stopPropagation()
                e.dataTransfer.dropEffect = 'move'
                  }
              }}
              onDrop={(e) => {
                  // Handle drops on the sidebar container itself (not just the inner div)
                  if (e.dataTransfer.types.includes('application/scheduled-task')) {
                e.preventDefault()
                    e.stopPropagation()
                    const data = e.dataTransfer.getData('text/plain')
                    if (data && data.startsWith('gantt-task:')) {
                      const [, projectId, taskId] = data.split(':')
                      if (updateGanttTask) {
                        updateGanttTask(projectId, taskId, {
                          startDate: '',
                          dueDate: '',
                        } as any)
                      }
                    } else if (data && data.startsWith('gantt-subtask:')) {
                      const [, projectId, taskId, subtaskId] = data.split(':')
                      if (updateGanttSubtask) {
                        updateGanttSubtask(projectId, taskId, subtaskId, {
                          startDate: '',
                          dueDate: '',
                        } as any)
                      }
                    }
                  }
                }}
              >
                <div className="mb-2 flex-shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                      Sprint Tasks
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {(sprintTasksForSchedule.length + sprintSubtasksForSchedule.length) || 0} items
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Drag to schedule on the week
                    </p>
                    {(() => {
                      // Calculate total hours for sprint tasks
                      let totalHours = 0
                      
                      // Add hours from sprint tasks (use totalPoints for tasks without subtasks, matches projects table)
                      sprintTasksForSchedule.forEach(({ ganttTask }) => {
                        totalHours += storyPointsToHours((ganttTask as any).totalPoints)
                      })
                      
                      // Add hours from sprint subtasks
                      sprintSubtasksForSchedule.forEach(({ ganttSubtask }) => {
                        totalHours += storyPointsToHours(ganttSubtask.storyPoints)
                      })
                      
                      // Format total hours
                      const formatHours = (hours: number): string => {
                        if (hours === 0.5) return '30 min'
                        if (hours === 1) return '1 hr'
                        if (hours < 1) return `${Math.round(hours * 60)} min`
                        if (hours % 1 === 0) return `${hours} hrs`
                        const wholeHours = Math.floor(hours)
                        const minutes = Math.round((hours - wholeHours) * 60)
                        return minutes > 0 ? `${wholeHours} hrs ${minutes} min` : `${wholeHours} hrs`
                      }
                      
                      return (
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold border border-blue-200">
                          {formatHours(totalHours)}
                        </span>
                      )
                    })()}
                  </div>
                </div>
                <div 
                  className="mt-3 space-y-2 flex-1 overflow-y-auto pr-1 rounded-lg transition-colors"
                      onDragOver={(e) => {
                        e.preventDefault()
                    e.stopPropagation()
                    // Check if this is a scheduled task being dragged
                    const isScheduledTask = e.dataTransfer.types.includes('application/scheduled-task')
                    if (isScheduledTask) {
                        e.dataTransfer.dropEffect = 'move'
                      e.currentTarget.classList.add('bg-blue-50', 'ring-2', 'ring-blue-300')
                    } else {
                      // Check if the drag contains gantt task/subtask data
                      const types = Array.from(e.dataTransfer.types)
                      if (types.includes('text/plain')) {
                        e.dataTransfer.dropEffect = 'move'
                        e.currentTarget.classList.add('bg-blue-50', 'ring-2', 'ring-blue-300')
                      } else {
                        e.dataTransfer.dropEffect = 'none'
                      }
                    }
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('bg-blue-50', 'ring-2', 'ring-blue-300')
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.classList.remove('bg-blue-50', 'ring-2', 'ring-blue-300')
                    
                    const data = e.dataTransfer.getData('text/plain')
                    // Check if this is a scheduled task or any gantt task/subtask
                    const isScheduledTask = e.dataTransfer.types.includes('application/scheduled-task')
                    if (data && (data.startsWith('gantt-task:') || data.startsWith('gantt-subtask:')) && isScheduledTask) {
                      // This is a scheduled task being dragged back - unschedule it
                      if (data.startsWith('gantt-task:')) {
                        const [, projectId, taskId] = data.split(':')
                        if (updateGanttTask) {
                          updateGanttTask(projectId, taskId, {
                            startDate: '',
                            dueDate: '',
                          } as any)
                        }
                      } else if (data.startsWith('gantt-subtask:')) {
                        const [, projectId, taskId, subtaskId] = data.split(':')
                        if (updateGanttSubtask) {
                          updateGanttSubtask(projectId, taskId, subtaskId, {
                            startDate: '',
                            dueDate: '',
                          } as any)
                        }
                      }
                    }
                  }}
                >
                  {sprintTasksForSchedule.length === 0 && sprintSubtasksForSchedule.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No items in Sprint. Add sprint tasks in the Weekly Plan board.</p>
                  ) : (
                    <>
                      {sprintTasksForSchedule.map(({ ganttTask, parentProject }) => (
                        <GanttTaskCard
                          key={`sprint-task-${ganttTask.id}`}
                          task={ganttTask}
                          parentProject={parentProject}
                          onUpdate={(updates) => {
                            // If hours (totalPoints) changed and task is scheduled, recalculate endDate
                            const updatedTotalPoints = (updates as any).totalPoints
                            if (updatedTotalPoints !== undefined && ganttTask.startDate && ganttTask.startDate.includes('T')) {
                              const startDate = new Date(ganttTask.startDate)
                              const newHours = storyPointsToHours(updatedTotalPoints)
                              const newEndDate = new Date(startDate.getTime() + newHours * 60 * 60 * 1000)
                              updateGanttTask?.(parentProject.id, ganttTask.id, {
                                ...updates,
                                endDate: newEndDate.toISOString(),
                              } as any)
                            } else {
                              updateGanttTask?.(parentProject.id, ganttTask.id, updates)
                            }
                            
                            // Force a re-render to ensure UI updates
                            setTimeout(() => {
                              setUpdateTrigger(prev => prev + 1)
                            }, 100)
                          }}
                          onDelete={() => {
                            setDeleteConfirmModal({
                              item: {
                                id: ganttTask.id,
                                name: ganttTask.name,
                                type: 'task',
                                projectId: parentProject.id,
                                taskId: ganttTask.id,
                                isRoutine: false,
                                projectName: parentProject.name,
                              }
                            })
                          }}
                          columnStatus="sprint"
                          onDragStartCallback={(data) => {
                            setDraggedItemData(data)
                            draggedItemDataRef.current = data
                          }}
                        />
                      ))}
                      {sprintSubtasksForSchedule.map(({ ganttSubtask, parentTask, parentProject }) => (
                        <GanttSubtaskCard
                          key={`sprint-subtask-${ganttSubtask.id}`}
                          subtask={ganttSubtask}
                          parentTask={parentTask}
                          parentProject={parentProject}
                          onUpdate={(updates) => {
                            // If hours (storyPoints) changed and subtask is scheduled, recalculate endDate
                            const updatedStoryPoints = updates.storyPoints
                            if (updatedStoryPoints !== undefined && ganttSubtask.startDate && ganttSubtask.startDate.includes('T')) {
                              const startDate = new Date(ganttSubtask.startDate)
                              const newHours = storyPointsToHours(updatedStoryPoints)
                              const newEndDate = new Date(startDate.getTime() + newHours * 60 * 60 * 1000)
                              updateGanttSubtask?.(parentProject.id, parentTask.id, ganttSubtask.id, {
                                ...updates,
                                endDate: newEndDate.toISOString(),
                              } as any)
                            } else {
                              updateGanttSubtask?.(parentProject.id, parentTask.id, ganttSubtask.id, updates)
                            }
                            
                            // Force a re-render to ensure UI updates
                            setTimeout(() => {
                              setUpdateTrigger(prev => prev + 1)
                            }, 100)
                          }}
                          onDelete={() => {
                            setDeleteConfirmModal({
                              item: {
                                id: ganttSubtask.id,
                                name: ganttSubtask.name,
                                type: 'subtask',
                                projectId: parentProject.id,
                                taskId: parentTask.id,
                                subtaskId: ganttSubtask.id,
                                isRoutine: false,
                                projectName: parentProject.name,
                                taskName: parentTask.name,
                              }
                            })
                          }}
                          columnStatus="sprint"
                          onDragStartCallback={(data) => {
                            setDraggedItemData(data)
                            draggedItemDataRef.current = data
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Routine Tasks Sidebar */}
              <div 
                className="w-64 bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm flex-shrink-0 flex flex-col h-full relative z-30"
              >
                <div className="mb-2 flex-shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                      Routine Tasks
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {(routineTasksForSchedule.length + routineSubtasksForSchedule.length) || 0} items
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Drag to schedule (reusable)
                    </p>
                    {(() => {
                      // Calculate total hours for routine tasks
                      let totalHours = 0
                      
                      // Add hours from routine tasks
                      routineTasksForSchedule.forEach(({ ganttTask }) => {
                        totalHours += storyPointsToHours((ganttTask as any).totalPoints)
                      })
                      
                      // Add hours from routine subtasks
                      routineSubtasksForSchedule.forEach(({ ganttSubtask }) => {
                        totalHours += storyPointsToHours(ganttSubtask.storyPoints)
                      })
                      
                      // Format total hours
                      const formatHours = (hours: number): string => {
                        if (hours === 0.5) return '30 min'
                        if (hours === 1) return '1 hr'
                        if (hours < 1) return `${Math.round(hours * 60)} min`
                        if (hours % 1 === 0) return `${hours} hrs`
                        const wholeHours = Math.floor(hours)
                        const minutes = Math.round((hours - wholeHours) * 60)
                        return minutes > 0 ? `${wholeHours} hrs ${minutes} min` : `${wholeHours} hrs`
                      }
                      
                      return (
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700 font-semibold border border-purple-200">
                          {formatHours(totalHours)}
                        </span>
                      )
                    })()}
                  </div>
                </div>
                <div 
                  className="mt-3 space-y-2 flex-1 overflow-y-auto pr-1 rounded-lg"
                >
                  {/* Create Routine Task Button */}
                  <button
                    onClick={() => setIsCreatingRoutineTask(true)}
                    className="w-full px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Routine Task
                  </button>

                  {/* Create Routine Task Form */}
                  {isCreatingRoutineTask && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                      <input
                        type="text"
                        placeholder="Task name"
                        value={newRoutineTaskName}
                        onChange={(e) => setNewRoutineTaskName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newRoutineTaskName.trim()) {
                            handleCreateRoutineTask()
                          } else if (e.key === 'Escape') {
                            setIsCreatingRoutineTask(false)
                            setNewRoutineTaskName('')
                          }
                        }}
                        className="w-full px-2 py-1.5 text-xs border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-purple-700 font-medium">Hours:</label>
                        <select
                          value={newRoutineTaskHours}
                          onChange={(e) => setNewRoutineTaskHours(parseFloat(e.target.value))}
                          className="flex-1 px-2 py-1.5 text-xs border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          <option value={0.5}>30 min</option>
                          {Array.from({ length: 30 }, (_, i) => i + 1).map((hour) => (
                            <option key={hour} value={hour}>
                              {hour === 1 ? '1 hr' : `${hour} hrs`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateRoutineTask}
                          disabled={!newRoutineTaskName.trim()}
                          className="flex-1 px-2 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setIsCreatingRoutineTask(false)
                            setNewRoutineTaskName('')
                            setNewRoutineTaskHours(1)
                          }}
                          className="px-2 py-1.5 text-xs font-semibold text-purple-700 bg-white border border-purple-300 rounded hover:bg-purple-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {routineTasksForSchedule.length === 0 && routineSubtasksForSchedule.length === 0 && !isCreatingRoutineTask ? (
                    <p className="text-xs text-slate-400 text-center py-4">No routine tasks. Click "Create Routine Task" to add one.</p>
                  ) : (
                    <>
                      {routineTasksForSchedule.map(({ ganttTask, parentProject }) => (
                        <GanttTaskCard
                          key={`routine-task-${ganttTask.id}`}
                          task={ganttTask}
                          parentProject={parentProject}
                          onUpdate={(updates) => {
                            // Update the task itself
                            updateGanttTask?.(parentProject.id, ganttTask.id, updates)
                            
                            // Also update all routine instances with the same originalId
                            const updatedName = updates.name || ganttTask.name
                            // totalPoints is already in hours (1:1 mapping), so use it directly
                            const updatedHours = (updates as any).totalPoints !== undefined 
                              ? storyPointsToHours((updates as any).totalPoints) 
                              : undefined
                            
                            setRoutineInstances(prev => prev.map(inst => {
                              // Match by originalId and type to find all instances of the same routine task
                              if (inst.originalId === ganttTask.id && inst.type === 'task') {
                                const finalHours = updatedHours !== undefined ? updatedHours : storyPointsToHours(inst.totalPoints)
                                return {
                                  ...inst,
                                  name: updatedName,
                                  totalPoints: updatedHours !== undefined ? updatedHours : inst.totalPoints,
                                  // Recalculate dueDate if hours changed
                                  dueDate: inst.startDate
                                    ? new Date(new Date(inst.startDate).getTime() + finalHours * 60 * 60 * 1000).toISOString()
                                    : inst.dueDate,
                                }
                              }
                              return inst
                            }))
                            
                            // Force a re-render to ensure UI updates
                            setTimeout(() => {
                              setUpdateTrigger(prev => prev + 1)
                            }, 100)
                          }}
                          onDelete={() => {
                            setDeleteConfirmModal({
                              item: {
                                id: ganttTask.id,
                                name: ganttTask.name,
                                type: 'task',
                                projectId: parentProject.id,
                                taskId: ganttTask.id,
                                isRoutine: true,
                                projectName: parentProject.name,
                              }
                            })
                          }}
                          columnStatus="routine"
                          onDragStartCallback={(data) => {
                            setDraggedItemData(data)
                            draggedItemDataRef.current = data
                          }}
                        />
                      ))}
                      {routineSubtasksForSchedule.map(({ ganttSubtask, parentTask, parentProject }) => (
                        <GanttSubtaskCard
                          key={`routine-subtask-${ganttSubtask.id}`}
                          subtask={ganttSubtask}
                          parentTask={parentTask}
                          parentProject={parentProject}
                          onUpdate={(updates) => {
                            // Update the subtask itself
                            updateGanttSubtask?.(parentProject.id, parentTask.id, ganttSubtask.id, updates)
                            
                            // Also update all routine instances with the same originalId
                            const updatedName = updates.name || ganttSubtask.name
                            // storyPoints is already in hours (1:1 mapping), so use it directly
                            const updatedHours = updates.storyPoints !== undefined 
                              ? storyPointsToHours(updates.storyPoints) 
                              : undefined
                            
                            setRoutineInstances(prev => prev.map(inst => {
                              // Match by originalId and type to find all instances of the same routine subtask
                              if (inst.originalId === ganttSubtask.id && inst.type === 'subtask') {
                                const finalHours = updatedHours !== undefined ? updatedHours : storyPointsToHours(inst.storyPoints)
                                return {
                                  ...inst,
                                  name: updatedName,
                                  storyPoints: updatedHours !== undefined ? updatedHours : inst.storyPoints,
                                  // Recalculate dueDate if hours changed
                                  dueDate: inst.startDate
                                    ? new Date(new Date(inst.startDate).getTime() + finalHours * 60 * 60 * 1000).toISOString()
                                    : inst.dueDate,
                                }
                              }
                              return inst
                            }))
                            
                            // Force a re-render to ensure UI updates
                            setTimeout(() => {
                              setUpdateTrigger(prev => prev + 1)
                            }, 100)
                          }}
                          onDelete={() => {
                            setDeleteConfirmModal({
                              item: {
                                id: ganttSubtask.id,
                                name: ganttSubtask.name,
                                type: 'subtask',
                                projectId: parentProject.id,
                                taskId: parentTask.id,
                                subtaskId: ganttSubtask.id,
                                isRoutine: true,
                                projectName: parentProject.name,
                                taskName: parentTask.name,
                              }
                            })
                          }}
                          columnStatus="routine"
                          onDragStartCallback={(data) => {
                            setDraggedItemData(data)
                            draggedItemDataRef.current = data
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Schedule Grid Container */}
              <div className="flex-1 bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm overflow-x-auto flex flex-col h-full">
              {/* Days Header */}
              <div className="grid gap-0 mb-2 min-w-[800px] flex-shrink-0" style={{ gridTemplateColumns: 'auto repeat(7, 1fr)' }}>
                <div className="sticky left-0 z-20 bg-white w-auto"></div>
                {weekDays.map((day, idx) => {
                  const isToday = isSameDay(day, new Date())
                  return (
                    <div
                      key={idx}
                      className={`text-center pb-3 border-b-2 ${
                        isToday ? 'border-black' : 'border-transparent'
                      }`}
                    >
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                        {day.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                        isToday 
                          ? 'bg-black text-white shadow-md' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        <p className={`text-sm font-bold ${isToday ? "text-white" : "text-slate-700"}`}>
                        {day.getDate()}
                      </p>
                      </div>
                      {(() => {
                        const dayCopy = new Date(day)
                        dayCopy.setHours(0, 0, 0, 0)
                        const dayKey = `${dayCopy.getFullYear()}-${String(dayCopy.getMonth() + 1).padStart(2, '0')}-${String(dayCopy.getDate()).padStart(2, '0')}`
                        const totalHours = hoursPerDay.get(dayKey) || 0
                        const hoursDisplay = totalHours > 0 ? `${totalHours.toFixed(1)}h` : '0h'
                        return (
                          <p className={`text-[10px] mt-1.5 font-medium ${
                            isToday ? 'text-white' : 'text-slate-500'
                          }`}>
                            {hoursDisplay}
                          </p>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
              
              {/* Schedule Grid */}
              <div className="grid gap-0 min-w-[800px] flex-1 overflow-y-auto" style={{ gridTemplateColumns: 'auto repeat(7, 1fr)' }}>
                {/* Time Column */}
                <div className="sticky left-0 z-10 bg-white border-r border-slate-200 w-auto">
                  {Array.from({ length: 20 }, (_, i) => {
                    const hour = 5 + i
                    let hourLabel: string
                    if (hour < 12) {
                      hourLabel = `${hour} AM`
                    } else if (hour === 12) {
                      hourLabel = '12 PM'
                    } else if (hour < 24) {
                      hourLabel = `${hour - 12} PM`
                    } else {
                      hourLabel = '12 AM'
                    }
                        return (
                          <div
                        key={hour}
                        className="h-16 border-b border-slate-100 flex items-start justify-end pr-2 pt-1"
                      >
                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{hourLabel}</span>
                      </div>
                    )
                    })}
                  </div>
                  
                {/* Day Columns */}
                {weekDays.map((day, dayIdx) => {
                  const isToday = isSameDay(day, new Date())
                  return (
                    <div
                      key={dayIdx}
                      className={`border-r border-slate-200 last:border-r-0 overflow-visible ${
                        isToday ? 'bg-blue-50/30' : ''
                      }`}
                      onDragOver={(e) => {
                        // Allow both new tasks and scheduled tasks to be dropped here
                        const isScheduledTask = e.dataTransfer.types.includes('application/scheduled-task')
                        const hasGanttData = e.dataTransfer.types.includes('text/plain')
                        
                        if (isScheduledTask || hasGanttData) {
                        e.preventDefault()
                        e.stopPropagation()
                        e.dataTransfer.dropEffect = 'move'
                          
                          // Calculate which 30-minute slot the drag is over
                          const rect = e.currentTarget.getBoundingClientRect()
                          const y = e.clientY - rect.top
                          const hourHeight = rect.height / 20 // Each hour is 64px
                          const totalMinutes = (y / hourHeight) * 60 // Convert pixel position to minutes from start of day
                          const totalMinutesRounded = Math.round(totalMinutes / 30) * 30 // Snap to nearest 30-minute interval
                          
                          const hourIndex = Math.floor(totalMinutesRounded / 60)
                          const displayHour = 5 + Math.max(0, Math.min(19, hourIndex)) // Clamp between 5 AM (index 0) and 12 AM (index 19)
                          const hour = displayHour === 24 ? 0 : displayHour
                          const minutes = totalMinutesRounded % 60 // Will be 0 or 30
                          
                          // Only highlight if hour is valid (5 AM - 12 AM)
                          if ((hour >= 5 && hour < 24) || hour === 0) {
                            setDragOverDay(day)
                            setDragOverHour(displayHour)
                            
                            // Use the ref to get dragged item data (getData doesn't work in onDragOver)
                            const currentData = draggedItemDataRef.current
                            if (currentData) {
                              setDraggedItemData(currentData)
                              
                              // Always show which 30-minute slot is being hovered (upper or lower half of hour)
                              const positionInHour = (y % hourHeight) / hourHeight // 0 to 1
                              const isUpperHalf = positionInHour <= 0.5
                              setDragOverHalf(isUpperHalf ? 'upper' : 'lower')
                            } else {
                              setDragOverHalf(null)
                            }
                          } else {
                            setDragOverDay(null)
                            setDragOverHour(null)
                            setDragOverHalf(null)
                          }
                        }
                      }}
                      onDragLeave={(e) => {
                        // Only clear if we're actually leaving the day column
                        const relatedTarget = e.relatedTarget as HTMLElement
                        if (!e.currentTarget.contains(relatedTarget)) {
                          setDragOverDay(null)
                          setDragOverHour(null)
                          setDragOverHalf(null)
                        }
                      }}
                      onDrop={(e) => {
                        // Clear drag over state
                        setDragOverDay(null)
                        setDragOverHour(null)
                        setDragOverHalf(null)
                        setDraggedItemData(null)
                        draggedItemDataRef.current = null
                        
                        // Helper function to calculate hour and minutes based on click position - always snaps to 30-minute intervals
                        const calculateTimeFromPosition = (y: number, rect: DOMRect): { hour: number; minutes: number } => {
                          const hourHeight = rect.height / 20 // Each hour is 64px (h-16)
                          const totalMinutes = (y / hourHeight) * 60 // Convert pixel position to minutes from start of day
                          const totalMinutesRounded = Math.round(totalMinutes / 30) * 30 // Snap to nearest 30-minute interval
                          
                          const hourIndex = Math.floor(totalMinutesRounded / 60)
                          const displayHour = 5 + Math.max(0, Math.min(19, hourIndex)) // Clamp between 5 AM (index 0) and 12 AM (index 19)
                          const hour = displayHour === 24 ? 0 : displayHour
                          const minutes = totalMinutesRounded % 60 // Will be 0 or 30
                          
                          return { hour, minutes }
                        }
                        
                        // Allow rescheduling of scheduled tasks by dropping them on a new time slot
                        const data = e.dataTransfer.getData('text/plain')
                        
                        // Check if this is a scheduled task being moved to a new time slot
                        const isScheduledTask = e.dataTransfer.types.includes('application/scheduled-task')
                        
                        // Check if this is a routine instance being moved
                        if (isScheduledTask && data.startsWith('routine-instance:')) {
                          // This is a routine instance being moved - update its position
                        e.preventDefault()
                        e.stopPropagation()
                          
                          const [, instanceId] = data.split(':')
                          const instance = routineInstances.find(inst => inst.id === instanceId)
                          if (!instance) {
                            console.warn('Could not find routine instance with id:', instanceId)
                            return
                          }
                          
                          // Calculate duration from the instance's totalPoints or storyPoints
                          const durationHours = instance.type === 'task' 
                            ? storyPointsToHours(instance.totalPoints)
                            : storyPointsToHours(instance.storyPoints)
                        
                          const rect = e.currentTarget.getBoundingClientRect()
                          const y = e.clientY - rect.top
                          const { hour, minutes } = calculateTimeFromPosition(y, rect)
                          
                          // Validate hour is within allowed range (5 AM to 12 AM)
                          if ((hour < 5 && hour !== 0) || (hour > 23 && hour !== 0)) {
                            return // Invalid hour, don't reschedule
                          }
                          
                          const newStart = new Date(day)
                          newStart.setHours(hour, minutes, 0, 0)
                          const newEnd = new Date(newStart.getTime() + durationHours * 60 * 60 * 1000)
                          
                          // Check for overlaps (excluding the current instance being moved)
                          const dayStart = new Date(day)
                          dayStart.setHours(0, 0, 0, 0)
                          const existingItemsOnDay = scheduledItems.filter(item => {
                            const itemDate = new Date(item.startDate)
                            itemDate.setHours(0, 0, 0, 0)
                            return itemDate.getTime() === dayStart.getTime() && item.id !== instanceId
                          })
                          
                          const hasOverlap = existingItemsOnDay.some(existingItem => {
                            return newStart.getTime() < existingItem.endDate.getTime() && 
                                   newEnd.getTime() > existingItem.startDate.getTime()
                          })
                          
                          if (hasOverlap) {
                            alert('Cannot schedule: This time slot overlaps with an existing task.')
                            setDraggedTaskId(null)
                            return
                          }
                          
                          // Update the existing routine instance's position
                          setRoutineInstances(prev => prev.map(inst => {
                            if (inst.id === instanceId) {
                              return {
                                ...inst,
                                startDate: newStart.toISOString(),
                                dueDate: newEnd.toISOString(),
                              }
                            }
                            return inst
                          }))
                          
                          setDraggedTaskId(null)
                          return
                        }
                        
                        if (isScheduledTask && (data.startsWith('gantt-task:') || data.startsWith('gantt-subtask:'))) {
                          // This is a scheduled task being moved - reschedule it
                        e.preventDefault()
                        e.stopPropagation()
                        
                          const rect = e.currentTarget.getBoundingClientRect()
                          const y = e.clientY - rect.top
                          
                          if (data.startsWith('gantt-task:')) {
                            const [, projectId, taskId] = data.split(':')
                            const task = projects.find(p => p.id === projectId)?.children?.find(t => t.id === taskId)
                            if (task && updateGanttTask) {
                              const durationHours = storyPointsToHours((task as any).totalPoints)
                              const { hour, minutes } = calculateTimeFromPosition(y, rect)
                              
                              // Validate hour is within allowed range (5 AM to 12 AM)
                              if ((hour < 5 && hour !== 0) || (hour > 23 && hour !== 0)) {
                                return // Invalid hour, don't reschedule
                              }
                              
                              const newStart = new Date(day)
                              newStart.setHours(hour, minutes, 0, 0)
                              const newEnd = new Date(newStart.getTime() + durationHours * 60 * 60 * 1000)
                              
                              // Check for overlaps (excluding the current task being moved)
                              const dayStart = new Date(day)
                              dayStart.setHours(0, 0, 0, 0)
                              const existingItemsOnDay = scheduledItems.filter(item => {
                                const itemDate = new Date(item.startDate)
                                itemDate.setHours(0, 0, 0, 0)
                                return itemDate.getTime() === dayStart.getTime() && item.id !== task.id
                              })
                              
                              const hasOverlap = existingItemsOnDay.some(existingItem => {
                                return newStart.getTime() < existingItem.endDate.getTime() && 
                                       newEnd.getTime() > existingItem.startDate.getTime()
                              })
                              
                              if (hasOverlap) {
                                alert('Cannot schedule: This time slot overlaps with an existing task.')
                                setDraggedTaskId(null)
                                return
                              }
                              
                              updateGanttTask(projectId, taskId, {
                                startDate: newStart.toISOString(),
                                endDate: newEnd.toISOString(),
                              } as any)
                            }
                          } else if (data.startsWith('gantt-subtask:')) {
                            const [, projectId, taskId, subtaskId] = data.split(':')
                            const subtask = projects.find(p => p.id === projectId)?.children?.find(t => t.id === taskId)?.children?.find(st => st.id === subtaskId)
                            if (subtask && updateGanttSubtask) {
                              const durationHours = storyPointsToHours(subtask.storyPoints)
                              const { hour, minutes } = calculateTimeFromPosition(y, rect)
                              
                              // Validate hour is within allowed range (5 AM to 12 AM)
                              if ((hour < 5 && hour !== 0) || (hour > 23 && hour !== 0)) {
                                return // Invalid hour, don't reschedule
                              }
                              
                              const newStart = new Date(day)
                              newStart.setHours(hour, minutes, 0, 0)
                              const newEnd = new Date(newStart.getTime() + durationHours * 60 * 60 * 1000)
                              
                              // Check for overlaps (excluding the current subtask being moved)
                              const dayStart = new Date(day)
                              dayStart.setHours(0, 0, 0, 0)
                              const existingItemsOnDay = scheduledItems.filter(item => {
                                const itemDate = new Date(item.startDate)
                                itemDate.setHours(0, 0, 0, 0)
                                return itemDate.getTime() === dayStart.getTime() && item.id !== subtask.id
                              })
                              
                              const hasOverlap = existingItemsOnDay.some(existingItem => {
                                return newStart.getTime() < existingItem.endDate.getTime() && 
                                       newEnd.getTime() > existingItem.startDate.getTime()
                              })
                              
                              if (hasOverlap) {
                                alert('Cannot schedule: This time slot overlaps with an existing task.')
                                setDraggedTaskId(null)
                                return
                              }
                              
                              updateGanttSubtask(projectId, taskId, subtaskId, {
                                startDate: newStart.toISOString(),
                                endDate: newEnd.toISOString(),
                              } as any)
                            }
                          }
                          setDraggedTaskId(null)
                          return
                        }
                        
                        e.preventDefault()
                        e.stopPropagation()
                        
                        // Helper function to check if two time ranges overlap
                        const doTimeRangesOverlap = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
                          return start1 < end2 && end1 > start2
                        }
                        
                        // Get all scheduled items for this day
                        const dayStart = new Date(day)
                        dayStart.setHours(0, 0, 0, 0)
                        const dayEnd = new Date(day)
                        dayEnd.setHours(23, 59, 59, 999)
                        
                        const existingItemsOnDay = scheduledItems.filter(item => {
                          const itemDate = new Date(item.startDate)
                          itemDate.setHours(0, 0, 0, 0)
                          return itemDate.getTime() === dayStart.getTime()
                        })
                        
                        if (data && data.startsWith('gantt-task:')) {
                          const [, projectId, taskId] = data.split(':')
                          const task = projects.find(p => p.id === projectId)?.children?.find(t => t.id === taskId)
                          const project = projects.find(p => p.id === projectId)
                          if (task && project) {
                            // Calculate duration from totalPoints (for tasks without subtasks, matches projects table)
                            const durationHours = storyPointsToHours((task as any).totalPoints)
                            
                            const rect = e.currentTarget.getBoundingClientRect()
                            const y = e.clientY - rect.top
                            const { hour, minutes } = calculateTimeFromPosition(y, rect)
                            
                            // Ensure hour is within 5 AM to 12 AM range
                            if ((hour < 5 && hour !== 0) || (hour > 23 && hour !== 0)) return
                            
                            const newStart = new Date(day)
                            newStart.setHours(hour, minutes, 0, 0)
                            const newEnd = new Date(newStart.getTime() + durationHours * 60 * 60 * 1000)
                            
                            // Check for overlaps with existing scheduled items
                            const hasOverlap = existingItemsOnDay.some(existingItem => {
                              return doTimeRangesOverlap(
                                newStart,
                                newEnd,
                                existingItem.startDate,
                                existingItem.endDate
                              )
                            })
                            
                            if (hasOverlap) {
                              // Prevent drop if there's an overlap
                              alert('Cannot schedule: This time slot overlaps with an existing task.')
                              setDraggedTaskId(null)
                              return
                            }

                            // Check if this is a routine task
                            const isRoutineTask = String(task.status) === 'routine'
                            if (isRoutineTask) {
                              // Create a routine instance instead of updating the original
                              const instanceId = `routine-instance-${taskId}-${Date.now()}-${Math.random()}`
                              setRoutineInstances(prev => [...prev, {
                                id: instanceId,
                                originalId: taskId,
                                projectId: projectId,
                                taskId: taskId,
                                name: task.name,
                                startDate: newStart.toISOString(),
                                dueDate: newEnd.toISOString(), // Note: stored as dueDate in routineInstances, but GanttTask uses endDate
                                type: 'task',
                                totalPoints: (task as any).totalPoints,
                                projectColor: project.color || '#3b82f6',
                                taskColor: task.color,
                                projectName: project.name,
                              }])
                            } else {
                              // Regular task - update the original
                              if (updateGanttTask) {
                                updateGanttTask(projectId, taskId, {
                                  startDate: newStart.toISOString(),
                                  endDate: newEnd.toISOString(),
                                } as any)
                              }
                            }
                        }
                        setDraggedTaskId(null)
                        } else if (data && data.startsWith('gantt-subtask:')) {
                          const [, projectId, taskId, subtaskId] = data.split(':')
                          const subtask = projects.find(p => p.id === projectId)?.children?.find(t => t.id === taskId)?.children?.find(st => st.id === subtaskId)
                          const task = projects.find(p => p.id === projectId)?.children?.find(t => t.id === taskId)
                          const project = projects.find(p => p.id === projectId)
                          if (subtask && task && project) {
                            // Calculate duration from story points
                            const durationHours = storyPointsToHours(subtask.storyPoints)
                            
                            const rect = e.currentTarget.getBoundingClientRect()
                            const y = e.clientY - rect.top
                            const { hour, minutes } = calculateTimeFromPosition(y, rect)
                            
                            // Ensure hour is within 5 AM to 12 AM range
                            if ((hour < 5 && hour !== 0) || (hour > 23 && hour !== 0)) return
                            
                            const newStart = new Date(day)
                            newStart.setHours(hour, minutes, 0, 0)
                            const newEnd = new Date(newStart.getTime() + durationHours * 60 * 60 * 1000)
                            
                            // Check for overlaps with existing scheduled items
                            const hasOverlap = existingItemsOnDay.some(existingItem => {
                              return doTimeRangesOverlap(
                                newStart,
                                newEnd,
                                existingItem.startDate,
                                existingItem.endDate
                              )
                            })
                            
                            if (hasOverlap) {
                              // Prevent drop if there's an overlap
                              alert('Cannot schedule: This time slot overlaps with an existing task.')
                              setDraggedTaskId(null)
                              return
                            }

                            // Check if this is a routine subtask
                            const isRoutineSubtask = String(subtask.status) === 'routine'
                            if (isRoutineSubtask) {
                              // Create a routine instance instead of updating the original
                              const instanceId = `routine-instance-${subtaskId}-${Date.now()}-${Math.random()}`
                              setRoutineInstances(prev => [...prev, {
                                id: instanceId,
                                originalId: subtaskId,
                                projectId: projectId,
                                taskId: taskId,
                                subtaskId: subtaskId,
                                name: subtask.name,
                                startDate: newStart.toISOString(),
                                dueDate: newEnd.toISOString(), // Note: stored as dueDate in routineInstances, but GanttTask uses endDate
                                type: 'subtask',
                                storyPoints: subtask.storyPoints,
                                projectColor: project.color || '#3b82f6',
                                taskColor: subtask.color,
                                projectName: project.name,
                                taskName: task.name,
                              }])
                            } else {
                              // Regular subtask - update the original
                              if (updateGanttSubtask) {
                                updateGanttSubtask(projectId, taskId, subtaskId, {
                                  startDate: newStart.toISOString(),
                                  endDate: newEnd.toISOString(),
                                } as any)
                              }
                            }
                          }
                          setDraggedTaskId(null)
                        } else if (draggedTaskId) {
                          // Handle regular tasks
                          const task = tasks.find(t => t.id === draggedTaskId)
                          if (task) {
                            updateTask(draggedTaskId, {
                              startDate: day.toISOString().split('T')[0],
                              dueDate: day.toISOString().split('T')[0],
                            })
                        }
                        setDraggedTaskId(null)
                        }
                      }}
                    >
                      {Array.from({ length: 20 }, (_, i) => {
                        const displayHour = 5 + i // Display hour: 5-24 (where 24 = 12 AM)
                        // Find tasks that START in this hour slot (not just overlap)
                        // Calculate the actual hour range for this slot
                        const actualHour = displayHour === 24 ? 0 : displayHour
                        const slotStart = new Date(day)
                        slotStart.setHours(actualHour, 0, 0, 0)
                        const slotEnd = new Date(day)
                        slotEnd.setHours(actualHour, 59, 59, 999)
                        
                        const tasksAtThisHour = scheduledItems.filter(item => {
                          const itemDay = item.startDate.getDate()
                          const itemMonth = item.startDate.getMonth()
                          const itemYear = item.startDate.getFullYear()
                          const dayDate = day.getDate()
                          const dayMonth = day.getMonth()
                          const dayYear = day.getFullYear()
                          
                          // Check if item is on the same day
                          const isSameDay = itemDay === dayDate && 
                                 itemMonth === dayMonth && 
                                           itemYear === dayYear
                          
                          if (!isSameDay) return false
                          
                          // Only include tasks that START in this hour slot
                          // A task should be rendered in the hour slot where its start hour matches
                          const itemStartHour = item.startDate.getHours()
                          
                          // Handle edge case: hour 0 (midnight) should match displayHour 24
                          const normalizedItemHour = itemStartHour === 0 ? 24 : itemStartHour
                          const normalizedDisplayHour = actualHour === 0 ? 24 : actualHour
                          
                          return normalizedItemHour === normalizedDisplayHour
                        })
                  
                  // Check if this hour slot is being dragged over
                  const isDragOverThisSlot = dragOverDay && 
                    dragOverDay.getTime() === day.getTime() && 
                    dragOverHour === displayHour
                  
                  return (
                    <div
                            key={displayHour}
                            className={`h-16 border-b border-slate-100 hover:bg-slate-50/50 transition-colors relative overflow-visible ${
                              isDragOverThisSlot && !dragOverHalf ? 'bg-blue-100/50 ring-2 ring-blue-400 ring-inset' : ''
                            }`}
                    >
                      {/* 30-minute divider line */}
                      <div className="absolute left-0 right-0 top-1/2 border-t border-slate-200/60 pointer-events-none z-0" />
                      
                      {/* Highlight for upper or lower half when dragging (30-minute slot) */}
                      {isDragOverThisSlot && dragOverHalf && (
                        <div
                          className={`absolute left-0 right-0 border-2 border-dashed border-blue-500 bg-blue-200/40 z-10 pointer-events-none ${
                            dragOverHalf === 'upper' ? 'top-0 h-1/2' : 'bottom-0 h-1/2'
                          }`}
                        />
                      )}
                            {/* Preview block showing where the task would be dropped */}
                            {isDragOverThisSlot && draggedItemData && (() => {
                              // Get the dragged item data to calculate duration
                              let durationHours = 1 // Default
                              
                              if (draggedItemData.type === 'task') {
                                const task = projects.find(p => p.id === draggedItemData.projectId)?.children?.find(t => t.id === draggedItemData.taskId)
                                if (task) {
                                  durationHours = storyPointsToHours((task as any).totalPoints)
                                }
                              } else if (draggedItemData.type === 'subtask' && draggedItemData.subtaskId) {
                                const subtask = projects.find(p => p.id === draggedItemData.projectId)?.children?.find(t => t.id === draggedItemData.taskId)?.children?.find(st => st.id === draggedItemData.subtaskId)
                                if (subtask) {
                                  durationHours = storyPointsToHours(subtask.storyPoints)
                                }
                              }
                              
                              const previewHeight = Math.round(durationHours * 64) // Each hour is 64px
                              
                              // Always position based on 30-minute slot (upper or lower half)
                              // Default to upper half if dragOverHalf is not set (shouldn't happen, but safety check)
                              const half = dragOverHalf || 'upper'
                              const previewTop = half === 'upper' ? 0 : 32 // 32px = half of 64px hour height
                              
                              // Calculate exact start and end times for preview
                              const actualHour = displayHour === 24 ? 0 : displayHour
                              const startMinutes = half === 'lower' ? 30 : 0
                              const previewStart = new Date(day)
                              previewStart.setHours(actualHour, startMinutes, 0, 0)
                              const previewEnd = new Date(previewStart.getTime() + durationHours * 60 * 60 * 1000)
                              
                              // Check for overlaps to show invalid drop zone
                              const dayStart = new Date(day)
                              dayStart.setHours(0, 0, 0, 0)
                              const existingItemsOnDay = scheduledItems.filter(item => {
                                const itemDate = new Date(item.startDate)
                                itemDate.setHours(0, 0, 0, 0)
                                return itemDate.getTime() === dayStart.getTime()
                              })
                              
                              const hasOverlap = existingItemsOnDay.some(existingItem => {
                                return previewStart.getTime() < existingItem.endDate.getTime() && 
                                       previewEnd.getTime() > existingItem.startDate.getTime()
                              })
                              
                              const formatTime = (date: Date) => {
                                const hours = date.getHours()
                                const minutes = date.getMinutes()
                                const ampm = hours >= 12 ? 'PM' : 'AM'
                                const displayHours = hours % 12 || 12
                                const displayMinutes = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ''
                                return `${displayHours}${displayMinutes} ${ampm}`
                              }

                          return (
                                <>
                                  <div
                                    className={`absolute left-0 right-0 rounded-md border-2 border-dashed z-10 pointer-events-none ${
                                      hasOverlap 
                                        ? 'border-red-400 bg-red-100/30' 
                                        : 'border-blue-400 bg-blue-100/30'
                                    }`}
                                    style={{
                                      top: `${previewTop}px`,
                                      height: `${previewHeight}px`,
                                      minHeight: '32px',
                                    }}
                                  />
                                  {/* Show exact start/end time tooltip */}
                                  <div
                                    className="absolute left-1/2 transform -translate-x-1/2 -translate-y-full mb-1 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg z-20 pointer-events-none whitespace-nowrap"
                                    style={{
                                      top: `${previewTop}px`,
                                    }}
                                  >
                                    {formatTime(previewStart)} - {formatTime(previewEnd)}
                                    {hasOverlap && <div className="text-red-300 mt-0.5">⚠ Overlaps with existing task</div>}
                                  </div>
                                </>
                              )
                            })()}
                            {/* Render task blocks that start at this hour */}
                            {(() => {
                              // Helper function to format duration as hours and minutes
                              const formatDuration = (hours: number): string => {
                                if (hours === 0.5) return '30 min'
                                if (hours === 1) return '1 hr'
                                
                                const wholeHours = Math.floor(hours)
                                const minutes = Math.round((hours - wholeHours) * 60)
                                
                                if (wholeHours === 0) {
                                  return `${minutes} min`
                                } else if (minutes === 0) {
                                  return `${wholeHours} ${wholeHours === 1 ? 'hr' : 'hrs'}`
                                } else {
                                  return `${wholeHours} ${wholeHours === 1 ? 'hr' : 'hrs'} ${minutes} min`
                                }
                              }
                              
                              // Calculate layout for overlapping tasks
                              // Group tasks by their time ranges to detect overlaps
                              const layoutItems = tasksAtThisHour.map((item, index) => {
                                const heightPixels = Math.round(item.durationHours * 64)
                                const startTime = item.startDate.getTime()
                                const endTime = item.endDate.getTime()
                                
                                // Find overlapping tasks
                                const overlappingItems = tasksAtThisHour.filter(otherItem => {
                                  if (otherItem.id === item.id) return false
                                  const otherStart = otherItem.startDate.getTime()
                                  const otherEnd = otherItem.endDate.getTime()
                                  // Check if they overlap
                                  return (startTime < otherEnd && endTime > otherStart)
                                })
                                
                                // Calculate position: find how many tasks start before this one that overlap
                                const overlappingBefore = tasksAtThisHour.filter(otherItem => {
                                  if (otherItem.id === item.id) return false
                                  const otherStart = otherItem.startDate.getTime()
                                  const otherEnd = otherItem.endDate.getTime()
                                  // Check if they overlap AND start before or at the same time
                                  return (startTime < otherEnd && endTime > otherStart) && 
                                         (otherStart <= startTime)
                                })
                                
                                const columnIndex = overlappingBefore.length
                                const totalOverlapping = overlappingItems.length + 1 // +1 for current item
                                const widthPercent = 100 / totalOverlapping
                                const leftPercent = columnIndex * widthPercent
                                
                                return {
                                  item,
                                  heightPixels,
                                  widthPercent,
                                  leftPercent,
                                  columnIndex,
                                  totalOverlapping
                                }
                              })
                              
                              return layoutItems.map(({ item, heightPixels, widthPercent, leftPercent }) => {
                                // Check if this is a routine instance
                                const isRoutineInstance = item.id.startsWith('routine-instance-')
                                const isEditing = editingScheduledBlockId === item.id
                                
                                // Calculate top position based on minutes (each hour is 64px, so each minute is 64/60 = 1.067px)
                                const startMinutes = item.startDate.getMinutes()
                                const topOffset = Math.round((startMinutes / 60) * 64) // Position within the hour slot
                                
                                // Handle delete/unschedule
                                const handleDelete = (e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  
                                  if (isRoutineInstance) {
                                    // Remove from routine instances
                                    setRoutineInstances(prev => prev.filter(instance => instance.id !== item.id))
                                  } else {
                                    // Clear startDate/endDate for regular tasks/subtasks
                                    if (item.type === 'task' && item.taskId && updateGanttTask) {
                                      updateGanttTask(item.projectId, item.taskId, {
                                        startDate: '',
                                        endDate: '',
                                      } as any)
                                    } else if (item.type === 'subtask' && item.taskId && item.subtaskId && updateGanttSubtask) {
                                      updateGanttSubtask(item.projectId, item.taskId, item.subtaskId, {
                                        startDate: '',
                                        endDate: '',
                                      } as any)
                                    }
                                  }
                                }
                                
                                // Handle click for manual double-click detection
                                const handleClick = (e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  const now = Date.now()
                                  
                                  // Check if this is a double-click (within 300ms and same item)
                                  if (lastClickInfo && 
                                      lastClickInfo.id === item.id && 
                                      now - lastClickInfo.time < 300) {
                                    e.preventDefault()
                                    setEditingScheduledBlockId(item.id)
                                    setEditingBlockName(item.name)
                                    setEditingBlockHours(String(item.durationHours))
                                    setLastClickInfo(null) // Reset after handling
                                  } else {
                                    // Store this click for potential double-click
                                    setLastClickInfo({ id: item.id, time: now })
                                    // Clear after timeout to prevent stale double-clicks
                                    setTimeout(() => {
                                      setLastClickInfo(prev => 
                                        prev?.id === item.id ? null : prev
                                      )
                                    }, 300)
                                  }
                                }
                                
                                // Also keep native double-click as fallback
                                const handleDoubleClick = (e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  setEditingScheduledBlockId(item.id)
                                  setEditingBlockName(item.name)
                                  setEditingBlockHours(item.durationHours)
                                  setLastClickInfo(null) // Reset
                                }
                                
                                // Handle save edits
                                const handleSaveEdit = () => {
                                  const hoursValue = parseFloat(editingBlockHours) || 0.5
                                  const trimmedName = editingBlockName.trim()
                                  
                                  if (isRoutineInstance) {
                                    // Find the instance being edited BEFORE state update to get identifying info
                                    // This avoids stale closure issues
                                    const editedInstance = routineInstances.find(inst => inst.id === item.id)
                                    if (!editedInstance) {
                                      console.warn('Could not find routine instance with id:', item.id)
                                      return
                                    }
                                    
                                    const { originalId, type: instanceType, projectId, taskId, subtaskId } = editedInstance
                                    const finalName = trimmedName || editedInstance.name
                                    
                                    // Update ALL routine instances with the same originalId and type
                                    // This ensures all instances of the same routine task update together
                                    setRoutineInstances(prev => {
                                      return prev.map(inst => {
                                        // Match by originalId and type to find all instances of the same routine task
                                        if (inst.originalId === originalId && inst.type === instanceType) {
                                        const startDate = new Date(inst.startDate)
                                        const newEndDate = new Date(startDate.getTime() + hoursValue * 60 * 60 * 1000)
                                        return {
                                          ...inst,
                                            name: finalName,
                                            totalPoints: instanceType === 'task' ? hoursValue : inst.totalPoints,
                                            storyPoints: instanceType === 'subtask' ? hoursValue : inst.storyPoints,
                                          dueDate: newEndDate.toISOString(), // Update endDate based on new duration
                                        }
                                      }
                                      return inst
                                      })
                                    })
                                    
                                    // Update the original routine task in the Routine project
                                    // This ensures the sidebar shows the updated hours
                                    if (instanceType === 'task' && taskId && projectId && updateGanttTask) {
                                      updateGanttTask(projectId, taskId, {
                                        name: finalName,
                                        totalPoints: hoursValue,
                                      } as any)
                                    } else if (instanceType === 'subtask' && taskId && subtaskId && projectId && updateGanttSubtask) {
                                      updateGanttSubtask(projectId, taskId, subtaskId, {
                                        name: finalName,
                                        storyPoints: hoursValue,
                                      } as any)
                                    }
                                    
                                    // Force a re-render to ensure UI updates
                                    // Use a longer delay to ensure state updates have propagated through the context
                                    setTimeout(() => {
                                      setUpdateTrigger(prev => prev + 1)
                                    }, 100)
                                  } else {
                                    // Update regular task/subtask - recalculate endDate based on new hours
                                    const startDate = new Date(item.startDate)
                                    const newEndDate = new Date(startDate.getTime() + hoursValue * 60 * 60 * 1000)
                                    
                                    if (item.type === 'task' && item.taskId && updateGanttTask) {
                                      updateGanttTask(item.projectId, item.taskId, {
                                        name: editingBlockName.trim() || item.name,
                                        totalPoints: hoursValue,
                                        endDate: newEndDate.toISOString(),
                                      } as any)
                                    } else if (item.type === 'subtask' && item.taskId && item.subtaskId && updateGanttSubtask) {
                                      updateGanttSubtask(item.projectId, item.taskId, item.subtaskId, {
                                        name: editingBlockName.trim() || item.name,
                                        storyPoints: hoursValue,
                                        endDate: newEndDate.toISOString(),
                                      } as any)
                                    }
                                  }
                                  setEditingScheduledBlockId(null)
                                  setEditingBlockName('')
                                  setEditingBlockHours('1')
                                }
                                
                                // Handle cancel edit
                                const handleCancelEdit = () => {
                                  setEditingScheduledBlockId(null)
                                  setEditingBlockName('')
                                  setEditingBlockHours('1')
                                }
                                
                                // Calculate minimum height for edit mode (to fit all editing fields)
                                // Need space for: labels (20px) + name input (28px) + hours input (28px) + buttons (28px) + padding (12px) = ~116px
                                const minEditHeight = 130 // Minimum height in pixels for edit mode
                                const editHeight = Math.max(heightPixels, minEditHeight)
                                
                                return (
                                <div
                                  key={item.id}
                          draggable={!isEditing}
                          onClick={handleClick}
                          onDoubleClick={handleDoubleClick}
                          title={!isEditing ? "Double-click to edit" : ""}
                          onMouseEnter={(e) => {
                            if (!isEditing) {
                              // Clear any existing timeout
                              if (tooltipTimeoutRef.current) {
                                clearTimeout(tooltipTimeoutRef.current)
                              }
                              
                              // Store reference to the element
                              const element = e.currentTarget
                              
                              // Set a 2-second delay before showing tooltip
                              tooltipTimeoutRef.current = setTimeout(() => {
                                // Check if element still exists and is in the DOM
                                if (element && element.getBoundingClientRect) {
                                  try {
                                    const rect = element.getBoundingClientRect()
                                    setHoveredBlockId(item.id)
                                    setTooltipPosition({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top - 10
                                    })
                                  } catch (error) {
                                    // Element might have been removed, silently fail
                                    console.warn('Could not get bounding rect for tooltip:', error)
                                  }
                                }
                              }, 2000)
                            }
                          }}
                          onMouseLeave={() => {
                            // Clear timeout if mouse leaves before 2 seconds
                            if (tooltipTimeoutRef.current) {
                              clearTimeout(tooltipTimeoutRef.current)
                              tooltipTimeoutRef.current = null
                            }
                            setHoveredBlockId(null)
                            setTooltipPosition(null)
                          }}
                          onDragStart={(e) => {
                            if (isEditing) {
                              e.preventDefault()
                              return
                            }
                            // Clear tooltip timeout when dragging starts
                            if (tooltipTimeoutRef.current) {
                              clearTimeout(tooltipTimeoutRef.current)
                              tooltipTimeoutRef.current = null
                            }
                            setHoveredBlockId(null)
                            setTooltipPosition(null)
                            
                            // Prevent drag if this might be a double-click attempt
                            if (lastClickInfo && lastClickInfo.id === item.id) {
                              const timeSinceClick = Date.now() - lastClickInfo.time
                              if (timeSinceClick < 400) {
                                // This might be a double-click, prevent drag
                                e.preventDefault()
                                setLastClickInfo(null)
                                return
                              }
                            }
                            e.stopPropagation()
                            e.dataTransfer.effectAllowed = 'move'
                            // Mark this as a scheduled task being dragged
                            e.dataTransfer.setData('application/scheduled-task', 'true')
                            // If it's a routine instance, store the instance ID so we can update it instead of creating a new one
                            if (isRoutineInstance) {
                              e.dataTransfer.setData('text/plain', `routine-instance:${item.id}`)
                              setDraggedItemData({ type: item.type, projectId: item.projectId, taskId: item.taskId, subtaskId: item.subtaskId })
                            } else if (item.type === 'task' && item.taskId) {
                              e.dataTransfer.setData('text/plain', `gantt-task:${item.projectId}:${item.taskId}`)
                              setDraggedItemData({ type: 'task', projectId: item.projectId, taskId: item.taskId })
                            } else if (item.type === 'subtask' && item.taskId && item.subtaskId) {
                              e.dataTransfer.setData('text/plain', `gantt-subtask:${item.projectId}:${item.taskId}:${item.subtaskId}`)
                              setDraggedItemData({ type: 'subtask', projectId: item.projectId, taskId: item.taskId, subtaskId: item.subtaskId })
                            }
                            // Clear click info when drag starts
                            setLastClickInfo(null)
                          }}
                          onDragEnd={(e) => {
                            e.stopPropagation()
                            // Clear drag over state when drag ends
                            setDragOverDay(null)
                            setDragOverHour(null)
                            setDraggedItemData(null)
                          }}
                                  className={`group absolute rounded-md border-l-2 shadow-sm z-20 flex flex-col overflow-visible ${isEditing ? 'cursor-default ring-2 ring-blue-400 p-1.5' : heightPixels < 64 ? 'p-0.5 cursor-move hover:shadow-md' : 'p-1.5 cursor-move hover:shadow-md'} transition-all duration-200`}
                          style={{
                                    top: `${topOffset}px`,
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`,
                                    height: isEditing ? `${editHeight}px` : `${heightPixels}px`,
                                    minHeight: isEditing ? `${editHeight}px` : `${heightPixels}px`,
                                    backgroundColor: isEditing 
                                      ? (item.taskColor || item.projectColor) // Full opacity when editing
                                      : (item.taskColor ? hexToRgba(item.taskColor, 0.15) : hexToRgba(item.projectColor, 0.15)), // Transparent when not editing
                                    borderLeftColor: item.projectColor,
                                    marginRight: '4px',
                                    zIndex: isEditing ? 50 : 20, // Higher z-index when editing to ensure it's on top
                                  }}
                                >
                                  {/* Delete button - appears on hover (hidden when editing) */}
                                  {!isEditing && (
                                    <button
                                      onClick={handleDelete}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-30 shadow-sm pointer-events-auto"
                                      title="Remove from schedule"
                                    >
                                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                  
                                  {isEditing ? (
                                    // Editing mode
                                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <span
                                          className="text-[8px] px-1 py-0.5 rounded font-medium text-white truncate"
                                          style={{ backgroundColor: item.projectColor }}
                                        >
                                          {item.projectName}
                                        </span>
                                        {item.taskName && (
                                          <span
                                            className="text-[8px] px-1 py-0.5 rounded font-medium text-white truncate"
                                            style={{ backgroundColor: item.taskColor || item.projectColor }}
                                          >
                                            {item.taskName}
                                          </span>
                                        )}
                                      </div>
                                      <input
                                        type="text"
                                        value={editingBlockName}
                                        onChange={(e) => setEditingBlockName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleSaveEdit()
                                          } else if (e.key === 'Escape') {
                                            handleCancelEdit()
                                          }
                                        }}
                                        className="text-[10px] font-semibold text-slate-800 bg-white/95 border border-slate-300 rounded px-1.5 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 flex-shrink-0"
                                        placeholder="Task name"
                                        autoFocus
                                      />
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <input
                                          type="number"
                                          min="0.5"
                                          step="0.5"
                                          value={editingBlockHours}
                                          onChange={(e) => {
                                            // Allow any input during editing - store as string
                                            setEditingBlockHours(e.target.value)
                                          }}
                                          onBlur={(e) => {
                                            // Ensure we have a valid value when input loses focus
                                            const value = parseFloat(e.target.value)
                                            if (isNaN(value) || value <= 0) {
                                              setEditingBlockHours('0.5')
                                            } else {
                                              setEditingBlockHours(String(value))
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleSaveEdit()
                                            } else if (e.key === 'Escape') {
                                              handleCancelEdit()
                                            }
                                          }}
                                          className="text-[9px] text-slate-800 bg-white/95 border border-slate-300 rounded px-1.5 py-1 w-16 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-shrink-0"
                                          placeholder="Hours"
                                        />
                                        <span className="text-[9px] text-slate-600 flex-shrink-0">hrs</span>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0 mt-auto">
                                        <button
                                          onClick={handleSaveEdit}
                                          className="text-[9px] px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded flex-1 transition-colors font-medium"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={handleCancelEdit}
                                          className="text-[9px] px-2 py-1 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded flex-1 transition-colors font-medium"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    // Display mode
                                    <>
                                  {/* Compact layout for short blocks (less than 1 hour) */}
                                  {heightPixels < 64 ? (
                                    <div className="flex flex-col gap-0.5 h-full justify-center min-h-0 overflow-hidden">
                                      {/* Single line layout for very short blocks (30 min) - prioritize task name */}
                                      {heightPixels < 35 ? (
                                        <div className="flex flex-col gap-0.5 h-full justify-center min-h-0">
                                          <p className="text-[10px] font-bold text-slate-900 truncate leading-tight">
                                            {item.name}
                                          </p>
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            <span
                                              className="text-[6px] px-0.5 py-0 rounded font-medium text-white truncate"
                                              style={{ backgroundColor: item.projectColor }}
                                            >
                                              {item.projectName}
                                            </span>
                                            {item.durationHours > 0 && (
                                              <p className="text-[7px] text-slate-600 leading-tight whitespace-nowrap">
                                                {formatDuration(item.durationHours)}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col gap-0.5 h-full justify-center min-h-0">
                                          <div className="flex items-center gap-0.5 flex-shrink-0">
                                            <span
                                              className="text-[7px] px-0.5 py-0 rounded font-medium text-white truncate"
                                              style={{ backgroundColor: item.projectColor }}
                                            >
                                              {item.projectName}
                                            </span>
                                            {item.taskName && (
                                              <span
                                                className="text-[7px] px-0.5 py-0 rounded font-medium text-white truncate"
                                                style={{ backgroundColor: item.taskColor || item.projectColor }}
                                              >
                                                {item.taskName}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[9px] font-semibold text-slate-800 truncate leading-tight">
                                            {item.name}
                                          </p>
                                          {item.durationHours > 0 && (
                                            <p className="text-[7px] text-slate-600 leading-tight">
                                              {formatDuration(item.durationHours)}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-1 mb-0.5 flex-shrink-0">
                                    <span
                                      className="text-[8px] px-1 py-0.5 rounded font-medium text-white truncate"
                                      style={{ backgroundColor: item.projectColor }}
                                    >
                                      {item.projectName}
                                    </span>
                                    {item.taskName && (
                                      <span
                                        className="text-[8px] px-1 py-0.5 rounded font-medium text-white truncate"
                                        style={{ backgroundColor: item.taskColor || item.projectColor }}
                                      >
                                        {item.taskName}
                                      </span>
                                  )}
                                </div>
                                  <p className="text-[10px] font-semibold text-slate-800 truncate leading-tight">
                                    {item.name}
                                  </p>
                                  {item.durationHours > 0 && (
                                    <p className="text-[8px] text-slate-600 mt-0.5">
                                      {formatDuration(item.durationHours)}
                                    </p>
                                      )}
                                    </>
                                      )}
                                    </>
                                )}
                          </div>
                                )
                              })
                            })()}
                            
                            {/* Current time indicator for today */}
                            {isToday && (() => {
                  const now = new Date()
                              const currentHour = now.getHours()
                              // Convert current hour to display hour (0 -> 24, others stay the same)
                              const currentDisplayHour = currentHour === 0 ? 24 : currentHour
                              if (now.getDate() === day.getDate() && 
                                  now.getMonth() === day.getMonth() && 
                                  now.getFullYear() === day.getFullYear() &&
                                  currentDisplayHour === displayHour) {
                    const minutes = now.getMinutes()
                                const topPercent = (minutes / 60) * 100
                  return (
                    <div
                                    className="absolute left-0 right-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-orange-500 z-30"
                                    style={{ top: `${topPercent}%` }}
                                  />
                    )
                  }
                  return null
                })()}
                                        </div>
                        )
                      })}
                                    </div>
                  )
                })}
                  </div>
                </div>
              </div>
              
              {/* Tooltip for task blocks */}
              {hoveredBlockId && tooltipPosition && (() => {
                const hoveredItem = scheduledItems.find(item => item.id === hoveredBlockId)
                if (!hoveredItem) return null
                
                const formatTime = (date: Date) => {
                  const hours = date.getHours()
                  const minutes = date.getMinutes()
                  const ampm = hours >= 12 ? 'PM' : 'AM'
                  const displayHours = hours % 12 || 12
                  const displayMinutes = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ''
                  return `${displayHours}${displayMinutes} ${ampm}`
                }
                
                const formatDuration = (hours: number): string => {
                  if (hours === 0.5) return '30 min'
                  if (hours === 1) return '1 hr'
                  
                  const wholeHours = Math.floor(hours)
                  const minutes = Math.round((hours - wholeHours) * 60)
                  
                  if (wholeHours === 0) {
                    return `${minutes} min`
                  } else if (minutes === 0) {
                    return `${wholeHours} ${wholeHours === 1 ? 'hr' : 'hrs'}`
                  } else {
                    return `${wholeHours} ${wholeHours === 1 ? 'hr' : 'hrs'} ${minutes} min`
                  }
                }
                
                const startTime = new Date(hoveredItem.startDate)
                const endTime = new Date(hoveredItem.endDate)
                
                return (
                  <div
                    className="fixed z-50 bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3 pointer-events-none max-w-xs"
                    style={{
                      left: `${tooltipPosition.x}px`,
                      top: `${tooltipPosition.y}px`,
                      transform: 'translate(-50%, -100%)',
                      marginTop: '-8px'
                    }}
                  >
                    <div className="space-y-1.5">
                      <div className="font-semibold text-sm text-white">{hoveredItem.name}</div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white"
                          style={{ backgroundColor: hoveredItem.projectColor }}
                        >
                          {hoveredItem.projectName}
                        </span>
                        {hoveredItem.taskName && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white"
                            style={{ backgroundColor: hoveredItem.taskColor || hoveredItem.projectColor }}
                          >
                            {hoveredItem.taskName}
                          </span>
                        )}
                      </div>
                      <div className="text-slate-300 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Duration:</span>
                          <span className="font-medium">
                            {formatDuration(hoveredItem.durationHours)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Time:</span>
                          <span className="font-medium">
                            {formatTime(startTime)} - {formatTime(endTime)}
                          </span>
                        </div>
                        {hoveredItem.type === 'subtask' && (
                          <div className="text-slate-400 text-[10px]">Subtask</div>
                        )}
                        {hoveredItem.id.startsWith('routine-instance-') && (
                          <div className="text-slate-400 text-[10px]">Routine Task</div>
                        )}
                      </div>
                    </div>
                    {/* Arrow pointing down */}
                    <div
                      className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                      style={{ borderTopColor: '#1e293b' }}
                    />
                  </div>
                )
              })()}
            </section>
              )}


              {view === "focus" && (
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="panel p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ink/80 text-white flex items-center justify-center">⏱</div>
              <h3 className="text-lg text-ink font-semibold">Today's Plan</h3>
            </div>
            <p className="text-sm text-graphite/70">
              Your top 3 priority tasks. Select one to start a Pomodoro session. 25 minutes of focused work, then 5 minutes of rest.
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {todayTasks.length === 0 ? (
                <p className="text-graphite/60 text-sm">No priority tasks available. Create a task to get started.</p>
              ) : (
                todayTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      setFocusTaskId(task.id)
                      setSecondsLeft(POMODORO_WORK_DURATION)
                      setIsRunning(false)
                      setIsRestPeriod(false)
                      setSessionStartTime(null)
                    }}
                    className={`w-full text-left px-4 py-3 rounded-2xl border smooth-transition ${
                      focusTaskId === task.id
                        ? "border-ink bg-ink text-white shadow-md"
                        : "border-graphite/10 text-ink hover:border-graphite/40 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className={`text-xs ${focusTaskId === task.id ? 'text-white/80' : 'text-cyan-500/60'}`}>
                            {task.priority}
                          </p>
                          {task.timeSpent && task.timeSpent > 0 && (
                            <p className={`text-xs ${focusTaskId === task.id ? 'text-white/70' : 'text-graphite/50'}`}>
                              • {task.timeSpent} min
                            </p>
                          )}
                        </div>
                      </div>
                      {task.status === 'in-progress' && (
                        <div className="ml-2 w-2 h-2 rounded-full bg-green-500"></div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="panel p-6 flex flex-col items-center justify-center space-y-4">
            {activeFocusTask ? (
              <>
                <div className="text-center space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-graphite/50">
                    {isRestPeriod ? "Rest Period" : "Focus Session"}
                  </p>
                  <h4 className="text-xl text-ink font-semibold">{activeFocusTask.title}</h4>
                  {activeFocusTask.timeSpent && activeFocusTask.timeSpent > 0 && (
                    <p className="text-sm text-graphite/60">Total time: {activeFocusTask.timeSpent} minutes</p>
                  )}
                </div>
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" stroke="rgba(23,28,36,0.1)" strokeWidth="5" fill="transparent" />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke={isRestPeriod ? "#10b981" : "#171c24"}
                      strokeWidth="4"
                      strokeDasharray={`${Math.min(283, (progressPercent / 100) * 283)} 283`}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className={`text-3xl font-semibold ${isRestPeriod ? 'text-green-600' : 'text-ink'}`}>
                      {formatSeconds(secondsLeft)}
                    </p>
                    <p className="text-xs text-graphite/60">
                      {isRestPeriod ? "Rest time" : "Work time"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  <button
                    onClick={() => setIsRunning((prev) => !prev)}
                    className={`px-5 py-2 rounded-full border uppercase tracking-[0.3em] smooth-transition ${
                      isRestPeriod
                        ? "border-green-500 text-green-600 hover:bg-green-50"
                        : "border-ink text-ink hover:bg-ink/5"
                    }`}
                  >
                    {isRunning ? "Pause" : "Start"}
                  </button>
                  <button
                    onClick={() => {
                      setSecondsLeft(isRestPeriod ? POMODORO_REST_DURATION : POMODORO_WORK_DURATION)
                      setIsRunning(false)
                      setSessionStartTime(null)
                    }}
                    className="px-5 py-2 rounded-full border border-graphite/20 text-graphite uppercase tracking-[0.3em] hover:bg-graphite/5 smooth-transition"
                  >
                    Reset
                  </button>
                  {!isRestPeriod && (
                    <button
                      onClick={() => {
                        // Save current progress to log
                        if (!focusTaskId) return
                        
                        const task = tasks.find(t => t.id === focusTaskId)
                        if (!task) return
                        
                        const endTime = Date.now()
                        const workDuration = POMODORO_WORK_DURATION
                        const elapsed = workDuration - secondsLeft // seconds elapsed
                        
                        // Calculate time spent in minutes (minimum 1 minute if any time has passed)
                        let timeSpent = 0
                        if (elapsed > 0) {
                          timeSpent = Math.max(1, Math.floor(elapsed / 60)) // at least 1 minute if any time passed
                        } else if (sessionStartTime !== null) {
                          // Fallback to session start time if timer hasn't moved
                          timeSpent = Math.max(1, Math.floor((endTime - sessionStartTime) / 1000 / 60))
                        }
                        
                        if (timeSpent > 0) {
                          const currentTime = task.timeSpent || 0
                          const startTime = sessionStartTime || (endTime - (elapsed * 1000))
                          const timeEntry = {
                            id: `time-${Date.now()}-${Math.random()}`,
                            duration: timeSpent,
                            startTime: new Date(startTime).toISOString(),
                            endTime: new Date(endTime).toISOString(),
                            type: 'work' as const,
                          }
                          const timeLog = task.timeLog || []
                          updateTask(focusTaskId, { 
                            timeSpent: currentTime + timeSpent,
                            timeLog: [...timeLog, timeEntry]
                          })
                          // Reset session start time and timer
                          setSessionStartTime(Date.now())
                          setSecondsLeft(POMODORO_WORK_DURATION)
                          setIsRunning(false)
                        }
                      }}
                      disabled={secondsLeft === POMODORO_WORK_DURATION && sessionStartTime === null}
                      className={`px-5 py-2 rounded-full border uppercase tracking-[0.3em] smooth-transition ${
                        secondsLeft === POMODORO_WORK_DURATION && sessionStartTime === null
                          ? "border-graphite/20 text-graphite/40 cursor-not-allowed"
                          : "border-blue-500/60 text-blue-600 hover:bg-blue-50"
                      }`}
                    >
                      Save Progress
                    </button>
                  )}
                  {!isRestPeriod && (
                  <button
                    onClick={() => {
                      toggleTaskStatus(activeFocusTask.id)
                      setFocusTaskId(null)
                      setIsRunning(false)
                        setSessionStartTime(null)
                    }}
                      className="px-5 py-2 rounded-full border border-amber/60 text-amber uppercase tracking-[0.3em] hover:bg-amber/5 smooth-transition"
                  >
                    Complete
                  </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-lg text-ink">Select a task to focus.</p>
                <p className="text-sm text-graphite/60">Start a 25-minute work session, then take a 5-minute break.</p>
              </div>
            )}
          </div>

          {/* Time Log */}
          {activeFocusTask && (
            <div className="panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-ink/10 text-ink flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg text-ink font-semibold">Time Log</h3>
              </div>
              {activeFocusTask.timeLog && activeFocusTask.timeLog.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {activeFocusTask.timeLog
                    .slice()
                    .reverse()
                    .map((entry) => {
                      const startDate = new Date(entry.startTime)
                      const endDate = new Date(entry.endTime)
                      const dateStr = startDate.toLocaleDateString("en-US", { 
                        month: "short", 
                        day: "numeric",
                        year: startDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
                      })
                      const timeStr = startDate.toLocaleTimeString("en-US", { 
                        hour: "numeric", 
                        minute: "2-digit",
                        hour12: true 
                      })
                      
                      return (
                        <div
                          key={entry.id}
                          className="p-3 rounded-xl border border-slate-200/60 bg-white/50 hover:bg-white hover:shadow-sm smooth-transition"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                entry.type === 'work' ? 'bg-blue-500' : 'bg-green-500'
                              }`}></div>
                              <span className="text-sm font-semibold text-ink">
                                {entry.duration} min
                              </span>
                              <span className="text-xs text-graphite/60 capitalize">
                                {entry.type}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-graphite/50 mt-1">
                            {dateStr} at {timeStr}
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-graphite/50">
                  <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">No time logged yet</p>
                  <p className="text-xs mt-1">Start a focus session to begin tracking time</p>
                </div>
              )}
              {activeFocusTask.timeSpent && activeFocusTask.timeSpent > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-graphite/70">Total Time</span>
                    <span className="text-lg font-bold text-ink">{activeFocusTask.timeSpent} minutes</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {view === "projects2" && (
        <div className="h-full -mx-6 -my-8">
          <Projects2Page />
        </div>
      )}

      {view === "ganttv2" && (
        <div className="h-full -mx-6 -my-8">
          <GanttV2Page />
        </div>
      )}

        </div>
      </main>

      {/* Delete Confirmation Modal for Sprint/Routine Tasks */}
      {deleteConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteConfirmModal(null)
            }
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
          
          {/* Modal Content */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    Delete {deleteConfirmModal.item.type === 'task' ? 'Task' : 'Subtask'}
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-5">
              <p className="text-sm text-slate-700 mb-4">
                Are you sure you want to permanently delete <span className="font-semibold text-slate-900">"{deleteConfirmModal.item.name}"</span>?
              </p>
              
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">This will remove the {deleteConfirmModal.item.type === 'task' ? 'task' : 'subtask'} from:</p>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Calendar schedule
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Board section
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Gantt chart
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Projects table
                  </li>
                  {deleteConfirmModal.item.isRoutine && (
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      All routine instances in calendar
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 smooth-transition shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 smooth-transition shadow-sm"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskColumn({
  column,
  tasks,
  updateTask,
  toggleTaskStatus,
  deleteTask,
  toggleSubtask,
  addSubtask,
  deleteSubtask,
  setEditingTaskId,
  setEditTaskData,
  gradient,
  creatingTaskInColumn,
  newTaskData,
  onNewTaskChange,
  onSaveNewTask,
  onCancelNewTask,
  onCreateNewTask,
  onStartFocus,
  addTask,
}: {
  column: { status: TaskStatus | "sprint" | "today"; label: string; hint: string; tasks: Task[] }
  tasks: Task[]
  updateTask: (id: string, updates: Partial<Task>) => void
  toggleTaskStatus: (id: string) => void
  deleteTask: (id: string) => void
  toggleSubtask: (taskId: string, subtaskId: string) => void
  addSubtask: (taskId: string, title: string) => void
  deleteSubtask: (taskId: string, subtaskId: string) => void
  setEditingTaskId: (id: string | null) => void
  setEditTaskData: (data: Partial<Task> | null) => void
  gradient: { from: string; to: string; accent: string }
  creatingTaskInColumn: boolean
  newTaskData: { status: TaskStatus; title: string; description: string; priority: TaskPriority; difficulty: TaskDifficulty | undefined; dueDate: string; startDate: string; category: string } | null
  onNewTaskChange: (data: { status: TaskStatus; title: string; description: string; priority: TaskPriority; difficulty: TaskDifficulty | undefined; dueDate: string; startDate: string; category: string } | null) => void
  onSaveNewTask: () => void
  onCancelNewTask: () => void
  onCreateNewTask: () => void
  onStartFocus: (taskId: string) => void
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const data = e.dataTransfer.getData('text/plain')
    if (data) {
      // Check if it's a subtask being converted to a task
      if (data.startsWith('subtask:')) {
        const [, parentTaskId, subtaskId] = data.split(':')
        const parentTask = tasks.find(t => t.id === parentTaskId)
        const subtask = parentTask?.subtasks?.find(st => st.id === subtaskId)
        
        if (parentTask && subtask) {
          // Convert subtask to a task
          const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
            title: subtask.title,
            description: undefined,
            priority: subtask.priority || 'medium',
            difficulty: subtask.difficulty,
            status: column.status === "sprint" || column.status === "today" ? "todo" : (column.status as TaskStatus),
            dueDate: column.status === "today" ? new Date().toISOString().split('T')[0] : undefined,
            startDate: undefined,
            category: column.status === "sprint" ? "sprint" : parentTask.category,
          }
          
          // Add the new task
          addTask(newTask)
          
          // Remove the subtask from the parent task
          deleteSubtask(parentTaskId, subtaskId)
        }
      } else {
        // Regular task drag and drop
        const taskId = data
        const task = tasks.find(t => t.id === taskId)
        if (task) {
          if (column.status === "sprint") {
            // For sprint column, set category to "sprint" and keep current status
            updateTask(taskId, { category: "sprint" })
          } else if (column.status === "today") {
            // For today column, set dueDate to today and keep current status
            const today = new Date().toISOString().split('T')[0]
            updateTask(taskId, { dueDate: today })
          } else if (task.status !== column.status) {
            // For regular status columns, update status
            updateTask(taskId, { status: column.status as TaskStatus })
          }
        }
      }
    }
  }

  const accentColors: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50/50 text-blue-700",
    orange: "border-orange-200 bg-orange-50/50 text-orange-700",
    slate: "border-slate-200 bg-slate-100/50 text-slate-700",
  }

  const getGradientClasses = () => {
    if (gradient.accent === 'blue') {
      return `bg-gradient-to-br from-slate-50 to-blue-50/50`
    } else if (gradient.accent === 'orange') {
      return `bg-gradient-to-br from-slate-50 to-orange-50/50`
    } else {
      return `bg-gradient-to-br from-slate-50 to-slate-100/50`
    }
  }

  const dragOverStyles = isDragOver 
    ? gradient.accent === 'blue' 
      ? 'ring-2 ring-blue-400 ring-offset-2 border-blue-300 bg-blue-50/30'
      : gradient.accent === 'orange'
      ? 'ring-2 ring-orange-400 ring-offset-2 border-orange-300 bg-orange-50/30'
      : 'ring-2 ring-slate-400 ring-offset-2 border-slate-300 bg-slate-100/30'
    : ''

  return (
    <div 
      className={`relative rounded-2xl ${getGradientClasses()} border border-slate-200/60 p-5 space-y-4 smooth-transition shadow-sm hover:shadow-md ${dragOverStyles}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        if (creatingTaskInColumn && newTaskData) {
          const target = e.target as HTMLElement
          if (!target.closest('.bg-white.rounded-xl.border-2')) {
            onCancelNewTask()
          }
        }
      }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-8 rounded-full bg-gradient-to-b from-${gradient.accent}-400 to-${gradient.accent}-600`} />
        <div>
            <h3 className="text-base font-bold text-slate-900">{column.label}</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{column.hint}</p>
        </div>
      </div>
        <div className={`px-2.5 py-1 rounded-lg ${accentColors[gradient.accent]} text-xs font-bold shadow-sm`}>
          {column.tasks.length}
        </div>
      </div>

      {/* Tasks Container */}
      <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1.5 custom-scrollbar">
        {/* Inline Task Creation Card */}
        {creatingTaskInColumn && newTaskData && (
          <div 
            className="bg-white rounded-xl border-2 border-slate-300 p-2.5 space-y-1.5 shadow-md relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title Input */}
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <input
                type="text"
                placeholder="Type a name..."
                value={newTaskData.title}
                onChange={(e) => onNewTaskChange({ ...newTaskData, title: e.target.value })}
                className="flex-1 px-1.5 py-0.5 text-xs rounded-lg border-0 bg-transparent focus:outline-none focus:ring-0 placeholder:text-slate-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTaskData.title.trim()) {
                    e.preventDefault()
                    onSaveNewTask()
                  } else if (e.key === 'Escape') {
                    onCancelNewTask()
                  }
                }}
              />
            </div>

            {/* Additional Fields */}
            <div className="space-y-1 pl-4">
              {/* Add Due Date */}
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'date'
                  input.value = newTaskData.dueDate || ''
                  input.onchange = (e) => {
                    const target = e.target as HTMLInputElement
                    onNewTaskChange({ ...newTaskData, dueDate: target.value })
                  }
                  input.click()
                }}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 smooth-transition"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{newTaskData.dueDate ? new Date(newTaskData.dueDate).toLocaleDateString() : 'Add Due Date'}</span>
              </button>

              {/* Add Category */}
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <select
                  value={newTaskData.category}
                  onChange={(e) => onNewTaskChange({ ...newTaskData, category: e.target.value })}
                  className="flex-1 px-1.5 py-0.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-300 text-slate-700"
                >
                  <option value="">Add Category</option>
                  <option value="Personal">Personal</option>
                  <option value="Wife">Wife</option>
                  <option value="Health - Body">Health - Body</option>
                  <option value="Health - Mind">Health - Mind</option>
                  <option value="Personal Brand">Personal Brand</option>
                  <option value="Pilot">Pilot</option>
                  <option value="Marketing Business">Marketing Business</option>
                  <option value="Fun">Fun</option>
                  <option value="Finances">Finances</option>
                  <option value="Relations">Relations</option>
                  <option value="Chores">Chores</option>
                </select>
              </div>

              {/* Priority Selection */}
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <select
                  value={newTaskData.priority}
                  onChange={(e) => onNewTaskChange({ ...newTaskData, priority: e.target.value as TaskPriority })}
                  className="flex-1 px-1.5 py-0.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-300 text-slate-700"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Priority</option>
                </select>
              </div>

              {/* Time Estimate */}
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <select
                  value={newTaskData.difficulty || ''}
                  onChange={(e) => onNewTaskChange({ ...newTaskData, difficulty: e.target.value ? (Number(e.target.value) as TaskDifficulty) : undefined })}
                  className="flex-1 px-1.5 py-0.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-300 text-slate-700"
                >
                  <option value="">Time Estimate</option>
                  <option value="1">1 - &lt;1hr</option>
                  <option value="2">2 - &lt;4hrs</option>
                  <option value="3">3 - 1 day</option>
                  <option value="5">5 - 3 days</option>
                  <option value="8">8 - 1 week</option>
                </select>
              </div>

              {/* Description */}
              <textarea
                placeholder="Add description..."
                value={newTaskData.description}
                onChange={(e) => onNewTaskChange({ ...newTaskData, description: e.target.value })}
                className="w-full px-1.5 py-0.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-300 resize-none placeholder:text-slate-400"
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-200">
              <button
                type="button"
                onClick={onCancelNewTask}
                className="px-2 py-1 text-[10px] font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 smooth-transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveNewTask}
                disabled={!newTaskData.title.trim()}
                className="px-2 py-1 text-[10px] font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-900 smooth-transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Existing Tasks */}
        {column.tasks.length === 0 && !creatingTaskInColumn ? (
          <div className={`text-center py-12 ${isDragOver ? 'text-slate-700' : 'text-slate-400'}`}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100/60 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-sm font-medium">{isDragOver ? 'Drop task here' : 'No tasks yet'}</p>
            <p className="text-xs text-slate-400 mt-1">Drag tasks here to organize</p>
          </div>
        ) : (
          column.tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            onToggle={() => toggleTaskStatus(task.id)}
            onDelete={() => deleteTask(task.id)}
            onUpdate={(updates) => updateTask(task.id, updates)}
            onToggleSubtask={(subtaskId) => toggleSubtask(task.id, subtaskId)}
            onAddSubtask={(title) => addSubtask(task.id, title)}
            onDeleteSubtask={(subtaskId) => deleteSubtask(task.id, subtaskId)}
            onEdit={() => {
              setEditingTaskId(task.id)
              setEditTaskData({
                title: task.title,
                description: task.description,
                priority: task.priority,
                difficulty: task.difficulty,
                dueDate: task.dueDate,
                startDate: task.startDate,
                category: task.category,
              })
            }}
            onStartFocus={() => onStartFocus(task.id)}
          />
          ))
        )}
      </div>

      {/* New Task Button */}
      {!creatingTaskInColumn && (
        <button
          onClick={onCreateNewTask}
          className="w-full mt-3 px-4 py-2.5 text-sm font-medium rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 smooth-transition flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Task</span>
        </button>
      )}
    </div>
  )
}

const difficultyColors: Record<number, string> = {
  1: 'bg-green-50/80 text-green-700 border-green-200',
  2: 'bg-blue-50/80 text-blue-700 border-blue-200',
  3: 'bg-amber-50/80 text-amber-700 border-amber-200',
  5: 'bg-orange-50/80 text-orange-700 border-orange-200',
  8: 'bg-red-50/80 text-red-700 border-red-200',
}

function DraggableSubtask({
  subtask,
  taskId,
  onToggleSubtask,
  onDeleteSubtask,
}: {
  subtask: Subtask
  taskId: string
  onToggleSubtask: (subtaskId: string) => void
  onDeleteSubtask: (subtaskId: string) => void
}) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div 
      draggable={!subtask.completed}
      onDragStart={(e) => {
        e.stopPropagation()
        setIsDragging(true)
        e.dataTransfer.effectAllowed = 'move'
        // Store subtask info in format: subtask:taskId:subtaskId
        e.dataTransfer.setData('text/plain', `subtask:${taskId}:${subtask.id}`)
      }}
      onDragEnd={() => {
        setIsDragging(false)
      }}
      className={`group/subtask relative rounded-md border border-slate-200 bg-slate-50/50 p-2 smooth-transition ${
        subtask.completed 
          ? "opacity-60 cursor-not-allowed" 
          : isDragging
          ? "bg-blue-50 border-blue-300 shadow-sm opacity-75 cursor-grabbing"
          : "hover:bg-slate-100 hover:border-slate-300 cursor-move"
      }`}
    >
      <div className="flex items-start gap-1.5">
        {/* Subtask indicator line */}
        <div className="flex-shrink-0 w-0.5 h-full bg-slate-300 rounded-full mt-1" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSubtask(subtask.id)
          }}
          className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 smooth-transition ${
            subtask.completed
              ? "bg-emerald-500 border-emerald-600 text-white"
              : "border-slate-300 hover:border-emerald-500 bg-white"
          }`}
        >
          {subtask.completed && (
            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={`text-[11px] leading-snug ${
              subtask.completed ? "line-through text-slate-400" : "text-slate-600"
            }`}
          >
            {subtask.title}
          </p>
          {(subtask.difficulty || subtask.priority) && (
            <div className="flex items-center gap-1 mt-1">
              {subtask.difficulty && (
                <span className="text-[8px] px-1 py-0.5 rounded bg-blue-100 text-blue-600 border border-blue-200">
                  {difficultyLabels[subtask.difficulty]}
                </span>
              )}
              {subtask.priority && (
                <span className={`text-[8px] px-1 py-0.5 rounded border ${
                  subtask.priority === 'urgent' 
                    ? 'bg-red-100 text-red-600 border-red-200'
                    : subtask.priority === 'high'
                    ? 'bg-orange-100 text-orange-600 border-orange-200'
                    : subtask.priority === 'medium'
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : 'bg-blue-100 text-blue-600 border-blue-200'
                }`}>
                  {subtask.priority}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteSubtask(subtask.id)
          }}
          className="opacity-0 group-hover/subtask:opacity-100 smooth-transition text-slate-400 hover:text-red-500 p-0.5 rounded hover:bg-red-50"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function TaskCard({
  task,
  index,
  onToggle,
  onDelete,
  onUpdate,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onEdit,
  onStartFocus,
}: {
  task: Task
  index: number
  onToggle: () => void
  onDelete: () => void
  onUpdate: (updates: Partial<Task>) => void
  onToggleSubtask: (subtaskId: string) => void
  onAddSubtask: (title: string) => void
  onDeleteSubtask: (subtaskId: string) => void
  onEdit: () => void
  onStartFocus: () => void
}) {
  const [showSubtasks, setShowSubtasks] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const isCompleted = task.status === "completed"
  const subtasks = task.subtasks || []
  const completedSubtasks = subtasks.filter(st => st.completed).length
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0

  const getTimeRemaining = () => {
    if (!task.dueDate) return null
    const due = new Date(task.dueDate)
    const now = new Date()
    const diff = due.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }
  const daysRemaining = getTimeRemaining()

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault()
    if (newSubtaskTitle.trim()) {
      onAddSubtask(newSubtaskTitle.trim())
      setNewSubtaskTitle("")
    }
  }

  const truncateDescription = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const formatDueDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
  }


  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const getCategoryBgColor = () => {
    if (!task.category) return 'bg-white'
    switch (task.category) {
      case 'chores':
        return 'bg-blue-100'
      case 'personal-brand':
        return 'bg-purple-100'
      case 'flight-training':
        return 'bg-amber-100'
      case 'other':
        return 'bg-slate-100'
      default:
        return 'bg-white'
    }
  }

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        // Don't trigger edit if clicking on interactive elements
        const target = e.target as HTMLElement
        if (target.closest('button') || target.closest('input') || target.closest('form')) {
          return
        }
        onEdit()
      }}
      className={`${getCategoryBgColor()} rounded-xl border-[3px] border-slate-300 shadow-md hover:shadow-lg hover:border-slate-400 smooth-transition group cursor-pointer overflow-hidden ${
        isDragging ? 'opacity-50 scale-95 rotate-1' : ''
      } ${isCompleted ? 'opacity-75' : ''}`}
      style={{ 
        animationDelay: `${index * 0.05}s`
      }}
    >
      {/* Sophisticated Progress Indicator */}
      {subtasks.length > 0 && (
        <div className="h-1 bg-slate-200 relative overflow-hidden">
        <div 
            className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-orange-500 smooth-transition"
            style={{ width: `${isCompleted ? 100 : subtaskProgress}%` }}
        />
      </div>
      )}
      
      <div className="p-4 relative">
        <div className="flex items-start gap-2">
          {/* Priority Indicator Dot */}
          <div className={`flex-shrink-0 w-1 h-1 rounded-full mt-1 ${
            task.priority === 'urgent' ? 'bg-red-500' :
            task.priority === 'high' ? 'bg-orange-500' :
            task.priority === 'medium' ? 'bg-amber-500' :
            'bg-blue-500'
          }`} />
          
        <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className={`text-base font-bold mb-2 leading-tight text-slate-900 ${
              isCompleted ? "line-through text-slate-400" : ""
            }`}>
            {task.title}
          </h3>
            
            {/* Description */}
          {task.description && (
              <p className={`text-sm mb-3 leading-relaxed text-slate-600 line-clamp-2 ${
                isCompleted ? "line-through text-slate-400" : ""
              }`}>
              {truncateDescription(task.description)}
            </p>
          )}
            
            {/* Metadata Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
            {task.difficulty && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border-2 border-slate-300">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {difficultyLabels[task.difficulty]}
              </span>
            )}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border-2 ${
                task.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-300' :
                task.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                task.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                'bg-blue-50 text-blue-700 border-blue-300'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {task.priority}
            </span>
            {task.category && (
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border-2 border-blue-300">
                {task.category}
              </span>
            )}
          </div>
          
            {/* Date Information */}
          {(task.startDate || task.dueDate) && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
              {task.dueDate && (
                  <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border-2 font-semibold ${
                    daysRemaining !== null && daysRemaining < 0
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : daysRemaining !== null && daysRemaining <= 1
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-slate-50 text-slate-600 border-slate-300'
                  }`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                    <span>
                      {daysRemaining !== null && daysRemaining < 0
                        ? `${Math.abs(daysRemaining)}d overdue`
                        : daysRemaining === 0
                        ? 'Due today'
                        : daysRemaining === 1
                        ? 'Due tomorrow'
                        : `${daysRemaining}d left`}
                    </span>
                  </div>
              )}
              {subtasks.length > 0 && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 border-2 border-slate-300 font-semibold">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span>{completedSubtasks}/{subtasks.length}</span>
                  </div>
              )}
            </div>
          )}
          {!task.startDate && !task.dueDate && subtasks.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 border-2 border-slate-300 font-semibold">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span>{completedSubtasks}/{subtasks.length}</span>
                </div>
            </div>
          )}

            {/* Subtasks Preview */}
          {subtasks.length > 0 && (
            <div className="mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {subtasks.slice(0, 4).map((subtask, idx) => (
                  <div
                    key={subtask.id}
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border-2 ${
                      subtask.completed
                          ? "bg-emerald-500 border-emerald-600 text-white shadow-sm"
                          : "bg-slate-100 border-slate-300 text-slate-600"
                    }`}
                  >
                    {subtask.completed ? (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                ))}
                  {subtasks.length > 4 && (
                    <div className="px-2 py-1 rounded-md bg-slate-100 border-2 border-slate-300 text-slate-600 text-[10px] font-bold">
                      +{subtasks.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subtasks Toggle & List */}
            <div className="space-y-2 border-t-2 border-slate-300 pt-3 mt-3">
            {subtasks.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSubtasks(!showSubtasks)
                }}
                  className="text-xs font-bold text-slate-700 hover:text-slate-900 smooth-transition flex items-center gap-2 w-full"
              >
                  <span>Subtasks ({completedSubtasks}/{subtasks.length})</span>
                <svg
                    className={`w-3 h-3 smooth-transition ${showSubtasks ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
            {subtasks.length === 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSubtasks(!showSubtasks)
                }}
                  className="text-xs text-slate-500 hover:text-slate-700 smooth-transition flex items-center gap-2 font-bold"
              >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                <span>Add subtasks</span>
              </button>
            )}

            {showSubtasks && (
              <div className="space-y-1.5 pt-2 pl-4 border-l-2 border-slate-200">
                {subtasks.map((subtask) => (
                  <DraggableSubtask
                    key={subtask.id}
                    subtask={subtask}
                    taskId={task.id}
                    onToggleSubtask={onToggleSubtask}
                    onDeleteSubtask={onDeleteSubtask}
                  />
                ))}
                <form 
                  onSubmit={handleAddSubtask} 
                    className="flex items-center gap-2 pt-2 border-t border-slate-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    placeholder="Add subtask..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs rounded-md border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                      className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-md hover:shadow-md smooth-transition font-semibold"
                  >
                    Add
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
          
          {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 smooth-transition">
          {!isCompleted && (
        <button
          onClick={(e) => {
            e.stopPropagation()
                onStartFocus()
          }}
              className="text-blue-500 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 smooth-transition"
              title="Start Focus Session"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowDeleteModal(true)
          }}
            className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 smooth-transition"
            title="Delete Task"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false)
            }
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          
          {/* Modal Content */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 bg-white rounded-2xl border border-slate-200 shadow-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Task</h3>
                <p className="text-sm text-slate-600 mt-1">Are you sure you want to delete this task?</p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-slate-900">{task.title}</p>
              {task.description && (
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 smooth-transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete()
                  setShowDeleteModal(false)
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 smooth-transition shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getWeekDays(start: Date) {
  return Array.from({ length: 7 }, (_, idx) => {
    const day = new Date(start)
    day.setDate(start.getDate() + idx)
    return day
  })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
