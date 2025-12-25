'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { GanttProject, GanttTask, GanttSubtask } from '@jarvis/shared'
import { useGanttContext } from '@/contexts/GanttContext'
import { getWeekStart } from '@jarvis/shared'

// Constants
const ROW_HEIGHT = 40
const TREE_WIDTH = 300
const DAY_WIDTH = 100
const MONTH_VIEW_THRESHOLD = 35 // px per day; below this switch to month headers
const YEAR_VIEW_THRESHOLD = 10 // px per day; below this switch to year headers
const HEADER_HEIGHT = 60

// Helper functions
const getWeekStartDate = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date
  return getWeekStart(d)
}

const getDaysInWeek = (weekStart: Date): Date[] => {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(day.getDate() + i)
    days.push(day)
  }
  return days
}

// Build month segments for a given range of days from a start date
const getMonthsInRange = (rangeStart: Date, totalDays: number): { label: string; days: number }[] => {
  const months: { label: string; days: number }[] = []
  const start = new Date(rangeStart)
  start.setHours(0, 0, 0, 0) // Normalize to start of day
  const rangeEnd = new Date(start)
  rangeEnd.setDate(rangeEnd.getDate() + totalDays)

  let cursor = new Date(start)
  while (cursor < rangeEnd) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)
    const nextMonthStart = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    nextMonthStart.setHours(0, 0, 0, 0)

    const segmentStart = new Date(cursor)
    const segmentEnd = nextMonthStart < rangeEnd ? new Date(nextMonthStart) : new Date(rangeEnd)
    
    // Calculate exact day difference (inclusive)
    const diffTime = segmentEnd.getTime() - segmentStart.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    // For month segments, we want the exact number of days, not inclusive count
    // because we're measuring from start of segment to start of next segment
    const days = diffDays

    const label = segmentStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    months.push({ label, days })

    cursor = nextMonthStart
  }

  return months
}

// Build year segments for a given range of days from a start date
const getYearsInRange = (rangeStart: Date, totalDays: number): { label: string; startDate: Date; days: number }[] => {
  const years: { label: string; startDate: Date; days: number }[] = []
  const start = new Date(rangeStart)
  start.setHours(0, 0, 0, 0)
  const rangeEnd = new Date(start)
  rangeEnd.setDate(rangeEnd.getDate() + totalDays)
  
  let cursor = new Date(start)
  while (cursor < rangeEnd) {
    const yearStart = new Date(cursor.getFullYear(), 0, 1)
    yearStart.setHours(0, 0, 0, 0)
    const nextYearStart = new Date(cursor.getFullYear() + 1, 0, 1)
    nextYearStart.setHours(0, 0, 0, 0)
    
    const segmentStart = new Date(cursor)
    const segmentEnd = nextYearStart < rangeEnd ? new Date(nextYearStart) : new Date(rangeEnd)
    
    const diffTime = segmentEnd.getTime() - segmentStart.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    const label = segmentStart.getFullYear().toString()
    years.push({ label, startDate: new Date(segmentStart), days: diffDays })
    
    cursor = nextYearStart
  }
  
  return years
}

const formatDateString = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

const parseDateString = (dateStr: string): Date => {
  return new Date(dateStr + 'T00:00:00')
}

const getDatePosition = (date: string, weekStart: Date, dayWidth: number): number => {
  const dateObj = parseDateString(date)
  const weekStartObj = getWeekStartDate(weekStart)
  const diffDays = Math.floor((dateObj.getTime() - weekStartObj.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays * dayWidth
}

const getBarWidth = (startDate: string, endDate: string, dayWidth: number): number => {
  const start = parseDateString(startDate)
  const end = parseDateString(endDate)
  // Calculate the difference in days (inclusive of both start and end dates)
  // Use floor to get exact day count without rounding errors
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  // Add 1 because we want inclusive duration (start date to end date, both included)
  // For example: Mon to Sun = 7 days, not 6
  const days = Math.max(diffDays + 1, 1) // Ensure minimum 1 day width
  return days * dayWidth
}

const getDateFromPosition = (x: number, weekStart: Date, dayWidth: number): string => {
  const days = Math.round(x / dayWidth)
  const date = new Date(weekStart)
  date.setDate(date.getDate() + days)
  return formatDateString(date)
}

// Color palette for projects - distinct, vibrant colors
const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // violet
  '#22c55e', // emerald
  '#eab308', // yellow
  '#f43f5e', // rose
]

// Get a distinct color for a project based on its index
const getProjectColor = (index: number): string => {
  return PROJECT_COLORS[index % PROJECT_COLORS.length]
}

const getDefaultColor = (level: 'project' | 'task' | 'subtask'): string => {
  switch (level) {
    case 'project':
      return PROJECT_COLORS[0] // blue
    case 'task':
      return '#10b981' // green
    case 'subtask':
      return '#f59e0b' // amber
    default:
      return '#6b7280' // gray
  }
}

const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    className="w-4 h-4 text-slate-500 transition-transform duration-150"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
  >
    <path d="M7 5l6 5-6 5V5z" fill="currentColor" />
  </svg>
)

