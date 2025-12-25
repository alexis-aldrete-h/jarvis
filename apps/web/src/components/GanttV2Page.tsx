'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useGanttContext } from '@/contexts/GanttContext'
import { GanttProject, GanttTask, GanttSubtask } from '@jarvis/shared'

type ZoomLevel = 'daily' | 'monthly' | 'yearly'

interface GanttRow {
  id: string
  type: 'project' | 'task' | 'subtask'
  name: string
  startDate: string
  endDate: string
  level: number
  projectId: string
  taskId?: string
  parentId?: string
  expanded?: boolean
  visible: boolean
  data: GanttProject | GanttTask | GanttSubtask
}

const TREE_WIDTH = 300
const ROW_HEIGHT = 32
const HEADER_HEIGHT = 60

// Color palette
const PROJECT_COLOR = '#6b7280' // gray
const TASK_COLOR = '#3b82f6' // blue
const SUBTASK_COLOR = '#8b5cf6' // purple

// Helper functions
const parseDateString = (dateStr: string): Date => {
  if (!dateStr || dateStr.trim() === '') {
    return new Date()
  }
  // Handle YYYY-MM-DD format - parse in local timezone to avoid UTC conversion issues
  const dateString = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim()
  
  // Validate date string format (should be YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    console.warn('Invalid date format in GanttV2:', dateString)
    return new Date()
  }
  
  // Create date in local timezone to avoid UTC conversion issues
  const parts = dateString.split('-')
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  
  // Validate parsed values
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    console.warn('Invalid date values in GanttV2:', { year, month, day, dateString })
    return new Date()
  }
  
  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0) // Ensure it's exactly midnight
  
  // Validate the date object
  if (isNaN(date.getTime())) {
    console.warn('Invalid date object created in GanttV2:', { year, month, day, dateString })
    return new Date()
  }
  
  return date
}

const formatDateString = (date: Date): string => {
  // Format as YYYY-MM-DD in local timezone (not UTC) to avoid timezone conversion issues
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDaysBetween = (start: Date, end: Date): number => {
  // Normalize both dates to midnight in local timezone
  const startNormalized = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  startNormalized.setHours(0, 0, 0, 0)
  const endNormalized = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  endNormalized.setHours(0, 0, 0, 0)
  const diffTime = endNormalized.getTime() - startNormalized.getTime()
  // Use Math.round for more accurate calculation
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday as first day
  return new Date(d.setDate(diff))
}

const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

const getStartOfYear = (date: Date): Date => {
  return new Date(date.getFullYear(), 0, 1)
}

// Calculate timeline range from all projects
const calculateTimelineRange = (rows: GanttRow[], zoom: ZoomLevel): { start: Date; end: Date } => {
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Normalize to midnight
  let minDate: Date | null = null
  let maxDate: Date | null = null

  // Find min/max dates from rows
  rows.forEach(row => {
    if (row.startDate && row.endDate) {
      try {
        const start = parseDateString(row.startDate)
        const end = parseDateString(row.endDate)
        
        // Validate dates are reasonable (not before 1900 or after 2100)
        if (start.getFullYear() >= 1900 && start.getFullYear() <= 2100) {
          if (!minDate || start < minDate) minDate = start
        }
        if (end.getFullYear() >= 1900 && end.getFullYear() <= 2100) {
          if (!maxDate || end > maxDate) maxDate = end
        }
      } catch (e) {
        // Skip invalid dates
        console.warn('Invalid date:', row.startDate, row.endDate)
      }
    }
  })

  // Always start from today (current date) and allow scrolling
  // Calculate buffer based on zoom level and project dates
  let bufferBefore: number
  let bufferAfter: number
  
  if (zoom === 'yearly') {
    bufferBefore = 365 * 2 // 2 years before today
    bufferAfter = 365 * 3  // 3 years after today
  } else if (zoom === 'monthly') {
    bufferBefore = 180 // ~6 months before today
    bufferAfter = 365  // ~1 year after today
  } else { // daily
    bufferBefore = 30  // ~1 month before today
    bufferAfter = 90   // ~3 months after today
  }
  
  // If we have project dates, ensure we include them with some buffer
  if (minDate && maxDate) {
    // Calculate how far back/forward we need to go to include all projects
    const daysBeforeToday = getDaysBetween(minDate, now)
    const daysAfterToday = getDaysBetween(now, maxDate)
    
    // Use the larger of: buffer or actual project range + small buffer
    bufferBefore = Math.max(bufferBefore, daysBeforeToday + 30)
    bufferAfter = Math.max(bufferAfter, daysAfterToday + 30)
  }
  
  // Start from today minus buffer, end at today plus buffer
  const start = new Date(now)
  start.setDate(start.getDate() - bufferBefore)
  
  const end = new Date(now)
  end.setDate(end.getDate() + bufferAfter)
  
  return { start, end }
}

// Generate time units based on zoom level
const generateTimeUnits = (start: Date, end: Date, zoom: ZoomLevel): Array<{ date: Date; label: string; width: number; isWeekStart?: boolean; weekNumber?: number; isMonthStart?: boolean; monthLabel?: string; isYearStart?: boolean; yearLabel?: string }> => {
  const units: Array<{ date: Date; label: string; width: number; isWeekStart?: boolean; weekNumber?: number; isMonthStart?: boolean; monthLabel?: string; isYearStart?: boolean; yearLabel?: string }> = []
  
  if (zoom === 'yearly') {
    // For yearly view, generate months organized by years
    let current = getStartOfMonth(start)
    let lastYear = -1
    
    while (current <= end) {
      const monthStart = new Date(current)
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1)
      const monthEnd = new Date(nextMonth.getTime() - 1)
      monthEnd.setHours(23, 59, 59, 999)
      
      // Check if this month overlaps with our date range
      if (monthEnd < start) {
        current = nextMonth
        continue
      }
      
      const currentYear = current.getFullYear()
      const isFirstMonthOfYear = currentYear !== lastYear || current.getMonth() === 0
      lastYear = currentYear
      
      // Get month and year labels
      const monthLabel = current.toLocaleDateString('en-US', { month: 'short' })
      const yearLabel = currentYear.toString()
      
      const days = getDaysBetween(current, monthEnd > end ? end : monthEnd) + 1
      
      units.push({
        date: new Date(current),
        label: monthLabel,
        width: days,
        isMonthStart: true,
        isYearStart: isFirstMonthOfYear,
        yearLabel: isFirstMonthOfYear ? yearLabel : undefined,
      })
      
      current = nextMonth
    }
  } else if (zoom === 'monthly') {
    // For monthly view, generate weeks organized by months
    let current = getStartOfWeek(getStartOfMonth(start)) // Start from the beginning of the week containing the first day of the month
    current.setHours(0, 0, 0, 0)
    
    // Helper function to calculate week number for a given date
    const calculateWeekNumber = (date: Date): number => {
      const year = date.getFullYear()
      const firstDayOfYear = new Date(year, 0, 1)
      const firstWeekStart = getStartOfWeek(firstDayOfYear)
      const daysDiff = getDaysBetween(firstWeekStart, date)
      const weekNum = Math.floor(daysDiff / 7) + 1
      const weekMonday = getStartOfWeek(date)
      const weekMondayYear = weekMonday.getFullYear()
      
      if (weekMondayYear !== year) {
        const firstDayOfWeekYear = new Date(weekMondayYear, 0, 1)
        const firstWeekStartOfWeekYear = getStartOfWeek(firstDayOfWeekYear)
        const daysDiffForWeekYear = getDaysBetween(firstWeekStartOfWeekYear, weekMonday)
        return Math.floor(daysDiffForWeekYear / 7) + 1
      }
      
      return weekNum
    }
    
    let lastMonth = -1
    
    while (current <= end) {
      const weekStart = new Date(current)
      const weekEnd = new Date(current)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
      
      // Check if this week overlaps with our date range
      if (weekEnd < start) {
        current.setDate(current.getDate() + 7)
        continue
      }
      
      const weekNumber = calculateWeekNumber(current)
      const currentMonth = current.getMonth()
      const currentYear = current.getFullYear()
      
      // Check if this is the start of a new month
      const monthStart = getStartOfMonth(current)
      const isFirstWeekOfMonth = currentMonth !== lastMonth || getDaysBetween(monthStart, current) < 7
      lastMonth = currentMonth
      
      // Get month label for the month this week belongs to
      const monthLabel = current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      
      const days = getDaysBetween(current, weekEnd > end ? end : weekEnd) + 1
      
      units.push({
        date: new Date(current),
        label: `W${weekNumber}`,
        width: days,
        isWeekStart: true,
        weekNumber,
        isMonthStart: isFirstWeekOfMonth,
        monthLabel: isFirstWeekOfMonth ? monthLabel : undefined,
      })
      
      // Move to next week
      current.setDate(current.getDate() + 7)
    }
  } else { // daily
    // For daily view, generate individual days organized by weeks
    let current = getStartOfWeek(start) // Start from the beginning of the week containing start date
    current.setHours(0, 0, 0, 0)
    
    // Helper function to calculate week number for a given date
    const calculateWeekNumber = (date: Date): number => {
      const year = date.getFullYear()
      const firstDayOfYear = new Date(year, 0, 1)
      const firstWeekStart = getStartOfWeek(firstDayOfYear)
      
      // Calculate days from first week start to current date
      const daysDiff = getDaysBetween(firstWeekStart, date)
      const weekNum = Math.floor(daysDiff / 7) + 1
      
      // If we're in the first few days of January and the week started in previous year,
      // we might be in week 52/53 of previous year or week 1 of current year
      // For simplicity, calculate based on which year the week's Monday falls in
      const weekMonday = getStartOfWeek(date)
      const weekMondayYear = weekMonday.getFullYear()
      
      if (weekMondayYear !== year) {
        // Week belongs to different year, recalculate
        const firstDayOfWeekYear = new Date(weekMondayYear, 0, 1)
        const firstWeekStartOfWeekYear = getStartOfWeek(firstDayOfWeekYear)
        const daysDiffForWeekYear = getDaysBetween(firstWeekStartOfWeekYear, weekMonday)
        return Math.floor(daysDiffForWeekYear / 7) + 1
      }
      
      return weekNum
    }
    
    while (current <= end) {
      const weekStartDate = new Date(current)
      let hasDaysInRange = false
      
      // Calculate week number for the current week start
      const weekNumber = calculateWeekNumber(current)
      
      // Generate 7 days for this week
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const dayDate = new Date(current)
        dayDate.setDate(current.getDate() + dayOfWeek)
        dayDate.setHours(0, 0, 0, 0)
        
        // Only include days within the range
        if (dayDate < start) continue
        if (dayDate > end) break
        
        hasDaysInRange = true
        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' })
        const dayNumber = dayDate.getDate()
        
      units.push({
          date: new Date(dayDate),
          label: `${dayName} ${dayNumber}`,
          width: 1, // 1 day
          isWeekStart: dayOfWeek === 0,
          weekNumber: dayOfWeek === 0 ? weekNumber : undefined,
        })
      }
      
      // Move to next week
      const nextWeek = new Date(current)
      nextWeek.setDate(nextWeek.getDate() + 7)
      current = nextWeek
    }
  }
  
  return units
}