const IconEdit = () => (
  <svg className="w-4 h-4 text-slate-500 hover:text-slate-700 transition-colors" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3.5 14.5l1.086-.181 7.731-7.73-1.406-1.406-7.73 7.73L3.5 14.5zM12.5 4.3l1.2-1.2a1.2 1.2 0 011.7 0l1 1a1.2 1.2 0 010 1.7l-1.2 1.2-2.7-2.7z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconTrash = () => (
  <svg className="w-4 h-4 text-slate-500 hover:text-red-500 transition-colors" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.5 6.5h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M8 3.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path
      d="M6.5 6.5v9a1 1 0 001 1h5a1 1 0 001-1v-9"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// Convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

// Convert RGB to hex
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map((x) => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

// Lighten a color by a percentage (0-1)
const lightenColor = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  
  const r = Math.min(255, rgb.r + (255 - rgb.r) * percent)
  const g = Math.min(255, rgb.g + (255 - rgb.g) * percent)
  const b = Math.min(255, rgb.b + (255 - rgb.b) * percent)
  
  return rgbToHex(r, g, b)
}

// Darken a color by a percentage (0-1)
const darkenColor = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  
  const r = Math.max(0, rgb.r * (1 - percent))
  const g = Math.max(0, rgb.g * (1 - percent))
  const b = Math.max(0, rgb.b * (1 - percent))
  
  return rgbToHex(r, g, b)
}

// Generate task color from project color (lighter variation)
const getTaskColor = (projectColor: string): string => {
  // Lighten by 20% to make it distinct but related
  return lightenColor(projectColor, 0.2)
}

// Generate subtask color from project color (even lighter variation)
const getSubtaskColor = (projectColor: string): string => {
  // Lighten by 35% to make it more distinct from task but still related
  return lightenColor(projectColor, 0.35)
}

interface GanttRow {
  id: string
  type: 'project' | 'task' | 'subtask'
  name: string
  startDate: string
  endDate: string
  color?: string
  level: number
  parentId?: string
  projectId: string
  taskId?: string
  expanded?: boolean
  visible: boolean
}

export default function GanttChart({
  onNavigateToStories,
  onNavigateToGantt,
}: {
  onNavigateToStories?: () => void
  onNavigateToGantt?: () => void
} = {}) {
  const {
    projects,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    reorderProjects,
    reorderTasks,
    reorderSubtasks,
  } = useGanttContext()

  // View state
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()))
  const [dayWidth, setDayWidth] = useState(DAY_WIDTH)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  // Drag state
  const [draggedBarId, setDraggedBarId] = useState<string | null>(null)
  const [draggedBarType, setDraggedBarType] = useState<'project' | 'task' | 'subtask' | null>(null)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragOriginalStartDate, setDragOriginalStartDate] = useState<string | null>(null)
  const [dragOriginalEndDate, setDragOriginalEndDate] = useState<string | null>(null)
  const [hasDragged, setHasDragged] = useState(false)
  const [resizingBarId, setResizingBarId] = useState<string | null>(null)
  const [resizeSide, setResizeSide] = useState<'left' | 'right' | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartDate, setResizeStartDate] = useState<string | null>(null)
  const [hasResized, setHasResized] = useState(false)
  const resizeStartXRef = useRef<number>(0)

  // Reordering state
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null)
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null)

  const timelineRef = useRef<HTMLDivElement>(null)
  const treeRef = useRef<HTMLDivElement>(null)

  // Build flat list of rows for rendering
  const rows = useMemo((): GanttRow[] => {
    const result: GanttRow[] = []

    projects.forEach((project, projectIndex) => {
      const projectExpanded = expandedProjects.has(project.id)
      // Assign a distinct color based on project index if no color is set
      const projectColor = project.color || getProjectColor(projectIndex)

      result.push({
        id: project.id,
        type: 'project',
        name: project.name,
        startDate: project.startDate,
        endDate: project.endDate,
        color: projectColor,
        level: 0,
        projectId: project.id,
        expanded: projectExpanded,
        visible: true,
      })

      if (projectExpanded) {
        project.children.forEach((task) => {
          const taskExpanded = expandedTasks.has(task.id)
          // Use project color variation for tasks (unless task has explicit color)
          const taskColor = task.color || getTaskColor(projectColor)

          result.push({
            id: task.id,
            type: 'task',
            name: task.name,
            startDate: task.startDate,
            endDate: task.endDate,
            color: taskColor,
            level: 1,
            parentId: project.id,
            projectId: project.id,
            taskId: task.id,
            expanded: taskExpanded,
            visible: true,
          })

          if (taskExpanded) {
            task.children.forEach((subtask) => {
              // Use project color variation for subtasks (unless subtask has explicit color)
              const subtaskColor = subtask.color || getSubtaskColor(projectColor)
              
              result.push({
                id: subtask.id,
                type: 'subtask',
                name: subtask.name,
                startDate: subtask.startDate,
                endDate: subtask.endDate,
                color: subtaskColor,
                level: 2,
                parentId: task.id,
                projectId: project.id,
                taskId: task.id,
                visible: true,
              })
            })
          }
        })
      }
    })

    return result
  }, [projects, expandedProjects, expandedTasks])

  // Get weeks to display - show more weeks for better range
  const weeks = useMemo(() => {
    const weeks: Date[] = []
    const start = new Date(currentWeekStart)
    start.setDate(start.getDate() - 7) // Show 1 week before
    // Show 260 weeks (~5 years) for deep zoom-out ranges
    for (let i = 0; i < 260; i++) {
      const week = new Date(start)
      week.setDate(week.getDate() + i * 7)
      weeks.push(week)
    }
    return weeks
  }, [currentWeekStart])

  const isMonthView = useMemo(() => dayWidth <= MONTH_VIEW_THRESHOLD && dayWidth > YEAR_VIEW_THRESHOLD, [dayWidth])
  const isYearView = useMemo(() => dayWidth <= YEAR_VIEW_THRESHOLD, [dayWidth])

  // Get the first week start for positioning calculations
  const firstWeekStart = useMemo(() => {
    const start = new Date(currentWeekStart)
    start.setDate(start.getDate() - 7) // Show 1 week before
    return getWeekStartDate(start)
  }, [currentWeekStart])

  // Toggle expand/collapse
  const toggleExpand = useCallback((id: string, type: 'project' | 'task') => {
    if (type === 'project') {
      setExpandedProjects((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    } else {
      setExpandedTasks((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    }
  }, [])

  const expandAll = useCallback(() => {
    const allProjects = new Set(projects.map((p) => p.id))
    const allTasks = new Set(
      projects.flatMap((p) => p.children.map((t) => t.id))
    )
    setExpandedProjects(allProjects)
    setExpandedTasks(allTasks)
  }, [projects])

  const collapseAll = useCallback(() => {
    setExpandedProjects(new Set())
    setExpandedTasks(new Set())
  }, [])

  // Inline editing
  const startEditing = useCallback((row: GanttRow) => {
    setEditingId(row.id)
    setEditingValue(row.name)
  }, [])

  const saveEditing = useCallback(() => {
    if (!editingId || !editingValue.trim()) {
      setEditingId(null)
      return
    }

    const row = rows.find((r) => r.id === editingId)
    if (!row) {
      setEditingId(null)
      return
    }

    if (row.type === 'project') {
      updateProject(editingId, { name: editingValue.trim() })
    } else if (row.type === 'task') {
      const project = projects.find((p) => p.id === row.projectId)
      if (project) {
        updateTask(row.projectId, editingId, { name: editingValue.trim() })
      }
    } else if (row.type === 'subtask') {
      const project = projects.find((p) => p.id === row.projectId)
      if (project) {
        const task = project.children.find((t) => t.id === row.taskId)
        if (task) {
          updateSubtask(row.projectId, row.taskId!, editingId, { name: editingValue.trim() })
        }
      }
    }

    setEditingId(null)
    setEditingValue('')
  }, [editingId, editingValue, rows, projects, updateProject, updateTask, updateSubtask])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
    setEditingValue('')
  }, [])

  // Track newly created items for auto-editing
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null)

  useEffect(() => {
    if (newlyCreatedId) {
      const row = rows.find((r) => r.id === newlyCreatedId)
      if (row) {
        startEditing(row)
        setNewlyCreatedId(null)
      }
    }
  }, [newlyCreatedId, rows, startEditing])

  // Inline creation
  const handleAddProject = useCallback(() => {
    const newProject = addProject()
    setExpandedProjects((prev) => new Set([...prev, newProject.id]))
    setNewlyCreatedId(newProject.id)
  }, [addProject])

  const handleAddTask = useCallback((projectId: string) => {
    const newTask = addTask(projectId)
    setExpandedProjects((prev) => new Set([...prev, projectId]))
    setExpandedTasks((prev) => new Set([...prev, newTask.id]))
    setNewlyCreatedId(newTask.id)
  }, [addTask])

  const handleAddSubtask = useCallback((projectId: string, taskId: string) => {
    const newSubtask = addSubtask(projectId, taskId)
    setExpandedProjects((prev) => new Set([...prev, projectId]))
    setExpandedTasks((prev) => new Set([...prev, taskId]))
    setNewlyCreatedId(newSubtask.id)
  }, [addSubtask])

  // Delete
  const handleDelete = useCallback((row: GanttRow) => {
    if (!confirm(`Delete ${row.type} "${row.name}"?`)) {
      return
    }

    if (row.type === 'project') {
      deleteProject(row.id)
    } else if (row.type === 'task') {
      deleteTask(row.projectId, row.id)
    } else if (row.type === 'subtask') {
      deleteSubtask(row.projectId, row.taskId!, row.id)
    }
  }, [deleteProject, deleteTask, deleteSubtask])

  // Bar dragging
  const handleBarMouseDown = useCallback((
    e: React.MouseEvent,
    row: GanttRow,
    side?: 'left' | 'right'
  ) => {
    e.preventDefault()
    e.stopPropagation()

    if (side) {
      // Resize
      e.preventDefault()
      e.stopPropagation()
      setResizingBarId(row.id)
      setResizeSide(side)
      const rect = timelineRef.current?.getBoundingClientRect()
      let startX = 0
      if (rect && timelineRef.current) {
        // Account for scroll position
        startX = e.clientX - rect.left + timelineRef.current.scrollLeft
      } else {
        startX = e.clientX
      }
      setResizeStartX(startX)
      resizeStartXRef.current = startX
      setResizeStartDate(side === 'left' ? row.startDate : row.endDate)
      setHasResized(false)
    } else {
      // Drag
      setDraggedBarId(row.id)
      setDraggedBarType(row.type)
      setHasDragged(false)
      const rect = timelineRef.current?.getBoundingClientRect()
      if (rect && timelineRef.current) {
        // Account for scroll position
        const x = e.clientX - rect.left + timelineRef.current.scrollLeft
        setDragStartX(x)
      } else {
        setDragStartX(e.clientX)
      }
      setDragOriginalStartDate(row.startDate)
      setDragOriginalEndDate(row.endDate)
    }
  }, [])

  useEffect(() => {
    if (!draggedBarId || !dragOriginalStartDate || !dragOriginalEndDate) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return

      const rect = timelineRef.current.getBoundingClientRect()
      // Account for scroll position to get accurate position in scrolled timeline
      const currentX = e.clientX - rect.left + timelineRef.current.scrollLeft
      const diffX = currentX - dragStartX
      
      // Only update if moved more than 3 pixels (to prevent updates on simple clicks)
      if (Math.abs(diffX) < 3 && !hasDragged) {
        return
      }
      
      setHasDragged(true)
      const diffDays = Math.round(diffX / dayWidth)

      // Calculate new dates based on the first week start
      const firstWeek = new Date(currentWeekStart)
      firstWeek.setDate(firstWeek.getDate() - 7)
      const firstWeekStartDate = getWeekStartDate(firstWeek)
      const newDate = getDateFromPosition(currentX, firstWeekStartDate, dayWidth)
      const newDateObj = parseDateString(newDate)
      
      const originalStart = parseDateString(dragOriginalStartDate)
      const originalEnd = parseDateString(dragOriginalEndDate)
      const duration = Math.max(1, Math.ceil((originalEnd.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24)))
      
      // Allow single-day duration (end = start)
      const updatedStart = new Date(newDateObj)
      const updatedEnd = new Date(newDateObj)
      updatedEnd.setDate(updatedEnd.getDate() + duration - 1) // inclusive

      const newStartStr = formatDateString(updatedStart)
      const newEndStr = formatDateString(updatedEnd)

      const row = rows.find((r) => r.id === draggedBarId)
      if (!row) return

      if (row.type === 'project') {
        updateProject(row.id, { startDate: newStartStr, endDate: newEndStr })
      } else if (row.type === 'task') {
        updateTask(row.projectId, row.id, { startDate: newStartStr, endDate: newEndStr })
      } else if (row.type === 'subtask') {
        updateSubtask(row.projectId, row.taskId!, row.id, { startDate: newStartStr, endDate: newEndStr })
      }
    }

    const handleMouseUp = () => {
      setDraggedBarId(null)
      setDraggedBarType(null)
      setDragStartX(0)
      setDragOriginalStartDate(null)
      setDragOriginalEndDate(null)
      setHasDragged(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggedBarId, dragStartX, dragOriginalStartDate, dragOriginalEndDate, hasDragged, currentWeekStart, dayWidth, rows, updateProject, updateTask, updateSubtask])

  // Bar resizing
  useEffect(() => {
    if (!resizingBarId || !resizeSide || !resizeStartDate) {
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      if (!timelineRef.current) return

      const rect = timelineRef.current.getBoundingClientRect()
      // Account for scroll position to get accurate position in scrolled timeline
      const currentX = e.clientX - rect.left + timelineRef.current.scrollLeft
      const startX = resizeStartXRef.current
      
      // Always update on mouse move when resizing
      setHasResized(true)
      
      // Get the date at the current mouse position (use first week start for consistency)
      const firstWeek = new Date(currentWeekStart)
      firstWeek.setDate(firstWeek.getDate() - 7)
      const firstWeekStartDate = getWeekStartDate(firstWeek)
      const newDate = getDateFromPosition(currentX, firstWeekStartDate, dayWidth)

      const row = rows.find((r) => r.id === resizingBarId)
      if (!row) return

      // Allow single-day duration when resizing
      const currentStart = parseDateString(row.startDate)
      const currentEnd = parseDateString(row.endDate)
      
      if (resizeSide === 'left') {
        // When resizing left edge, allow same-day duration (end == start)
        const newStart = parseDateString(newDate)
        const maxStart = new Date(currentEnd) // allow same-day
        
        if (newStart > maxStart) {
          // If new start would invert duration, clamp it
          const clampedDate = formatDateString(maxStart)
          if (row.type === 'project') {
            updateProject(row.id, { startDate: clampedDate })
          } else if (row.type === 'task') {
            updateTask(row.projectId, row.id, { startDate: clampedDate })
          } else if (row.type === 'subtask') {
            updateSubtask(row.projectId, row.taskId!, row.id, { startDate: clampedDate })
          }
        } else {
          // Normal resize
          if (row.type === 'project') {
            updateProject(row.id, { startDate: newDate })
          } else if (row.type === 'task') {
            updateTask(row.projectId, row.id, { startDate: newDate })
          } else if (row.type === 'subtask') {
            updateSubtask(row.projectId, row.taskId!, row.id, { startDate: newDate })
          }
        }
      } else {
        // When resizing right edge, allow same-day duration (end == start)
        const newEnd = parseDateString(newDate)
        const minEnd = new Date(currentStart) // allow same-day
        
        if (newEnd < minEnd) {
          // If new end would invert duration, clamp it
          const clampedDate = formatDateString(minEnd)
          if (row.type === 'project') {
            updateProject(row.id, { endDate: clampedDate })
          } else if (row.type === 'task') {
            updateTask(row.projectId, row.id, { endDate: clampedDate })
          } else if (row.type === 'subtask') {
            updateSubtask(row.projectId, row.taskId!, row.id, { endDate: clampedDate })
          }
        } else {
          // Normal resize
          if (row.type === 'project') {
            updateProject(row.id, { endDate: newDate })
          } else if (row.type === 'task') {
            updateTask(row.projectId, row.id, { endDate: newDate })
          } else if (row.type === 'subtask') {
            updateSubtask(row.projectId, row.taskId!, row.id, { endDate: newDate })
          }
        }
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setResizingBarId(null)
      setResizeSide(null)
      setResizeStartX(0)
      resizeStartXRef.current = 0
      setResizeStartDate(null)
      setHasResized(false)
    }

    // Use capture phase to ensure we catch the events
    document.addEventListener('mousemove', handleMouseMove, { capture: true, passive: false })
    document.addEventListener('mouseup', handleMouseUp, { capture: true, passive: false })

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true })
      document.removeEventListener('mouseup', handleMouseUp, { capture: true })
    }
  }, [resizingBarId, resizeSide, resizeStartDate, currentWeekStart, dayWidth, rows, updateProject, updateTask, updateSubtask, firstWeekStart])

  // Row reordering
  const handleRowDragStart = useCallback((e: React.DragEvent, row: GanttRow) => {
    setDraggedRowId(row.id)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleRowDragOver = useCallback((e: React.DragEvent, row: GanttRow) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedRowId || draggedRowId === row.id) return

    // Validate hierarchy
    const draggedRow = rows.find((r) => r.id === draggedRowId)
    if (!draggedRow) return

    // Only allow reordering at the same level and type
    if (draggedRow.type !== row.type) return
    if (draggedRow.level !== row.level) return
    if (draggedRow.type === 'task' && draggedRow.projectId !== row.projectId) return
    if (draggedRow.type === 'subtask' && draggedRow.taskId !== row.taskId) return

    setDragOverRowId(row.id)
  }, [draggedRowId, rows])

  const handleRowDrop = useCallback((e: React.DragEvent, targetRow: GanttRow) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedRowId || draggedRowId === targetRow.id) {
      setDraggedRowId(null)
      setDragOverRowId(null)
      return
    }

    const draggedRow = rows.find((r) => r.id === draggedRowId)
    if (!draggedRow) {
      setDraggedRowId(null)
      setDragOverRowId(null)
      return
    }

    // Validate hierarchy
    if (draggedRow.type !== targetRow.type || draggedRow.level !== targetRow.level) {
      setDraggedRowId(null)
      setDragOverRowId(null)
      return
    }

    const draggedIndex = rows.findIndex((r) => r.id === draggedRowId)
    const targetIndex = rows.findIndex((r) => r.id === targetRow.id)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedRowId(null)
      setDragOverRowId(null)
      return
    }

    // Reorder
    if (draggedRow.type === 'project') {
      reorderProjects(draggedIndex, targetIndex)
    } else if (draggedRow.type === 'task') {
      if (draggedRow.projectId === targetRow.projectId) {
        const project = projects.find((p) => p.id === draggedRow.projectId)
        if (project) {
          const taskIndex = project.children.findIndex((t) => t.id === draggedRowId)
          const targetTaskIndex = project.children.findIndex((t) => t.id === targetRow.id)
          if (taskIndex !== -1 && targetTaskIndex !== -1) {
            reorderTasks(draggedRow.projectId, taskIndex, targetTaskIndex)
          }
        }
      }
    } else if (draggedRow.type === 'subtask') {
      if (draggedRow.taskId === targetRow.taskId) {
        const project = projects.find((p) => p.id === draggedRow.projectId)
        if (project) {
          const task = project.children.find((t) => t.id === draggedRow.taskId)
          if (task) {
            const subtaskIndex = task.children.findIndex((st) => st.id === draggedRowId)
            const targetSubtaskIndex = task.children.findIndex((st) => st.id === targetRow.id)
            if (subtaskIndex !== -1 && targetSubtaskIndex !== -1) {
              reorderSubtasks(draggedRow.projectId, draggedRow.taskId!, subtaskIndex, targetSubtaskIndex)
            }
          }
        }
      }
    }

    setDraggedRowId(null)
    setDragOverRowId(null)
  }, [draggedRowId, rows, projects, reorderProjects, reorderTasks, reorderSubtasks])

  const handleRowDragEnd = useCallback(() => {
    setDraggedRowId(null)
    setDragOverRowId(null)
  }, [])

  // Navigation
  const handlePreviousWeek = useCallback(() => {
    setCurrentWeekStart((prev) => {
      const next = new Date(prev)
      next.setDate(next.getDate() - 7)
      return next
    })
  }, [])

  const handleNextWeek = useCallback(() => {
    setCurrentWeekStart((prev) => {
      const next = new Date(prev)
      next.setDate(next.getDate() + 7)
      return next
    })
  }, [])

  const handleToday = useCallback(() => {
    setCurrentWeekStart(getWeekStart(new Date()))
  }, [])

  const handleZoomIn = useCallback(() => {
    setDayWidth((prev) => Math.min(prev * 1.2, 200))
  }, [])

  const handleZoomOut = useCallback(() => {
    setDayWidth((prev) => Math.max(prev / 1.2, 1)) // allow even more zoom out
  }, [])

  const controlBtn = 'px-3 py-1.5 text-sm font-medium text-slate-700 bg-white/90 border border-slate-200 rounded-full shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150'
  const primaryBtn = 'px-4 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150'

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md flex items-center justify-center text-white font-semibold">G</div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-0">Project Management</p>
              <h1 className="text-xl font-semibold text-slate-900 mt-0 leading-tight">Gantt Chart</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={expandAll}
              className={controlBtn}
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className={controlBtn}
            >
              Collapse All
            </button>
            <div className="w-px h-6 bg-slate-300" />
            <button
              onClick={handleZoomOut}
              className={controlBtn}
            >
              Zoom Out
            </button>
            <button
              onClick={handleZoomIn}
              className={controlBtn}
            >
              Zoom In
            </button>
            <div className="w-px h-6 bg-slate-300" />
            <button
              onClick={handlePreviousWeek}
              className={controlBtn}
            >
              ←
            </button>
            <button
              onClick={handleToday}
              className={controlBtn}
            >
              Today
            </button>
            <button
              onClick={handleNextWeek}
              className={controlBtn}
            >
              →
            </button>
            <button
              onClick={handleAddProject}
              className={primaryBtn}
            >
              + Add Project
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Tree List (Left) */}
        <div
          ref={treeRef}
          className="border-r border-slate-200 bg-white/95 backdrop-blur-sm overflow-y-auto custom-scrollbar flex-shrink-0 shadow-sm"
          style={{ width: TREE_WIDTH }}
        >
          <div className="sticky top-0 bg-white/95 border-b border-slate-200 z-10 px-4 font-semibold text-slate-800 flex items-center tracking-wide" style={{ height: HEADER_HEIGHT }}>
            Projects & Tasks
          </div>
          {rows.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <div className="text-center">
                <p className="text-sm">No projects yet</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateRows: `repeat(${rows.length}, ${ROW_HEIGHT}px)` }}>
              {rows.map((row, rowIndex) => (
              <div
                key={row.id}
                draggable={true}
                onDragStart={(e) => handleRowDragStart(e, row)}
                onDragOver={(e) => handleRowDragOver(e, row)}
                onDrop={(e) => handleRowDrop(e, row)}
                onDragEnd={handleRowDragEnd}
                className={`
                  group flex items-center gap-2 border-b border-slate-100 hover:bg-slate-50/80 cursor-move
                  ${draggedRowId === row.id ? 'opacity-50' : ''}
                  ${dragOverRowId === row.id ? 'bg-blue-50/80 border-blue-200' : ''}
                `}
                style={{
                  gridRow: rowIndex + 1,
                  height: `${ROW_HEIGHT}px`,
                  paddingLeft: `${16 + row.level * 20}px`,
                  paddingRight: '16px',
                }}
              >
                {/* Expand/Collapse */}
                {row.type !== 'subtask' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpand(row.id, row.type)
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
                    aria-label={row.expanded ? 'Collapse' : 'Expand'}
                  >
                    <IconChevron open={!!row.expanded} />
                  </button>
                )}
                {row.type === 'subtask' && <div className="w-5" />}

                {/* Name */}
                {editingId === row.id ? (
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={saveEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveEditing()
                      } else if (e.key === 'Escape') {
                        cancelEditing()
                      }
                    }}
                    autoFocus
                    className="flex-1 px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span
                      className="flex-1 text-sm text-slate-800 font-medium cursor-text"
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        startEditing(row)
                      }}
                    >
                      {row.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        startEditing(row)
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <IconEdit />
                    </button>
                  </>
                )}

                {/* Add buttons */}
                {row.type === 'project' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddTask(row.projectId)
                    }}
                    className="px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded transition-all opacity-0 group-hover:opacity-100"
                    title="Add Task"
                  >
                    + Task
                  </button>
                )}
                {row.type === 'task' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddSubtask(row.projectId, row.taskId!)
                    }}
                    className="px-2 py-0.5 text-xs text-green-600 hover:bg-green-50 rounded transition-all opacity-0 group-hover:opacity-100"
                    title="Add Subtask"
                  >
                    + Subtask
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(row)
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <IconTrash />
                </button>
              </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline (Right) */}
        <div ref={timelineRef} className="flex-1 overflow-auto custom-scrollbar bg-slate-50">
          {/* Timeline Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 z-20" style={{ height: HEADER_HEIGHT }}>
            <div className="flex" style={{ paddingLeft: 0 }}>
              {isYearView ? (
                (() => {
                  const firstWeek = new Date(currentWeekStart)
                  firstWeek.setDate(firstWeek.getDate() - 7)
                  const firstWeekStartDate = getWeekStartDate(firstWeek)
                  const totalDays = weeks.length * 7
                  const years = getYearsInRange(firstWeekStartDate, totalDays)
                  
                  return years.map((year, idx) => {
                    // Calculate actual months within the year segment
                    const yearStart = new Date(year.startDate)
                    yearStart.setHours(0, 0, 0, 0)
                    const yearEnd = new Date(yearStart)
                    yearEnd.setDate(yearEnd.getDate() + year.days)
                    
                    const months: { label: string; days: number }[] = []
                    let monthCursor = new Date(yearStart)
                    
                    while (monthCursor < yearEnd) {
                      // Use the actual cursor position, not the first of the month
                      const segmentStart = new Date(monthCursor)
                      const nextMonthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)
                      nextMonthStart.setHours(0, 0, 0, 0)
                      
                      const segmentEnd = nextMonthStart < yearEnd ? new Date(nextMonthStart) : new Date(yearEnd)
                      
                      const diffTime = segmentEnd.getTime() - segmentStart.getTime()
                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                      
                      // Only add month if it has at least 1 day
                      if (diffDays > 0) {
                        const label = segmentStart.toLocaleDateString('en-US', { month: 'short' })
                        months.push({ label, days: diffDays })
                      }
                      
                      monthCursor = nextMonthStart
                    }
                    
                    return (
                      <div
                        key={idx}
                        className="border-r border-slate-200"
                        style={{ width: year.days * dayWidth }}
                      >
                        <div className="text-xs font-semibold text-slate-600 px-2 py-1 border-b border-slate-200">
                          {year.label}
                        </div>
                        <div className="flex">
                          {months.map((month, monthIdx) => (
                            <div
                              key={monthIdx}
                              className="border-r border-slate-100"
                              style={{ width: (month.days * dayWidth) }}
                            >
                              <div className="text-xs text-slate-400 px-1 py-1 text-center">
                                {month.label}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                })()
              ) : isMonthView ? (
                (() => {
                  const firstWeek = new Date(currentWeekStart)
                  firstWeek.setDate(firstWeek.getDate() - 7)
                  const firstWeekStartDate = getWeekStartDate(firstWeek)
                  const totalDays = weeks.length * 7
                  
                  // Build month segments with 4 week sections each
                  const months: { label: string; startDate: Date; days: number }[] = []
                  let cursor = new Date(firstWeekStartDate)
                  cursor.setHours(0, 0, 0, 0)
                  const rangeEnd = new Date(cursor)
                  rangeEnd.setDate(rangeEnd.getDate() + totalDays)
                  
                  while (cursor < rangeEnd) {
                    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
                    monthStart.setHours(0, 0, 0, 0)
                    const nextMonthStart = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
                    nextMonthStart.setHours(0, 0, 0, 0)
                    
                    const segmentStart = new Date(cursor)
                    const segmentEnd = nextMonthStart < rangeEnd ? new Date(nextMonthStart) : new Date(rangeEnd)
                    
                    const diffTime = segmentEnd.getTime() - segmentStart.getTime()
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                    
                    const label = segmentStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    months.push({ label, startDate: new Date(segmentStart), days: diffDays })
                    
                    cursor = nextMonthStart
                  }
                  
                  return months.map((month, idx) => {
                    // Divide month into 4 week sections
                    const weeksInMonth = Math.ceil(month.days / 7)
                    const sectionWidth = (month.days / 4) * dayWidth
                    
                    return (
                      <div
                        key={idx}
                        className="border-r border-slate-200"
                        style={{ width: month.days * dayWidth }}
                      >
                        <div className="text-xs font-semibold text-slate-600 px-2 py-1 border-b border-slate-200">
                          {month.label}
                        </div>
                        <div className="flex">
                          {Array.from({ length: 4 }, (_, weekIdx) => {
                            const weekStart = new Date(month.startDate)
                            weekStart.setDate(weekStart.getDate() + weekIdx * 7)
                            const weekDays = Math.min(7, month.days - weekIdx * 7)
                            return (
                              <div
                                key={weekIdx}
                                className="border-r border-slate-100"
                                style={{ width: (weekDays * dayWidth) }}
                              >
                                <div className="text-xs text-slate-400 px-1 py-1 text-center">
                                  W{weekIdx + 1}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                })()
              ) : (
                weeks.map((weekStart, weekIndex) => {
                  const days = getDaysInWeek(weekStart)
                  return (
                    <div
                      key={weekIndex}
                      className="border-r border-slate-200"
                      style={{ width: dayWidth * 7 }}
                    >
                      <div className="text-xs font-semibold text-slate-600 px-2 py-1 border-b border-slate-200">
                        Week {weekIndex + 1}
                      </div>
                      <div className="flex">
                        {days.map((day, dayIndex) => (
                          <div
                            key={dayIndex}
                            className="text-xs text-slate-500 px-1 py-1 border-r border-slate-100 text-center"
                            style={{ width: dayWidth }}
                          >
                            <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            <div className="font-medium">{day.getDate()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Timeline Rows */}
          {rows.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">No projects yet</p>
                <p className="text-sm">Click "Add Project" to get started</p>
              </div>
            </div>
          ) : (
            <div
              className="relative"
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(${rows.length}, ${ROW_HEIGHT}px)`,
                width: `${weeks.length * 7 * dayWidth}px`, // Full timeline width
                minWidth: '100%', // Ensure it's at least viewport width
                backgroundImage: `repeating-linear-gradient(to right,
                  rgba(148, 163, 184, 0.25),
                  rgba(148, 163, 184, 0.25) 1px,
                  transparent 1px,
                  transparent ${dayWidth}px
                )`,
                backgroundSize: `${dayWidth}px 1px`,
                backgroundRepeat: 'repeat',
              }}
            >
              {rows.map((row, rowIndex) => {
              // Validate dates before calculating position
              let startDate = row.startDate
              let endDate = row.endDate
              
              // Ensure dates are valid
              const startDateObj = startDate ? new Date(startDate + 'T00:00:00') : null
              const endDateObj = endDate ? new Date(endDate + 'T00:00:00') : null
              
              if (!startDate || !endDate || !startDateObj || !endDateObj || 
                  isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                // Use current week start as fallback to ensure visibility
                const weekStart = getWeekStartDate(currentWeekStart)
                startDate = formatDateString(weekStart)
                const nextDay = new Date(weekStart)
                nextDay.setDate(nextDay.getDate() + 1)
                endDate = formatDateString(nextDay)
              }
              
              const startPos = getDatePosition(startDate, firstWeekStart, dayWidth)
              const barWidth = getBarWidth(startDate, endDate, dayWidth)
              const isDragging = draggedBarId === row.id
              const isResizing = resizingBarId === row.id
              
              // Ensure bar is visible even if partially off-screen
              // Always show at least a small portion of the bar
              const visibleLeft = Math.max(startPos, -barWidth + 10) // Show at least 10px of the bar
              const visibleWidth = startPos < 0 
                ? Math.max(barWidth + startPos - 10, 20) // Ensure minimum 20px visible width
                : Math.max(barWidth, 20) // Ensure minimum 20px width

              return (
                <div
                  key={row.id}
                  className="relative border-b border-slate-100"
                  style={{ 
                    gridRow: rowIndex + 1,
                    height: `${ROW_HEIGHT}px`,
                  }}
                >
                  <div className="absolute inset-0 flex items-center">
                    {/* Bar */}
                    {/* Resize handle - left */}
                    <div
                      className="absolute cursor-ew-resize z-50"
                      style={{ 
                        top: '4px',
                        bottom: '4px',
                        left: `${Math.max(visibleLeft - 4, 0)}px`,
                        width: '12px',
                        background: isResizing && resizeSide === 'left' 
                          ? 'rgba(59, 130, 246, 0.5)' 
                          : 'rgba(59, 130, 246, 0.15)',
                        borderLeft: '3px solid rgba(59, 130, 246, 0.8)',
                        borderRadius: '4px 0 0 4px',
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleBarMouseDown(e, row, 'left')
                      }}
                      onMouseEnter={(e) => {
                        if (!(isResizing && resizeSide === 'left')) {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!(isResizing && resizeSide === 'left')) {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'
                        }
                      }}
                      title="Drag to resize start date"
                    />
                    
                    {/* Bar - Always render */}
                    <div
                      className={`
                        absolute rounded cursor-move
                        ${isDragging || isResizing ? 'opacity-75 z-30' : 'hover:opacity-90 z-10'}
                      `}
                      style={{
                        top: '4px',
                        bottom: '4px',
                        left: `${Math.max(visibleLeft, 0)}px`,
                        width: `${Math.max(visibleWidth, 20)}px`,
                        minWidth: '20px',
                        backgroundColor: row.color || getDefaultColor(row.type),
                        border: `1px solid ${row.color || getDefaultColor(row.type)}`,
                        boxShadow: isDragging || isResizing ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                      onMouseDown={(e) => {
                        // Only handle drag if not clicking on resize handles
                        const target = e.target as HTMLElement
                        if (!target.classList.contains('resize-handle') && !target.closest('.resize-handle')) {
                          handleBarMouseDown(e, row)
                        }
                      }}
                    />
                    
                    {/* Resize handle - right */}
                    <div
                      className="absolute inset-y-2 cursor-ew-resize z-50"
                      style={{ 
                        left: `${visibleLeft + Math.max(visibleWidth, 20) - 8}px`,
                        width: '12px',
                        background: isResizing && resizeSide === 'right' 
                          ? 'rgba(59, 130, 246, 0.5)' 
                          : 'rgba(59, 130, 246, 0.15)',
                        borderRight: '3px solid rgba(59, 130, 246, 0.8)',
                        borderRadius: '0 4px 4px 0',
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleBarMouseDown(e, row, 'right')
                      }}
                      onMouseEnter={(e) => {
                        if (!(isResizing && resizeSide === 'right')) {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!(isResizing && resizeSide === 'right')) {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'
                        }
                      }}
                      title="Drag to resize end date"
                    />
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