// Calculate day width based on zoom
const getDayWidth = (zoom: ZoomLevel): number => {
  switch (zoom) {
    case 'daily':
      return 40 // 40px per day for daily view
    case 'monthly':
      return 8 // 8px per day
    case 'yearly':
      return 2 // 2px per day
  }
}

// Get bar position and width
const getBarPosition = (startDate: string, timelineStart: Date, dayWidth: number): number => {
  if (!startDate) return 0
  const start = parseDateString(startDate)
  const days = Math.max(0, getDaysBetween(timelineStart, start))
  return days * dayWidth
}

const getBarWidth = (startDate: string, endDate: string, dayWidth: number): number => {
  if (!startDate || !endDate) return 0
  const start = parseDateString(startDate)
  const end = parseDateString(endDate)
  const days = getDaysBetween(start, end) + 1 // +1 to include both start and end
  return Math.max(days * dayWidth, 4) // Minimum 4px width
}

// Chevron icon
const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className="w-4 h-4 text-slate-500 transition-transform"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

export default function GanttV2Page() {
  const { projects, updateProject, updateTask, updateSubtask } = useGanttContext()
  
  const [zoom, setZoom] = useState<ZoomLevel>('monthly')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  
  // Drag state for resizing bars and moving blocks
  const [dragState, setDragState] = useState<{
    rowId: string
    rowType: 'project' | 'task' | 'subtask'
    mode: 'resize-left' | 'resize-right' | 'move'
    startX: number
    originalStartDate: string
    originalEndDate: string
    clickOffsetX: number // Offset from left edge of bar where user clicked (for move mode)
    projectId: string
    taskId?: string
  } | null>(null)
  
  const treeScrollRef = useRef<HTMLDivElement>(null)
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const timelineHeaderRef = useRef<HTMLDivElement>(null)
  const hasUserScrolledRef = useRef<boolean>(false)
  const lastZoomRef = useRef<ZoomLevel>(zoom)

  // Build flat list of rows
  const buildRows = useCallback((): GanttRow[] => {
    const rows: GanttRow[] = []
    
    projects.forEach(project => {
      // Project row
      rows.push({
        id: project.id,
        type: 'project',
        name: project.name,
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        level: 0,
        projectId: project.id,
        expanded: expandedProjects.has(project.id),
        visible: true,
        data: project,
      })

      // Task rows (if project expanded)
      if (expandedProjects.has(project.id)) {
        project.children?.forEach(task => {
          rows.push({
            id: task.id,
            type: 'task',
            name: task.name,
            startDate: task.startDate || '',
            endDate: task.endDate || '',
            level: 1,
            projectId: project.id,
            taskId: task.id,
            parentId: project.id,
            expanded: expandedTasks.has(task.id),
            visible: true,
            data: task,
          })

          // Subtask rows (if task expanded)
          if (expandedTasks.has(task.id)) {
            task.children?.forEach(subtask => {
              rows.push({
                id: subtask.id,
                type: 'subtask',
                name: subtask.name,
                startDate: subtask.startDate || '',
                endDate: subtask.endDate || '',
                level: 2,
                projectId: project.id,
                taskId: task.id,
                parentId: task.id,
                expanded: false,
                visible: true,
                data: subtask,
              })
            })
          }
        })
      }
    })

    return rows
  }, [projects, expandedProjects, expandedTasks])

  const rows = buildRows()
  const timelineRange = useMemo(() => calculateTimelineRange(rows, zoom), [rows, zoom])
  const dayWidth = getDayWidth(zoom)
  const timeUnits = useMemo(
    () => generateTimeUnits(timelineRange.start, timelineRange.end, zoom),
    [timelineRange.start, timelineRange.end, zoom]
  )

  // Calculate total timeline width
  const totalDays = getDaysBetween(timelineRange.start, timelineRange.end)
  const timelineWidth = totalDays * dayWidth

  // Sync vertical scrolling
  useEffect(() => {
    const treeEl = treeScrollRef.current
    const timelineEl = timelineScrollRef.current

    if (!treeEl || !timelineEl) return

    const handleTreeScroll = () => {
      timelineEl.scrollTop = treeEl.scrollTop
    }

    const handleTimelineScroll = () => {
      treeEl.scrollTop = timelineEl.scrollTop
    }

    treeEl.addEventListener('scroll', handleTreeScroll)
    timelineEl.addEventListener('scroll', handleTimelineScroll)

    return () => {
      treeEl.removeEventListener('scroll', handleTreeScroll)
      timelineEl.removeEventListener('scroll', handleTimelineScroll)
    }
  }, [])

  // Sync horizontal scrolling
  useEffect(() => {
    const timelineEl = timelineScrollRef.current
    const headerEl = timelineHeaderRef.current

    if (!timelineEl || !headerEl) return

    const handleTimelineScroll = () => {
      headerEl.scrollLeft = timelineEl.scrollLeft
      // Track that user has manually scrolled horizontally
      if (timelineEl.scrollLeft !== 0) {
        hasUserScrolledRef.current = true
      }
    }

    timelineEl.addEventListener('scroll', handleTimelineScroll)

    return () => {
      timelineEl.removeEventListener('scroll', handleTimelineScroll)
    }
  }, [])

  // Auto-expand all on mount
  useEffect(() => {
    const projectIds = new Set(projects.map(p => p.id))
    setExpandedProjects(projectIds)
    
    const taskIds = new Set(
      projects.flatMap(p => p.children?.map(t => t.id) || [])
    )
    setExpandedTasks(taskIds)
  }, [projects.length])

  // Auto-scroll to today on mount and when zoom changes - align today with the start of the chart
  useEffect(() => {
    const timelineEl = timelineScrollRef.current
    if (!timelineEl || timelineWidth === 0) return
    
    // Only auto-scroll if zoom changed or on initial mount (user hasn't scrolled yet)
    const zoomChanged = lastZoomRef.current !== zoom
    lastZoomRef.current = zoom
    
    // Only auto-scroll if zoom changed or user hasn't manually scrolled
    if (!zoomChanged && hasUserScrolledRef.current) {
      return
    }
    
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const todayPosition = getBarPosition(formatDateString(now), timelineRange.start, dayWidth)
      
      // Scroll to align today with the start (left edge) of the visible chart
      const scrollPosition = Math.max(0, todayPosition)
      timelineEl.scrollLeft = scrollPosition
      
      // Reset the flag after auto-scroll (so zoom changes can still auto-scroll)
      if (zoomChanged) {
        hasUserScrolledRef.current = false
      }
    }, 100)
  }, [zoom, timelineRange.start, dayWidth, timelineWidth])

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  // Expand/collapse all functions
  const expandAll = () => {
    // Expand all projects
    const allProjectIds = new Set(projects.map(p => p.id))
    setExpandedProjects(allProjectIds)
    
    // Expand all tasks
    const allTaskIds = new Set(
      projects.flatMap(p => p.children?.map(t => t.id) || [])
    )
    setExpandedTasks(allTaskIds)
  }

  const collapseAll = () => {
    // Collapse all projects (this will also hide all tasks and subtasks)
    setExpandedProjects(new Set())
    // Collapse all tasks
    setExpandedTasks(new Set())
  }

  // Expand/collapse projects only
  const expandAllProjects = () => {
    const allProjectIds = new Set(projects.map(p => p.id))
    setExpandedProjects(allProjectIds)
  }

  const collapseAllProjects = () => {
    setExpandedProjects(new Set())
  }

  // Expand/collapse tasks only
  const expandAllTasks = () => {
    const allTaskIds = new Set(
      projects.flatMap(p => p.children?.map(t => t.id) || [])
    )
    setExpandedTasks(allTaskIds)
  }

  const collapseAllTasks = () => {
    setExpandedTasks(new Set())
  }

  const getRowColor = (type: 'project' | 'task' | 'subtask'): string => {
    switch (type) {
      case 'project':
        return PROJECT_COLOR
      case 'task':
        return TASK_COLOR
      case 'subtask':
        return SUBTASK_COLOR
    }
  }

  // Zoom in and out functions
  const zoomIn = () => {
    if (zoom === 'yearly') {
      setZoom('monthly')
    } else if (zoom === 'monthly') {
      setZoom('daily')
    }
    // daily is already max zoom
  }

  const zoomOut = () => {
    if (zoom === 'daily') {
      setZoom('monthly')
    } else if (zoom === 'monthly') {
      setZoom('yearly')
    }
    // yearly is already min zoom
  }

  const canZoomIn = zoom !== 'daily'
  const canZoomOut = zoom !== 'yearly'

  // Handle mouse down on resize handle
  const handleResizeStart = (
    e: React.MouseEvent,
    row: GanttRow,
    edge: 'left' | 'right'
  ) => {
    e.preventDefault()
    e.stopPropagation()
    
    setDragState({
      rowId: row.id,
      rowType: row.type,
      mode: edge === 'left' ? 'resize-left' : 'resize-right',
      startX: e.clientX,
      originalStartDate: row.startDate,
      originalEndDate: row.endDate,
      clickOffsetX: 0, // Not used for resize, but required by type
      projectId: row.projectId,
      taskId: row.taskId,
    })
  }

  // Handle mouse down on bar body to move the entire block
  const handleMoveStart = (
    e: React.MouseEvent,
    row: GanttRow,
    barLeft: number
  ) => {
    // Only start move if not clicking on resize handles
    const target = e.target as HTMLElement
    if (target.classList.contains('resize-handle')) {
      return
    }
    
    e.preventDefault()
    e.stopPropagation()
    
    const timelineEl = timelineScrollRef.current
    if (!timelineEl) return
    
    // Calculate where on the bar the user clicked (offset from left edge)
    const rect = timelineEl.getBoundingClientRect()
    const clickX = e.clientX - rect.left + timelineEl.scrollLeft
    const clickOffsetX = clickX - barLeft
    
    setDragState({
      rowId: row.id,
      rowType: row.type,
      mode: 'move',
      startX: e.clientX,
      originalStartDate: row.startDate,
      originalEndDate: row.endDate,
      clickOffsetX, // Store where on the bar the user clicked
      projectId: row.projectId,
      taskId: row.taskId,
    })
  }

  // Handle mouse move during drag
  useEffect(() => {
    if (!dragState) return

    let lastUpdateTime = 0
    const THROTTLE_MS = 50 // Throttle updates to every 50ms for better performance
    let lastSentStartDate = dragState.originalStartDate
    let lastSentEndDate = dragState.originalEndDate

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return

      const now = Date.now()
      if (now - lastUpdateTime < THROTTLE_MS) return
      lastUpdateTime = now

      const timelineEl = timelineScrollRef.current
      if (!timelineEl) return

      // Get the mouse position relative to the timeline
      const rect = timelineEl.getBoundingClientRect()
      const mouseX = e.clientX - rect.left + timelineEl.scrollLeft
      
      // Calculate which day the mouse is over
      const daysFromStart = Math.round(mouseX / dayWidth)
      const targetDate = new Date(timelineRange.start)
      targetDate.setDate(targetDate.getDate() + daysFromStart)
      targetDate.setHours(0, 0, 0, 0)
      const targetDateStr = formatDateString(targetDate)

      let newStartDate = dragState.originalStartDate
      let newEndDate = dragState.originalEndDate

      if (dragState.mode === 'resize-left') {
        // Resizing left edge (start date)
        newStartDate = targetDateStr
        
        // Ensure start date doesn't go after end date
        if (newStartDate > dragState.originalEndDate) {
          newStartDate = dragState.originalEndDate
        }
      } else if (dragState.mode === 'resize-right') {
        // Resizing right edge (end date)
        newEndDate = targetDateStr
        
        // Ensure end date doesn't go before start date
        if (newEndDate < dragState.originalStartDate) {
          newEndDate = dragState.originalStartDate
        }
      } else if (dragState.mode === 'move') {
        // Moving the entire block - use the click offset to determine new start position
        // The new start date is where the click point would be now
        const targetStartX = mouseX - dragState.clickOffsetX
        const daysFromStart = Math.round(targetStartX / dayWidth)
        const targetDate = new Date(timelineRange.start)
        targetDate.setDate(targetDate.getDate() + daysFromStart)
        targetDate.setHours(0, 0, 0, 0)
        newStartDate = formatDateString(targetDate)
        
        // Calculate duration and apply to new end date
        const originalStart = parseDateString(dragState.originalStartDate)
        const originalEnd = parseDateString(dragState.originalEndDate)
        const duration = getDaysBetween(originalStart, originalEnd)
        const newEnd = new Date(targetDate)
        newEnd.setDate(newEnd.getDate() + duration)
        newEnd.setHours(0, 0, 0, 0)
        newEndDate = formatDateString(newEnd)
      }

      // Only update if dates actually changed from what we last sent
      if (newStartDate === lastSentStartDate && newEndDate === lastSentEndDate) {
        return
      }

      // Update based on row type - the update functions will handle parent constraints
      if (dragState.rowType === 'project') {
        updateProject(dragState.rowId, {
          startDate: newStartDate,
          endDate: newEndDate,
        })
      } else if (dragState.rowType === 'task') {
        updateTask(dragState.projectId, dragState.rowId, {
          startDate: newStartDate,
          endDate: newEndDate,
        })
      } else if (dragState.rowType === 'subtask' && dragState.taskId) {
        updateSubtask(dragState.projectId, dragState.taskId, dragState.rowId, {
          startDate: newStartDate,
          endDate: newEndDate,
        })
      }

      // Track what we last sent
      lastSentStartDate = newStartDate
      lastSentEndDate = newEndDate
    }

    const handleMouseUp = () => {
      setDragState(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, dayWidth, timelineRange.start, updateProject, updateTask, updateSubtask])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with Zoom Controls */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gantt Chart</h1>
          <p className="text-sm text-slate-600 mt-0.5">Strategic timeline view</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const timelineEl = timelineScrollRef.current
              if (timelineEl) {
                const now = new Date()
                now.setHours(0, 0, 0, 0)
                const todayPosition = getBarPosition(formatDateString(now), timelineRange.start, dayWidth)
                // Align today with the start (left edge) of the visible chart
                const scrollPosition = Math.max(0, todayPosition)
                timelineEl.scrollLeft = scrollPosition
              }
            }}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
            title="Scroll to today (aligns with start of chart)"
          >
            Today
          </button>
          
          {/* Expand/Collapse Controls */}
          <div className="flex flex-col items-center gap-0.5 border-l border-slate-300 pl-2 ml-1">
            {/* Upper chevrons - Projects */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={expandAllProjects}
                className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                title="Expand all projects"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <button
                onClick={collapseAllProjects}
                className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                title="Collapse all projects"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>
            </div>
            {/* Lower chevrons - Tasks */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={expandAllTasks}
                className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                title="Expand all tasks and subtasks"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <button
                onClick={collapseAllTasks}
                className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                title="Collapse all tasks and subtasks"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-l border-slate-300 pl-2 ml-1">
            <button
              onClick={zoomOut}
              disabled={!canZoomOut}
              className={`px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                canZoomOut
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
              title="Zoom out"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                />
              </svg>
            </button>
            <button
              onClick={zoomIn}
              disabled={!canZoomIn}
              className={`px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                canZoomIn
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
              title="Zoom in"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                />
              </svg>
            </button>
          </div>
          
          <button
            onClick={() => setZoom('daily')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              zoom === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setZoom('monthly')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              zoom === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setZoom('yearly')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              zoom === 'yearly'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Hierarchy Tree */}
        <div className="flex-shrink-0 border-r border-slate-200 bg-white">
          <div className="h-full flex flex-col">
            {/* Tree Header */}
            <div 
              className="flex-shrink-0 border-b border-slate-200 bg-slate-50 px-4 flex items-center"
              style={{ height: HEADER_HEIGHT }}
            >
              <div className="text-sm font-semibold text-slate-700">Summary</div>
            </div>
            
            {/* Tree Content */}
            <div
              ref={treeScrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden"
            >
              {rows.map((row) => {
                // Determine styling based on row type
                const getRowStyle = () => {
                  if (row.type === 'project') {
                    return {
                      borderLeft: '4px solid #6b7280', // gray border for projects
                      backgroundColor: hoveredRowId === row.id ? '#f3f4f6' : '#f9fafb', // light gray bg
                      fontWeight: '600' as const, // semibold
                    }
                  } else if (row.type === 'task') {
                    return {
                      borderLeft: '4px solid #3b82f6', // blue border for tasks
                      backgroundColor: hoveredRowId === row.id ? '#eff6ff' : '#f8fafc', // light blue bg
                      fontWeight: '500' as const, // medium
                    }
                  } else {
                    // subtask
                    return {
                      borderLeft: '4px solid #8b5cf6', // purple border for subtasks
                      backgroundColor: hoveredRowId === row.id ? '#f5f3ff' : '#fafafa', // light purple bg
                      fontWeight: '400' as const, // normal
                    }
                  }
                }

                const rowStyle = getRowStyle()

                return (
                <div
                  key={row.id}
                  onMouseEnter={() => setHoveredRowId(row.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                    className={`flex items-center px-4 py-1.5 border-b border-slate-100 transition-all ${
                      hoveredRowId === row.id ? 'shadow-sm' : ''
                  }`}
                    style={{ 
                      height: ROW_HEIGHT,
                      ...rowStyle
                    }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Indentation with visual guide */}
                      <div 
                        className="flex items-center"
                        style={{ width: row.level * 20 }}
                      >
                        {row.level > 0 && (
                          <div 
                            className="h-full border-l-2 border-dashed border-slate-300"
                            style={{ width: '1px', marginRight: '8px' }}
                          />
                        )}
                      </div>
                      
                      {/* Type indicator icon */}
                      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                        {row.type === 'project' && (
                          <div className="w-2 h-2 rounded-full bg-slate-500" />
                        )}
                        {row.type === 'task' && (
                          <div className="w-2 h-2 rounded bg-blue-500" />
                        )}
                        {row.type === 'subtask' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        )}
                      </div>
                    
                    {/* Chevron */}
                    {(row.type === 'project' || row.type === 'task') && (
                      <button
                        onClick={() => {
                          if (row.type === 'project') toggleProject(row.projectId)
                          else if (row.type === 'task') toggleTask(row.taskId!)
                        }}
                          className="flex-shrink-0 p-0.5 hover:bg-slate-200 rounded transition-colors"
                      >
                        <ChevronIcon expanded={row.expanded || false} />
                      </button>
                    )}
                    {row.type !== 'project' && row.type !== 'task' && (
                      <div className="w-5" /> // Spacer for alignment
                    )}
                    
                      {/* Name with type label */}
                      <div 
                        className="flex-1 truncate text-sm flex items-center gap-2"
                        style={{ 
                          color: row.type === 'project' ? '#1f2937' : row.type === 'task' ? '#1e40af' : '#6b21a8'
                        }}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                          {row.type === 'project' ? 'PROJECT' : row.type === 'task' ? 'TASK' : 'SUBTASK'}
                        </span>
                        <span>{row.name || '(Untitled)'}</span>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Panel - Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Timeline Header */}
          <div
            ref={timelineHeaderRef}
            className="flex-shrink-0 border-b border-slate-200 bg-slate-50 overflow-hidden"
            style={{ height: HEADER_HEIGHT }}
          >
            <div style={{ width: timelineWidth, position: 'relative', height: '100%', margin: 0, padding: 0 }}>
              {zoom === 'daily' ? (
                <>
                  {/* Week labels row */}
                  {(() => {
                    const weekStarts = timeUnits.filter(unit => unit.isWeekStart && unit.weekNumber !== undefined)
                    return weekStarts.map((unit, idx) => {
                      const weekStart = unit.date
                      const weekWidth = 7 * dayWidth
                      return (
                        <div
                          key={`week-${unit.weekNumber}-${idx}`}
                          className="absolute border-r-2 border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-700 bg-slate-100"
                          style={{
                            left: getBarPosition(formatDateString(weekStart), timelineRange.start, dayWidth),
                            width: weekWidth,
                            height: '24px',
                            top: 0,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          Week {unit.weekNumber}
                        </div>
                      )
                    })
                  })()}
                  
                  {/* Days row */}
                  {timeUnits.map((unit, idx) => {
                    const dayName = unit.date.toLocaleDateString('en-US', { weekday: 'short' })
                    const dayNumber = unit.date.getDate()
                    const isToday = formatDateString(unit.date) === formatDateString(new Date())
                    
                    return (
                      <div
                        key={idx}
                        className={`absolute border-r border-slate-200 px-1 text-xs ${
                          isToday ? 'bg-orange-50 border-orange-300' : ''
                        }`}
                        style={{
                          left: getBarPosition(formatDateString(unit.date), timelineRange.start, dayWidth),
                          width: dayWidth,
                          height: HEADER_HEIGHT - 24,
                          top: '24px',
                          bottom: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '1px',
                          paddingTop: '2px',
                          paddingBottom: '2px',
                        }}
                      >
                        <div className="text-[10px] font-medium text-slate-600 leading-tight">
                          {dayName}
                        </div>
                        <div className={`text-xs font-semibold leading-tight ${isToday ? 'text-orange-600' : 'text-slate-900'}`}>
                          {dayNumber}
                        </div>
                      </div>
                    )
                  })}
                </>
              ) : zoom === 'monthly' ? (
                <>
                  {/* Month labels row */}
                  {(() => {
                    const monthGroups: Array<{ monthLabel: string; startUnit: typeof timeUnits[0]; endUnit: typeof timeUnits[0] }> = []
                    
                    // Group weeks by month
                    let currentMonthGroup: typeof monthGroups[0] | null = null
                    timeUnits.forEach((unit) => {
                      if (unit.isMonthStart && unit.monthLabel) {
                        if (currentMonthGroup) {
                          monthGroups.push(currentMonthGroup)
                        }
                        currentMonthGroup = {
                          monthLabel: unit.monthLabel,
                          startUnit: unit,
                          endUnit: unit,
                        }
                      } else if (currentMonthGroup) {
                        // Check if this week still belongs to the same month
                        const monthLabel = unit.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        
                        if (monthLabel === currentMonthGroup.monthLabel) {
                          currentMonthGroup.endUnit = unit
                        } else {
                          // New month started
                          monthGroups.push(currentMonthGroup)
                          currentMonthGroup = {
                            monthLabel,
                            startUnit: unit,
                            endUnit: unit,
                          }
                        }
                      }
                    })
                    if (currentMonthGroup) {
                      monthGroups.push(currentMonthGroup)
                    }
                    
                    return monthGroups.map((monthGroup, idx) => {
                      const monthStartPos = getBarPosition(formatDateString(monthGroup.startUnit.date), timelineRange.start, dayWidth)
                      const monthEndPos = getBarPosition(formatDateString(monthGroup.endUnit.date), timelineRange.start, dayWidth) + (monthGroup.endUnit.width * dayWidth)
                      const monthWidth = monthEndPos - monthStartPos
                      
                      return (
                        <div
                          key={`month-${idx}`}
                          className="absolute border-r-2 border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-slate-100"
                          style={{
                            left: monthStartPos,
                            width: monthWidth,
                            height: '20px',
                            top: 0,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {monthGroup.monthLabel}
                        </div>
                      )
                    })
                  })()}
                  
                  {/* Weeks row */}
              {timeUnits.map((unit, idx) => (
                <div
                  key={idx}
                      className="absolute border-r border-slate-200 px-1 text-[9px] font-medium text-slate-600"
                  style={{
                    left: getBarPosition(formatDateString(unit.date), timelineRange.start, dayWidth),
                    width: unit.width * dayWidth,
                        height: HEADER_HEIGHT - 20,
                        top: '20px',
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                  }}
                >
                  {unit.label}
                </div>
              ))}
                </>
              ) : zoom === 'yearly' ? (
                <>
                  {/* Year labels row */}
                  {(() => {
                    const yearGroups: Array<{ yearLabel: string; startUnit: typeof timeUnits[0]; endUnit: typeof timeUnits[0] }> = []
                    
                    // Group months by year
                    let currentYearGroup: typeof yearGroups[0] | null = null
                    timeUnits.forEach((unit) => {
                      if (unit.isYearStart && unit.yearLabel) {
                        if (currentYearGroup) {
                          yearGroups.push(currentYearGroup)
                        }
                        currentYearGroup = {
                          yearLabel: unit.yearLabel,
                          startUnit: unit,
                          endUnit: unit,
                        }
                      } else if (currentYearGroup) {
                        // Check if this month still belongs to the same year
                        const yearLabel = unit.date.getFullYear().toString()
                        
                        if (yearLabel === currentYearGroup.yearLabel) {
                          currentYearGroup.endUnit = unit
                        } else {
                          // New year started
                          yearGroups.push(currentYearGroup)
                          currentYearGroup = {
                            yearLabel,
                            startUnit: unit,
                            endUnit: unit,
                          }
                        }
                      }
                    })
                    if (currentYearGroup) {
                      yearGroups.push(currentYearGroup)
                    }
                    
                    return yearGroups.map((yearGroup, idx) => {
                      const yearStartPos = getBarPosition(formatDateString(yearGroup.startUnit.date), timelineRange.start, dayWidth)
                      const yearEndPos = getBarPosition(formatDateString(yearGroup.endUnit.date), timelineRange.start, dayWidth) + (yearGroup.endUnit.width * dayWidth)
                      const yearWidth = yearEndPos - yearStartPos
                      
                      return (
                        <div
                          key={`year-${idx}`}
                          className="absolute border-r-2 border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-slate-100"
                          style={{
                            left: yearStartPos,
                            width: yearWidth,
                            height: '20px',
                            top: 0,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {yearGroup.yearLabel}
                        </div>
                      )
                    })
                  })()}
                  
                  {/* Months row */}
                  {timeUnits.map((unit, idx) => (
                    <div
                      key={idx}
                      className="absolute border-r border-slate-200 px-1 text-[9px] font-medium text-slate-600"
                      style={{
                        left: getBarPosition(formatDateString(unit.date), timelineRange.start, dayWidth),
                        width: unit.width * dayWidth,
                        height: HEADER_HEIGHT - 20,
                        top: '20px',
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {unit.label}
                    </div>
                  ))}
                </>
              ) : null}
            </div>
          </div>

          {/* Timeline Content */}
          <div
            ref={timelineScrollRef}
            className="flex-1 overflow-auto"
          >
            <div 
              style={{ 
                width: timelineWidth, 
                position: 'relative',
                minHeight: rows.length * ROW_HEIGHT,
              }}
            >
              {/* Today indicator line */}
              {(() => {
                const now = new Date()
                now.setHours(0, 0, 0, 0)
                const todayPosition = getBarPosition(formatDateString(now), timelineRange.start, dayWidth)
                if (todayPosition >= 0 && todayPosition <= timelineWidth) {
                  return (
                    <div
                      className="absolute z-20 pointer-events-none"
                      style={{
                        left: todayPosition,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        backgroundColor: '#ef4444', // red-500
                      }}
                    >
                      <div
                        className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full"
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: '4px solid transparent',
                          borderRight: '4px solid transparent',
                          borderTop: '6px solid #ef4444',
                        }}
                      />
                      <div
                        className="absolute top-0 left-1/2 transform -translate-x-1/2 text-[10px] font-semibold text-red-600 whitespace-nowrap"
                        style={{ marginTop: '-12px' }}
                      >
                        Today
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {/* Grid lines */}
              {timeUnits.map((unit, idx) => {
                const isWeekEnd = zoom === 'daily' && (idx + 1) % 7 === 0
                const unitWidth = zoom === 'daily' ? dayWidth : unit.width * dayWidth
                return (
                <div
                  key={`grid-${idx}`}
                    className={`absolute border-r ${isWeekEnd ? 'border-slate-300' : 'border-slate-100'}`}
                  style={{
                      left: getBarPosition(formatDateString(unit.date), timelineRange.start, dayWidth) + unitWidth,
                    width: 1,
                    top: 0,
                    bottom: 0,
                  }}
                />
                )
              })}

              {/* Row backgrounds for alignment */}
              {rows.map((row, index) => (
                <div
                  key={`row-bg-${row.id}`}
                  className="absolute border-b border-slate-100"
                  style={{
                    top: index * ROW_HEIGHT,
                    left: 0,
                    right: 0,
                    height: ROW_HEIGHT,
                  }}
                />
              ))}

              {/* Gantt Bars */}
              {rows.map((row, index) => {
                if (!row.startDate || !row.endDate || row.startDate.trim() === '' || row.endDate.trim() === '') {
                  return null
                }

                try {
                  const startDate = parseDateString(row.startDate)
                  const endDate = parseDateString(row.endDate)
                  
                  // Validate dates are reasonable
                  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    return null
                  }
                  
                  // Ensure end date is after start date
                  if (endDate < startDate) {
                    return null
                  }

                  const left = getBarPosition(row.startDate, timelineRange.start, dayWidth)
                  const width = getBarWidth(row.startDate, row.endDate, dayWidth)
                  
                  // Only render if bar is within reasonable bounds
                  if (width <= 0 || left < -timelineWidth || left > timelineWidth * 2) {
                    return null
                  }

                  const isHovered = hoveredRowId === row.id

                  // Different heights and styles for different types
                  const getBarStyle = () => {
                    const baseTop = index * ROW_HEIGHT
                    const baseHeight = ROW_HEIGHT - 4
                    
                    if (row.type === 'project') {
                      return {
                        top: baseTop + 1,
                        height: baseHeight - 2,
                        borderRadius: '6px',
                        border: '1.5px solid rgba(0, 0, 0, 0.15)',
                        boxShadow: isHovered 
                          ? '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)' 
                          : '0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                        background: isHovered
                          ? 'linear-gradient(135deg, #7c8a9a 0%, #5a6675 50%, #4b5563 100%)'
                          : 'linear-gradient(135deg, #9ca3af 0%, #6b7280 50%, #4b5563 100%)',
                      }
                    } else if (row.type === 'task') {
                      return {
                        top: baseTop + 2,
                        height: baseHeight - 4,
                        borderRadius: '5px',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        boxShadow: isHovered
                          ? '0 3px 10px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                          : '0 2px 6px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                        background: isHovered
                          ? 'linear-gradient(135deg, #4a90e2 0%, #3b82f6 50%, #2563eb 100%)'
                          : 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
                      }
                    } else { // subtask
                      return {
                        top: baseTop + 3,
                        height: baseHeight - 6,
                        borderRadius: '4px',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        boxShadow: isHovered
                          ? '0 2px 8px rgba(139, 92, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.35)'
                          : '0 1px 4px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                        background: isHovered
                          ? 'linear-gradient(135deg, #9d7ff0 0%, #8b5cf6 50%, #7c3aed 100%)'
                          : 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)',
                      }
                    }
                  }

                  const barStyle = getBarStyle()

                  // Calculate duration in days
                  const duration = getDaysBetween(startDate, endDate) + 1
                  
                  // Get additional info from data
                  const status = 'status' in row.data ? row.data.status : undefined
                  const priority = 'priority' in row.data ? row.data.priority : undefined
                  const storyPoints = 'storyPoints' in row.data ? row.data.storyPoints : undefined
                  const difficulty = 'difficulty' in row.data ? row.data.difficulty : undefined
                  const totalPoints = 'totalPoints' in row.data ? row.data.totalPoints : undefined
                  
                  // Format dates for display
                  const formatShortDate = (dateStr: string) => {
                    const date = parseDateString(dateStr)
                    return `${date.getMonth() + 1}/${date.getDate()}`
                  }
                  
                  // Format full date for tooltip
                  const formatFullDate = (dateStr: string) => {
                    const date = parseDateString(dateStr)
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
                  }
                  
                  // Get original time estimate
                  const getOriginalTimeEstimate = () => {
                    if (row.type === 'subtask') {
                      const subtask = row.data as GanttSubtask
                      if (subtask.storyPoints) {
                        // Direct mapping: 1 story point = 1 hour
                        const hours = subtask.storyPoints
                        if (hours < 1) return `${Math.round(hours * 60)} min`
                        if (hours === 1) return '1 hr'
                        if (hours < 8) return `${hours} hrs`
                        if (hours < 24) return `${hours} hrs (${Math.round(hours / 8)} days)`
                        return `${hours} hrs (${Math.round(hours / 8)} days)`
                      }
                      if (subtask.difficulty) {
                        // Legacy difficulty mapping (for backwards compatibility)
                        const diffToHours: Record<number, string> = {
                          1: '1 hr',
                          2: '4 hrs',
                          3: '8 hrs',
                          5: '24 hrs',
                          8: '40 hrs',
                        }
                        return diffToHours[subtask.difficulty] || `${subtask.difficulty} difficulty`
                      }
                      return 'Not estimated'
                    } else if (row.type === 'task') {
                      const task = row.data as GanttTask
                      if (task.totalPoints) {
                        // Direct mapping: 1 story point = 1 hour
                        const hours = task.totalPoints as number
                        return `${hours} hrs`
                      }
                      return 'Not estimated'
                    } else {
                      // Project - calculate from tasks
                      return 'Calculated from tasks'
                    }
                  }
                  
                  // Get flag based on due date proximity (matching Projects2Page logic)
                  const getDueDateFlag = (endDate: string): { color: string; label: string } | null => {
                    if (!endDate || endDate === '') {
                      return null
                    }

                    try {
                      // Get today's date at midnight in local timezone
                      const now = new Date()
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                      today.setHours(0, 0, 0, 0)
                      
                      // Parse the end date
                      let dateString = endDate.includes('T') ? endDate.split('T')[0] : endDate.trim()
                      dateString = dateString.split(' ')[0].trim()
                      
                      // Validate date string format
                      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                        return null
                      }
                      
                      const parts = dateString.split('-')
                      const year = parseInt(parts[0], 10)
                      const month = parseInt(parts[1], 10)
                      const day = parseInt(parts[2], 10)
                      
                      if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
                        return null
                      }
                      
                      const dueDate = new Date(year, month - 1, day)
                      dueDate.setHours(0, 0, 0, 0)
                      
                      if (isNaN(dueDate.getTime())) {
                        return null
                      }
                      
                      // If due date is in the past, return null (no flag)
                      if (dueDate < today) {
                        return null
                      }

                      // Calculate difference in days
                      const diffTime = dueDate.getTime() - today.getTime()
                      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
                      
                      // Determine flag color based on days
                      if (diffDays > 30) {
                        return { color: 'text-green-600', label: 'More than 1 month' }
                      } else if (diffDays >= 14) {
                        return { color: 'text-orange-500', label: '2 weeks or more' }
                      } else if (diffDays >= 7) {
                        return { color: 'text-yellow-500', label: '1 week or more' }
                      } else {
                        return { color: 'text-red-600', label: 'Less than 1 week' }
                      }
                    } catch (error) {
                      return null
                    }
                  }
                  
                  const flag = getDueDateFlag(row.endDate)
                  const isCompleted = status === 'completed'
                  
                  // Get priority label
                  const getPriorityLabel = () => {
                    if (!priority) return 'Not set'
                    const priorityLabels: Record<string, string> = {
                      'low': 'Low',
                      'medium': 'Medium',
                      'high': 'High',
                      'urgent': 'Urgent',
                    }
                    return priorityLabels[priority] || priority
                  }
                  
                  // Get status label
                  const getStatusLabel = () => {
                    if (!status) return 'Not set'
                    const statusLabels: Record<string, string> = {
                      'backlog': 'Backlog',
                      'sprint': 'Sprint',
                      'today': 'Today',
                      'active': 'Active',
                      'completed': 'Completed',
                      'refinement': 'Refinement',
                    }
                    return statusLabels[status] || status
                  }
                  
                  // Determine if bar is wide enough to show text
                  const showText = width > 80 // Only show text if bar is at least 80px wide
                  const showFullInfo = width > 150 // Show more info if bar is wider

                  const isDragging = dragState?.rowId === row.id
                  const isMoving = isDragging && dragState?.mode === 'move'
                  const isResizing = isDragging && (dragState?.mode === 'resize-left' || dragState?.mode === 'resize-right')

                  return (
                    <div
                      key={row.id}
                      onMouseEnter={() => setHoveredRowId(row.id)}
                      onMouseLeave={() => {
                        setHoveredRowId(null)
                        setTooltipPosition(null)
                      }}
                      onMouseMove={(e) => {
                        setTooltipPosition({
                          x: e.clientX,
                          y: e.clientY,
                        })
                      }}
                      onMouseDown={(e) => handleMoveStart(e, row, left)}
                      className="absolute"
                      style={{
                        ...barStyle,
                        left,
                        width,
                        transition: isDragging ? 'none' : 'box-shadow 0.2s ease, background 0.2s ease',
                        zIndex: isHovered || isDragging ? 10 : 0,
                        cursor: isMoving ? 'grabbing' : isResizing ? 'ew-resize' : 'grab',
                      }}
                    >
                      {/* Tooltip */}
                      {isHovered && tooltipPosition && (
                        <div
                          className="fixed px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none whitespace-nowrap"
                          style={{
                            minWidth: '200px',
                            left: `${tooltipPosition.x + 10}px`,
                            top: `${tooltipPosition.y - 10}px`,
                            transform: 'translateY(-100%)',
                          }}
                        >
                          {/* Type */}
                          <div className="font-bold text-sm mb-2 pb-2 border-b border-slate-700">
                            {row.type === 'project' ? 'PROJECT' : row.type === 'task' ? 'TASK' : 'SUBTASK'}
                          </div>
                          
                          {/* Name */}
                          <div className="font-semibold mb-2 text-white">
                            {row.name}
                          </div>
                          
                          {/* Start Date and Due Date */}
                          <div className="mb-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">Start:</span>
                              <span className="text-white">{formatFullDate(row.startDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">Due:</span>
                              <span className="text-white">{formatFullDate(row.endDate)}</span>
                            </div>
                          </div>
                          
                          {/* Flag (Due Date Indicator) */}
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-slate-400">Flag:</span>
                            {isCompleted ? (
                              <div className="flex items-center gap-2">
                                <svg 
                                  className="w-5 h-5 text-green-600" 
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  {/* Flag pole */}
                                  <rect x="2" y="2" width="1.5" height="20" fill="currentColor" className="text-slate-700"/>
                                  {/* Checkered flag - alternating black and white squares */}
                                  <rect x="4" y="2" width="18" height="20" fill="white"/>
                                  <g fill="black">
                                    <rect x="4" y="2" width="4.5" height="4" fill="black"/>
                                    <rect x="13" y="2" width="4.5" height="4" fill="black"/>
                                    <rect x="8.5" y="6" width="4.5" height="4" fill="black"/>
                                    <rect x="17.5" y="6" width="4.5" height="4" fill="black"/>
                                    <rect x="4" y="10" width="4.5" height="4" fill="black"/>
                                    <rect x="13" y="10" width="4.5" height="4" fill="black"/>
                                    <rect x="8.5" y="14" width="4.5" height="4" fill="black"/>
                                    <rect x="17.5" y="14" width="4.5" height="4" fill="black"/>
                                    <rect x="4" y="18" width="4.5" height="4" fill="black"/>
                                    <rect x="13" y="18" width="4.5" height="4" fill="black"/>
                                  </g>
                                </svg>
                                <span className="text-white">Completed</span>
                              </div>
                            ) : status === 'refinement' ? (
                              <div className="flex items-center gap-2">
                                <svg 
                                  className="w-5 h-5 text-blue-600" 
                                  fill="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M3 2v20h2V2H3zm3 0h15l-3 4 3 4H6V2z" />
                                </svg>
                                <span className="text-white">Refinement</span>
                              </div>
                            ) : flag ? (
                              <div className="flex items-center gap-2">
                                <svg 
                                  className={`w-5 h-5 ${flag.color}`} 
                                  fill="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M3 2v20h2V2H3zm3 0h15l-3 4 3 4H6V2z" />
                                </svg>
                                <span className="text-white">{flag.label}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </div>
                          
                          {/* Status */}
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-slate-400">Status:</span>
                            <span className="text-white">{getStatusLabel()}</span>
                          </div>
                          
                          {/* Priority */}
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-slate-400">Priority:</span>
                            <span className="text-white">{getPriorityLabel()}</span>
                          </div>
                          
                          {/* Original Time Estimate */}
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Original Time Estimate:</span>
                            <span className="text-white">{getOriginalTimeEstimate()}</span>
                          </div>
                        </div>
                      )}
                      {/* Inner highlight for depth */}
                      <div
                        className="absolute inset-0 rounded-[inherit] pointer-events-none"
                        style={{
                          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 0%, transparent 50%)',
                          borderRadius: 'inherit',
                        }}
                      />
                      
                      {/* Left resize handle */}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          handleResizeStart(e, row, 'left')
                        }}
                        className={`resize-handle absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 transition-all ${
                          isHovered || isDragging ? 'bg-white bg-opacity-20' : 'bg-transparent'
                        } ${isDragging && dragState?.mode === 'resize-left' ? 'bg-white bg-opacity-40' : ''}`}
                        style={{
                          borderTopLeftRadius: barStyle.borderRadius,
                          borderBottomLeftRadius: barStyle.borderRadius,
                        }}
                        title="Drag to resize start date"
                      />
                      
                      {/* Right resize handle */}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          handleResizeStart(e, row, 'right')
                        }}
                        className={`resize-handle absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 transition-all ${
                          isHovered || isDragging ? 'bg-white bg-opacity-20' : 'bg-transparent'
                        } ${isDragging && dragState?.mode === 'resize-right' ? 'bg-white bg-opacity-40' : ''}`}
                        style={{
                          borderTopRightRadius: barStyle.borderRadius,
                          borderBottomRightRadius: barStyle.borderRadius,
                        }}
                        title="Drag to resize end date"
                      />
                      
                      {/* Discrete information overlay */}
                      {showText && (
                        <div
                          className="absolute inset-0 flex items-center pointer-events-none px-1.5"
                          style={{
                            borderRadius: 'inherit',
                          }}
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {/* Name */}
                            <span
                              className="text-[10px] font-semibold truncate"
                              style={{
                                color: 'rgba(255, 255, 255, 0.95)',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                              }}
                            >
                              {row.name}
                            </span>
                            
                            {/* Additional info for wider bars */}
                            {showFullInfo && (
                              <>
                                {/* Duration */}
                                <span
                                  className="text-[9px] font-medium whitespace-nowrap"
                                  style={{
                                    color: 'rgba(255, 255, 255, 0.85)',
                                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                                  }}
                                >
                                  {duration}d
                                </span>
                                
                                {/* Status indicator */}
                                {status && status !== 'active' && (
                                  <span
                                    className="text-[8px] font-bold uppercase px-1 py-0.5 rounded"
                                    style={{
                                      backgroundColor: status === 'completed' 
                                        ? 'rgba(16, 185, 129, 0.9)' 
                                        : status === 'today' 
                                        ? 'rgba(239, 68, 68, 0.9)'
                                        : status === 'refinement'
                                        ? 'rgba(245, 158, 11, 0.9)' // amber-500
                                        : 'rgba(255, 255, 255, 0.25)',
                                      color: status === 'completed' || status === 'today' || status === 'refinement'
                                        ? 'rgba(255, 255, 255, 1)' 
                                        : 'rgba(255, 255, 255, 0.9)',
                                      textShadow: '0 1px 1px rgba(0, 0, 0, 0.2)',
                                    }}
                                  >
                                    {status === 'completed' ? '✓' : status === 'today' ? '!' : status.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                } catch (e) {
                  console.warn('Error rendering bar for row:', row.id, e)
                  return null
                }
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

