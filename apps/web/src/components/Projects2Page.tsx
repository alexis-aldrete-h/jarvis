'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useGanttContext } from '@/contexts/GanttContext'
import { GanttProject, GanttTask, GanttSubtask, GanttStatus, TaskPriority, StoryPoint } from '@jarvis/shared'
import '@/hooks/testSupabase' // Import to make test function available

type TableRow = {
  id: string
  type: 'project' | 'task' | 'subtask'
  data?: GanttProject | GanttTask | GanttSubtask
  parentId?: string
  level: number
  projectId: string
  taskId?: string
  taskNumber?: number
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-blue-100 text-blue-800 border-blue-400',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-400',
  high: 'bg-orange-100 text-orange-800 border-orange-400',
  urgent: 'bg-red-100 text-red-800 border-red-500',
}

const CATEGORY_OPTIONS = [
  'Personal',
  'Wife',
  'Health - Body',
  'Health - Mind',
  'Personal Brand',
  'Pilot',
  'Marketing Business',
  'Fun',
  'Finances',
  'Relations',
  'Chores',
] as const

const categoryColors: Record<string, string> = {
  'Personal': 'bg-blue-100 text-blue-800 border-blue-400',
  'Wife': 'bg-rose-100 text-rose-800 border-rose-400',
  'Health - Body': 'bg-emerald-100 text-emerald-800 border-emerald-400',
  'Health - Mind': 'bg-sky-100 text-sky-800 border-sky-400',
  'Personal Brand': 'bg-purple-100 text-purple-800 border-purple-400',
  'Pilot': 'bg-indigo-100 text-indigo-800 border-indigo-400',
  'Marketing Business': 'bg-amber-100 text-amber-800 border-amber-400',
  'Fun': 'bg-orange-100 text-orange-800 border-orange-400',
  'Finances': 'bg-green-100 text-green-800 border-green-400',
  'Relations': 'bg-pink-100 text-pink-800 border-pink-400',
  'Chores': 'bg-slate-100 text-slate-800 border-slate-400',
}

// Format date like Jira: 17/Nov/2025
const formatJiraDate = (dateString: string): string => {
  if (!dateString || dateString.trim() === '') {
    return '-'
  }
  
  // Handle YYYY-MM-DD format - parse in local timezone to avoid UTC conversion issues
  let dateStr = dateString.includes('T') ? dateString.split('T')[0] : dateString.trim()
  dateStr = dateStr.split(' ')[0].trim()
  
  // Validate date string format (should be YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    console.warn('Invalid date format in formatJiraDate:', dateString)
    return '-'
  }
  
  // Create date in local timezone to avoid UTC conversion issues
  const parts = dateStr.split('-')
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  
  // Validate parsed values
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    console.warn('Invalid date values in formatJiraDate:', { year, month, day, dateString })
    return '-'
  }
  
  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  
  // Validate the date object
  if (isNaN(date.getTime())) {
    console.warn('Invalid date object created in formatJiraDate:', { year, month, day, dateString })
    return '-'
  }
  
  const dayNum = date.getDate()
  const monthStr = date.toLocaleDateString('en-US', { month: 'short' })
  const yearNum = date.getFullYear()
  
  return `${dayNum}/${monthStr}/${yearNum}`
}

// Get priority icon
const getPriorityIcon = (priority: TaskPriority = 'medium') => {
  if (priority === 'urgent') {
    return (
      <svg className="w-3.5 h-3.5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    )
  } else if (priority === 'high') {
    return (
      <svg className="w-3.5 h-3.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  } else if (priority === 'low') {
    return (
      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  } else {
    return (
      <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    )
  }
}

// Calculate progress percentage
const calculateProgress = (item: GanttProject | GanttTask | GanttSubtask): number => {
  if ('children' in item) {
    const children = item.children
    if (children.length === 0) return 0
    const completed = children.filter((child: any) => child.completed).length
    return Math.round((completed / children.length) * 100)
  }
  return 0
}

// Status options
const STATUS_OPTIONS: { value: GanttStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'sprint', label: 'Sprint', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'today', label: 'Today', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'active', label: 'Active', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'refinement', label: 'Refinement', color: 'bg-amber-300 text-amber-900 border-amber-500' },
]

// Get status - use stored status if available, otherwise calculate from dates
const getStatus = (item: GanttProject | GanttTask | GanttSubtask): { label: string; color: string; value: GanttStatus } => {
  // Check if item has a stored status
  const storedStatus = 'status' in item ? item.status : undefined
  
  if (storedStatus) {
    const statusOption = STATUS_OPTIONS.find(s => s.value === storedStatus)
    if (statusOption) {
      return { label: statusOption.label, color: statusOption.color, value: storedStatus }
    }
  }
  
  // Fall back to date-based calculation if no stored status
  const today = new Date().toISOString().split('T')[0]
  const startDate = 'startDate' in item ? item.startDate : ''
  const endDate = 'endDate' in item ? item.endDate : ''
  
  // If dates are empty, return Backlog
  if (!startDate || !endDate || startDate === '' || endDate === '') {
    return { label: 'Backlog', color: 'bg-purple-100 text-purple-800 border-purple-200', value: 'backlog' }
  }
  
  if (endDate < today) {
    return { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200', value: 'completed' }
  } else if (startDate <= today && today <= endDate) {
    return { label: 'Active', color: 'bg-blue-100 text-blue-800 border-blue-200', value: 'active' }
  } else {
    return { label: 'Backlog', color: 'bg-purple-100 text-purple-800 border-purple-200', value: 'backlog' }
  }
}

// Get flag color based on due date proximity
const getDueDateFlag = (endDate: string): { color: string; label: string } | null => {
  if (!endDate || endDate === '') {
    return null
  }

  try {
    // Get today's date at midnight in local timezone
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    today.setHours(0, 0, 0, 0) // Ensure it's exactly midnight
    
    // Parse the end date - handle YYYY-MM-DD format
    let dateString = endDate.includes('T') ? endDate.split('T')[0] : endDate.trim()
    
    // Remove any time portion if present
    dateString = dateString.split(' ')[0].trim()
    
    // Validate date string format (should be YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      console.warn('Invalid date format:', dateString, 'from endDate:', endDate)
      return null
    }
    
    // Create date in local timezone to avoid UTC conversion issues
    const parts = dateString.split('-')
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)
    
    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      console.warn('Invalid date values:', { year, month, day, dateString })
      return null
    }
    
    const dueDate = new Date(year, month - 1, day)
    dueDate.setHours(0, 0, 0, 0) // Ensure it's exactly midnight
    
    // Validate the date object
    if (isNaN(dueDate.getTime())) {
      console.warn('Invalid date object created from:', { year, month, day, dateString })
      return null
    }
    
    // If due date is in the past, return null (no flag)
    if (dueDate < today) {
      return null
    }

    // Calculate difference in days using Math.round for more accurate calculation
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
    console.error('Error calculating flag color:', error, { endDate })
    return null
  }
}

// Get short key from ID
const getKey = (id: string, type: 'project' | 'task' | 'subtask'): string => {
  const prefix = type === 'project' ? 'PRJ' : type === 'task' ? 'TSK' : 'SUB'
  return `${prefix}-${id.slice(0, 6).toUpperCase()}`
}

const STORY_POINTS: StoryPoint[] = [0.5, 1, 2, 3, 5, 8]

// Hours options from 1 to 30
const HOUR_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1).map(hours => ({
  hours,
  label: hours === 1 ? '1 hr' : `${hours} hrs`,
  storyPoints: hours / 2 as StoryPoint, // Simple mapping: 2 hours = 1 story point
}))

// Convert story points to hours (for display)
// Direct mapping: 1 story point = 1 hour
const storyPointsToHours = (points?: number): number => {
  if (!points || points <= 0) return 1 // Default to 1 hour if no points
  // Direct mapping: story points = hours
  return Math.max(1, Math.min(30, Math.round(points)))
}

// Convert hours back to story points (for saving)
// Direct mapping: 1 hour = 1 story point
const hoursToStoryPoints = (hours: number): number | undefined => {
  if (!hours || hours <= 0) return undefined
  // Direct mapping: hours = story points (store hours directly)
  return hours
}

type SortFilter =
  | 'none'
  | 'nameAsc'
  | 'nameDesc'
  | 'closestDueDate'
  | 'furthestDueDate'
  | 'earliestStartDate'
  | 'latestStartDate'
  | 'highestPriority'
  | 'lowestPriority'
  | 'highestPoints'
  | 'lowestPoints'
  | 'status'
  | 'category'
  | 'progressDesc'
  | 'progressAsc'

// Format hours to human-readable time estimate
const formatHours = (hours: number): string => {
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return minutes === 30 ? '30 min' : `${minutes} min`
  } else if (hours < 24) {
    // Show hours for anything less than 24 hours (1 day)
    const rounded = Math.round(hours * 10) / 10
    return rounded === 1 ? '1 hr' : `${rounded} hrs`
  } else if (hours < 40) {
    // Show days for 24+ hours but less than 1 week (40 hours)
    const days = Math.round((hours / 8) * 10) / 10
    return days === 1 ? '1 day' : `${days} days`
  } else {
    // Show weeks for 40+ hours (1 week or more)
    const weeks = Math.round((hours / 40) * 10) / 10
    return weeks === 1 ? '1 week' : `${weeks} weeks`
  }
}

// Map story points to human-friendly time estimates
// 1 story point = 1 hour (direct mapping)
const getTimeEstimateFromPoints = (points?: number): string => {
  if (points === undefined || points === null || points <= 0) return '-'

  // Direct mapping: 1 story point = 1 hour
  const totalHours = points
  return formatHours(totalHours)
}

export default function Projects2Page() {
  const { projects, addProject, addTask, addSubtask, updateProject, updateTask, updateSubtask, deleteProject, deleteTask, deleteSubtask, reorderProjects, reorderTasks, reorderSubtasks } = useGanttContext()
  
  // Manually update App task's due date to 2026-12-26
  // This runs once when component mounts and projects are loaded
  const [hasUpdatedAppTask, setHasUpdatedAppTask] = useState(false)
  useEffect(() => {
    if (projects.length === 0 || hasUpdatedAppTask) return
    
    const marcaPersonal = projects.find(p => p.name === 'Marca Personal' || p.name?.includes('Marca Personal'))
    if (marcaPersonal) {
      const appTask = marcaPersonal.children?.find(t => t.name === 'App' || t.name?.includes('App'))
      if (appTask && appTask.endDate !== '2026-12-26') {
        console.log('🔧 MANUALLY setting App task endDate to 2026-12-26')
        console.log('Current task endDate:', appTask.endDate)
        console.log('Current project endDate:', marcaPersonal.endDate)
        console.log('Task has subtasks:', appTask.children?.length || 0)
        
        // CRITICAL: First ensure project endDate is at least 2026-12-31
        const requiredProjectEndDate = '2026-12-31'
        if (!marcaPersonal.endDate || marcaPersonal.endDate < requiredProjectEndDate) {
          console.log('⚠️ Project endDate is', marcaPersonal.endDate, '- extending to', requiredProjectEndDate)
          updateProject(marcaPersonal.id, { endDate: requiredProjectEndDate })
        }
        
        // Also update all subtasks to have endDate of 2026-12-26 or later to prevent recalculation
        if (appTask.children && appTask.children.length > 0) {
          console.log('⚠️ Task has subtasks - updating them first to prevent date recalculation')
          appTask.children.forEach((subtask, index) => {
            if (!subtask.endDate || subtask.endDate < '2026-12-26') {
              updateSubtask(marcaPersonal.id, appTask.id, subtask.id, { endDate: '2026-12-26' })
            }
          })
        }
        
        // Wait a bit for updates to complete, then update task
        setTimeout(() => {
          updateTask(marcaPersonal.id, appTask.id, { endDate: '2026-12-26' })
          console.log('✅ Set App task endDate to 2026-12-26')
          setHasUpdatedAppTask(true)
        }, 300)
      } else if (appTask && appTask.endDate === '2026-12-26') {
        setHasUpdatedAppTask(true)
      }
    }
  }, [projects, updateTask, updateProject, updateSubtask, hasUpdatedAppTask])
  
  // Auto-update verified status for tasks with subtasks and projects
  useEffect(() => {
    projects.forEach(project => {
      // Check if all tasks are verified (for project verification)
      const tasks = project.children || []
      if (tasks.length > 0) {
        const allTasksVerified = tasks.every(task => {
          // For tasks with subtasks, check if all subtasks are verified
          if (task.children && task.children.length > 0) {
            return task.children.every(subtask => subtask.verified === true)
          }
          // For tasks without subtasks, check task's verified status
          return task.verified === true
        })
        
        // Update project verified status if it doesn't match
        if (project.verified !== allTasksVerified) {
          updateProject(project.id, { verified: allTasksVerified })
        }
      } else {
        // No tasks, project should not be verified
        if (project.verified !== false) {
          updateProject(project.id, { verified: false })
        }
      }
      
      // Check each task with subtasks
      tasks.forEach(task => {
        const hasSubtasks = task.children && task.children.length > 0
        if (hasSubtasks) {
          const allSubtasksVerified = task.children!.every(subtask => subtask.verified === true)
          // Update task verified status if it doesn't match
          if (task.verified !== allSubtasksVerified) {
            updateTask(project.id, task.id, { verified: allSubtasksVerified })
          }
        }
      })
    })
  }, [projects, updateProject, updateTask])
  
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [selectedRow, setSelectedRow] = useState<string | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<{ type: 'project' | 'task' | 'subtask'; id: string; projectId?: string; taskId?: string } | null>(null)
  const [editingName, setEditingName] = useState<string>('')
  const [editingDateField, setEditingDateField] = useState<{ rowId: string; field: 'startDate' | 'endDate' } | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ type: 'project' | 'task' | 'subtask'; id: string; name: string; projectId?: string; taskId?: string } | null>(null)
  // Track rows created in this session whose dates should start visually empty
  const [rowsWithEmptyDates, setRowsWithEmptyDates] = useState<Set<string>>(new Set())
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null)
  const [dropZoneRowId, setDropZoneRowId] = useState<string | null>(null)
  const [dropZonePosition, setDropZonePosition] = useState<'above' | 'below' | null>(null)
  const draggedElementRef = useRef<HTMLElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const dateInputTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const datePickerTriggerRef = useRef<HTMLDivElement>(null)
  const [sortFilter, setSortFilter] = useState<SortFilter>('none')
  const isCreatingProjectRef = useRef<boolean>(false)
  
  // Filter states
  const [filterProjectName, setFilterProjectName] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<GanttStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterDueDate, setFilterDueDate] = useState<'all' | 'today' | 'thisWeek' | 'thisMonth' | 'overdue'>('all')
  const [filterShowOnly, setFilterShowOnly] = useState<'all' | 'projects' | 'tasks' | 'subtasks'>('all')
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [showProjectSelector, setShowProjectSelector] = useState<boolean>(false)

  // Auto-expand all projects on mount
  useEffect(() => {
    setExpandedProjects(new Set(projects.map(p => p.id)))
  }, [projects.length])

  // Initialize selected projects to all projects on mount
  useEffect(() => {
    if (projects.length > 0 && selectedProjects.size === 0) {
      setSelectedProjects(new Set(projects.map(p => p.id)))
    }
  }, [projects])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dateInputTimeoutRef.current) {
        clearTimeout(dateInputTimeoutRef.current)
      }
    }
  }, [])

  // Handle click outside to close date picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!editingDateField) return
      
      const target = event.target as HTMLElement
      
      // Don't close if clicking on the date picker or its trigger
      if (target.closest('.date-picker-container') || target.closest('[data-date-picker]')) {
        return
      }
      
      setEditingDateField(null)
    }

    if (editingDateField) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [editingDateField])

  // Auto-focus input when editing starts
  useEffect(() => {
    if (editingItem && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingItem])

  // Handle saving edited name
  const handleSaveName = () => {
    if (!editingItem) return
    
    const trimmedName = editingName.trim()
    if (trimmedName && trimmedName !== name) {
      // Directly save without confirmation
      if (editingItem.type === 'project') {
        updateProject(editingItem.id, { name: trimmedName })
      } else if (editingItem.type === 'task') {
        updateTask(editingItem.projectId!, editingItem.id, { name: trimmedName })
      } else if (editingItem.type === 'subtask') {
        updateSubtask(editingItem.projectId!, editingItem.taskId!, editingItem.id, { name: trimmedName })
      }
    }
    setEditingItem(null)
    setEditingName('')
  }

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingItem(null)
    setEditingName('')
  }

  // Handle field edit - directly save without confirmation
  const handleFieldChange = (field: string, newValue: any, row: TableRow) => {
    if (field === 'startDate' || field === 'endDate') {
      // Once user sets a date for this row, stop treating it as "new" with empty dates
      setRowsWithEmptyDates(prev => {
        if (!prev.has(row.id)) return prev
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
      if (row.type === 'project') {
        updateProject(row.id, { [field]: newValue })
      } else if (row.type === 'task') {
        updateTask(row.projectId, row.id, { [field]: newValue })
      } else if (row.type === 'subtask') {
        updateSubtask(row.projectId, row.taskId!, row.id, { [field]: newValue })
      }
    } else if (field === 'status') {
      if (row.type === 'project') {
        updateProject(row.id, { status: newValue as GanttStatus })
      } else if (row.type === 'task') {
        updateTask(row.projectId, row.id, { status: newValue as GanttStatus })
      } else if (row.type === 'subtask') {
        updateSubtask(row.projectId, row.taskId!, row.id, { status: newValue as GanttStatus })
      }
    } else if (field === 'priority') {
      if (row.type === 'project') {
        updateProject(row.id, { priority: newValue as TaskPriority })
      } else if (row.type === 'task') {
        updateTask(row.projectId, row.id, { priority: newValue as TaskPriority })
      } else if (row.type === 'subtask') {
        updateSubtask(row.projectId, row.taskId!, row.id, { priority: newValue as TaskPriority })
      }
    } else if (field === 'storyPoints') {
      if (row.type === 'task') {
        updateTask(row.projectId, row.id, { totalPoints: newValue })
      } else if (row.type === 'subtask') {
        updateSubtask(row.projectId, row.taskId!, row.id, { storyPoints: newValue })
      }
    } else if (field === 'verified') {
      if (row.type === 'project') {
        updateProject(row.id, { verified: newValue as boolean })
      } else if (row.type === 'task') {
        updateTask(row.projectId, row.id, { verified: newValue as boolean })
      } else if (row.type === 'subtask') {
        updateSubtask(row.projectId, row.taskId!, row.id, { verified: newValue as boolean })
      }
    }
  }

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

  const handleExpandAll = () => {
    // Expand all projects
    setExpandedProjects(new Set(projects.map(p => p.id)))
    // Expand only tasks that actually have subtasks
    const taskIdsWithSubtasks = projects.flatMap(project =>
      project.children.filter(task => task.children && task.children.length > 0).map(task => task.id)
    )
    setExpandedTasks(new Set(taskIdsWithSubtasks))
  }

  const handleCollapseAll = () => {
    // Collapse all projects (which will also hide tasks and subtasks)
    setExpandedProjects(new Set())
    setExpandedTasks(new Set())
  }

  // Helper functions to get current indices for reordering
  const getProjectIndex = (projectId: string): number => {
    return projects.findIndex(p => p.id === projectId)
  }

  const getTaskIndex = (projectId: string, taskId: string): number => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return -1
    return project.children.findIndex(t => t.id === taskId)
  }

  const getSubtaskIndex = (projectId: string, taskId: string, subtaskId: string): number => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return -1
    const task = project.children.find(t => t.id === taskId)
    if (!task) return -1
    return task.children.findIndex(st => st.id === subtaskId)
  }

  // Move handlers
  const handleMoveUp = (tableRow: TableRow) => {
    if (tableRow.type === 'project') {
      const currentIndex = getProjectIndex(tableRow.id)
      if (currentIndex > 0) {
        reorderProjects(currentIndex, currentIndex - 1)
      }
    } else if (tableRow.type === 'task') {
      const currentIndex = getTaskIndex(tableRow.projectId, tableRow.id)
      if (currentIndex > 0) {
        reorderTasks(tableRow.projectId, currentIndex, currentIndex - 1)
      }
    } else if (tableRow.type === 'subtask') {
      const currentIndex = getSubtaskIndex(tableRow.projectId, tableRow.taskId!, tableRow.id)
      if (currentIndex > 0) {
        reorderSubtasks(tableRow.projectId, tableRow.taskId!, currentIndex, currentIndex - 1)
      }
    }
  }

  const handleMoveDown = (tableRow: TableRow) => {
    if (tableRow.type === 'project') {
      const currentIndex = getProjectIndex(tableRow.id)
      const project = projects.find(p => p.id === tableRow.id)
      if (currentIndex >= 0 && currentIndex < projects.length - 1) {
        reorderProjects(currentIndex, currentIndex + 1)
      }
    } else if (tableRow.type === 'task') {
      const currentIndex = getTaskIndex(tableRow.projectId, tableRow.id)
      const project = projects.find(p => p.id === tableRow.projectId)
      const task = project?.children.find(t => t.id === tableRow.id)
      if (currentIndex >= 0 && project && currentIndex < project.children.length - 1) {
        reorderTasks(tableRow.projectId, currentIndex, currentIndex + 1)
      }
    } else if (tableRow.type === 'subtask') {
      const currentIndex = getSubtaskIndex(tableRow.projectId, tableRow.taskId!, tableRow.id)
      const project = projects.find(p => p.id === tableRow.projectId)
      const task = project?.children.find(t => t.id === tableRow.taskId)
      if (currentIndex >= 0 && task && currentIndex < task.children.length - 1) {
        reorderSubtasks(tableRow.projectId, tableRow.taskId!, currentIndex, currentIndex + 1)
      }
    }
  }

  // Check if item can move up/down
  const canMoveUp = (tableRow: TableRow): boolean => {
    if (tableRow.type === 'project') {
      return getProjectIndex(tableRow.id) > 0
    } else if (tableRow.type === 'task') {
      return getTaskIndex(tableRow.projectId, tableRow.id) > 0
    } else if (tableRow.type === 'subtask') {
      return getSubtaskIndex(tableRow.projectId, tableRow.taskId!, tableRow.id) > 0
    }
    return false
  }

  const canMoveDown = (tableRow: TableRow): boolean => {
    if (tableRow.type === 'project') {
      const currentIndex = getProjectIndex(tableRow.id)
      return currentIndex >= 0 && currentIndex < projects.length - 1
    } else if (tableRow.type === 'task') {
      const project = projects.find(p => p.id === tableRow.projectId)
      const currentIndex = getTaskIndex(tableRow.projectId, tableRow.id)
      return currentIndex >= 0 && project && currentIndex < project.children.length - 1
    } else if (tableRow.type === 'subtask') {
      const project = projects.find(p => p.id === tableRow.projectId)
      const task = project?.children.find(t => t.id === tableRow.taskId)
      const currentIndex = getSubtaskIndex(tableRow.projectId, tableRow.taskId!, tableRow.id)
      return currentIndex >= 0 && task && currentIndex < task.children.length - 1
    }
    return false
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, tableRow: TableRow) => {
    // Don't drag if clicking on buttons or inputs
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('select')) {
      e.preventDefault()
      return
    }
    
    // Don't allow dragging empty-subtask rows
    if (tableRow.type === 'empty-subtask') {
      e.preventDefault()
      return
    }
    
    setDraggedRowId(tableRow.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', tableRow.id)
    
    // Store reference to dragged element and make it semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      draggedElementRef.current = e.currentTarget
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragOver = (e: React.DragEvent, tableRow: TableRow) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedRowId || draggedRowId === tableRow.id) {
      setDropZoneRowId(null)
      setDropZonePosition(null)
      return
    }
    
    // Find the dragged row
    const draggedRow = rows.find(r => r.type !== 'spacer' && (r as TableRow).id === draggedRowId) as TableRow | undefined
    if (!draggedRow) return
    
    // Only allow reordering within the same type and hierarchy level
    if (draggedRow.type !== tableRow.type) {
      setDropZoneRowId(null)
      setDropZonePosition(null)
      return
    }
    
    // Validate hierarchy constraints
    if (draggedRow.type === 'task' && draggedRow.projectId !== tableRow.projectId) {
      setDropZoneRowId(null)
      setDropZonePosition(null)
      return
    }
    
    if (draggedRow.type === 'subtask' && (draggedRow.projectId !== tableRow.projectId || draggedRow.taskId !== tableRow.taskId)) {
      setDropZoneRowId(null)
      setDropZonePosition(null)
      return
    }
    
    // Determine drop position based on mouse Y position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mouseY = e.clientY
    const rowMiddle = rect.top + rect.height / 2
    
    setDropZoneRowId(tableRow.id)
    setDropZonePosition(mouseY < rowMiddle ? 'above' : 'below')
  }

  const handleDragLeave = () => {
    // Only clear if not hovering over another valid drop target
    // This prevents flickering
  }

  const handleDrop = (e: React.DragEvent, targetRow: TableRow) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedRowId || !dropZoneRowId || draggedRowId === targetRow.id) {
      setDraggedRowId(null)
      setDropZoneRowId(null)
      setDropZonePosition(null)
      return
    }
    
    const draggedRow = rows.find(r => r.type !== 'spacer' && (r as TableRow).id === draggedRowId) as TableRow | undefined
    if (!draggedRow) {
      setDraggedRowId(null)
      setDropZoneRowId(null)
      setDropZonePosition(null)
      return
    }
    
    // Validate same type and hierarchy
    if (draggedRow.type !== targetRow.type) {
      setDraggedRowId(null)
      setDropZoneRowId(null)
      setDropZonePosition(null)
      return
    }
    
    // Get indices
    let fromIndex = -1
    let toIndex = -1
    
    if (draggedRow.type === 'project') {
      fromIndex = getProjectIndex(draggedRow.id)
      toIndex = getProjectIndex(targetRow.id)
      // Adjust toIndex based on drop position
      if (dropZonePosition === 'below') {
        toIndex += 1
      }
      // If dragging down, adjust for the removed item
      if (fromIndex < toIndex) {
        toIndex -= 1
      }
    } else if (draggedRow.type === 'task') {
      fromIndex = getTaskIndex(draggedRow.projectId, draggedRow.id)
      toIndex = getTaskIndex(targetRow.projectId, targetRow.id)
      // Adjust toIndex based on drop position
      if (dropZonePosition === 'below') {
        toIndex += 1
      }
      // If dragging down, adjust for the removed item
      if (fromIndex < toIndex) {
        toIndex -= 1
      }
    } else if (draggedRow.type === 'subtask') {
      fromIndex = getSubtaskIndex(draggedRow.projectId, draggedRow.taskId!, draggedRow.id)
      toIndex = getSubtaskIndex(targetRow.projectId, targetRow.taskId!, targetRow.id)
      // Adjust toIndex based on drop position
      if (dropZonePosition === 'below') {
        toIndex += 1
      }
      // If dragging down, adjust for the removed item
      if (fromIndex < toIndex) {
        toIndex -= 1
      }
    }
    
    // Perform reorder
    if (fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0) {
      if (draggedRow.type === 'project') {
        const project = projects.find(p => p.id === draggedRow.id)
        if (project && toIndex >= 0 && toIndex <= projects.length) {
          reorderProjects(fromIndex, toIndex)
        }
      } else if (draggedRow.type === 'task') {
        const project = projects.find(p => p.id === draggedRow.projectId)
        const task = project?.children.find(t => t.id === draggedRow.id)
        if (task && toIndex >= 0 && toIndex <= (project?.children.length || 0)) {
          reorderTasks(draggedRow.projectId, fromIndex, toIndex)
        }
      } else if (draggedRow.type === 'subtask') {
        const project = projects.find(p => p.id === draggedRow.projectId)
        const task = project?.children.find(t => t.id === draggedRow.taskId)
        const subtask = task?.children.find(st => st.id === draggedRow.id)
        if (subtask && toIndex >= 0 && toIndex <= (task?.children.length || 0)) {
          reorderSubtasks(draggedRow.projectId, draggedRow.taskId!, fromIndex, toIndex)
        }
      }
    }
    
    // Reset opacity before clearing state
    if (draggedElementRef.current) {
      draggedElementRef.current.style.opacity = '1'
      draggedElementRef.current = null
    }
    
    setDraggedRowId(null)
    setDropZoneRowId(null)
    setDropZonePosition(null)
  }

  const handleDragEnd = () => {
    // Reset opacity
    if (draggedElementRef.current) {
      draggedElementRef.current.style.opacity = '1'
      draggedElementRef.current = null
    }
    
    setDraggedRowId(null)
    setDropZoneRowId(null)
    setDropZonePosition(null)
  }

  // Helpers for filters (used to sort tasks and subtasks within each project)
  const getTaskPriorityRank = (task: GanttTask): number => {
    // @ts-expect-error priority may exist on GanttTask at runtime
    const priority = (task.priority as TaskPriority | undefined) || undefined
    if (!priority) return -1
    if (priority === 'urgent') return 3
    if (priority === 'high') return 2
    if (priority === 'medium') return 1
    return 0 // low
  }

  const getTaskPoints = (task: GanttTask): number => {
    if (task.children && task.children.length > 0) {
      return task.children.reduce((total, st) => total + (st.storyPoints || 0), 0)
    }
    // @ts-expect-error totalPoints may exist at runtime
    return Number(task.totalPoints || 0)
  }

  // Helper to check if a row matches filters
  const matchesFilters = (row: TableRow): boolean => {
    // Filter by project name
    if (filterProjectName && !row.data?.name.toLowerCase().includes(filterProjectName.toLowerCase())) {
      return false
    }
    
    // Filter by status
    if (filterStatus !== 'all') {
      const rowStatus = 'status' in row.data ? row.data.status : undefined
      if (rowStatus !== filterStatus) {
        return false
      }
    }
    
    // Filter by priority
    if (filterPriority !== 'all') {
      const rowPriority = 'priority' in row.data ? row.data.priority : undefined
      if (rowPriority !== filterPriority) {
        return false
      }
    }
    
    // Filter by category
    if (filterCategory !== 'all') {
      const rowCategory = 'category' in row.data ? row.data.category : undefined
      if (rowCategory !== filterCategory) {
        return false
      }
    }
    
    // Filter by due date
    if (filterDueDate !== 'all' && row.data) {
      const endDate = 'endDate' in row.data ? row.data.endDate : ''
      if (!endDate || endDate === '') {
        if (filterDueDate !== 'overdue') return false
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dueDate = parseDateString(endDate)
        
        if (filterDueDate === 'today') {
          if (dueDate.getTime() !== today.getTime()) return false
        } else if (filterDueDate === 'thisWeek') {
          const weekEnd = new Date(today)
          weekEnd.setDate(today.getDate() + (7 - today.getDay()))
          if (dueDate < today || dueDate > weekEnd) return false
        } else if (filterDueDate === 'thisMonth') {
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          if (dueDate < today || dueDate > monthEnd) return false
        } else if (filterDueDate === 'overdue') {
          if (dueDate >= today) return false
        }
      }
    }
    
    // Filter by show only
    if (filterShowOnly !== 'all') {
      if (filterShowOnly === 'projects' && row.type !== 'project') return false
      if (filterShowOnly === 'tasks' && row.type !== 'task') return false
      if (filterShowOnly === 'subtasks' && row.type !== 'subtask') return false
    }
    
    return true
  }
  
  // Helper to parse date string
  // Helper function to validate and clean date strings
  const validateAndCleanDate = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr.trim() === '') {
      return ''
    }
    
    // Handle YYYY-MM-DD format - parse in local timezone
    let dateString = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim()
    dateString = dateString.split(' ')[0].trim()
    
    // Validate date string format (should be YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      console.warn('Invalid date format detected, clearing:', dateStr)
      return ''
    }
    
    // Create date in local timezone to validate
    const parts = dateString.split('-')
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)
    
    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      console.warn('Invalid date values detected, clearing:', { year, month, day, dateString })
      return ''
    }
    
    const date = new Date(year, month - 1, day)
    date.setHours(0, 0, 0, 0)
    
    // Validate the date object
    if (isNaN(date.getTime())) {
      console.warn('Invalid date object created, clearing:', { year, month, day, dateString })
      return ''
    }
    
    return dateString
  }

  const parseDateString = (dateStr: string): Date => {
    if (!dateStr || dateStr.trim() === '') {
      return new Date()
    }
    const dateString = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return new Date()
    }
    const parts = dateString.split('-')
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)
    const date = new Date(year, month - 1, day)
    date.setHours(0, 0, 0, 0)
    return date
  }

  // Build flat table rows from hierarchical data, applying sorting within each project
  const buildTableRows = (): (TableRow | { type: 'spacer' })[] => {
    const rows: (TableRow | { type: 'spacer' })[] = []
    
    // Filter projects first
    let filteredProjects = projects
    
    // Filter by selected projects
    if (selectedProjects.size > 0) {
      filteredProjects = filteredProjects.filter(p => selectedProjects.has(p.id))
    }
    
    // Filter by project name at project level
    if (filterProjectName) {
      filteredProjects = filteredProjects.filter(p => 
        p.name.toLowerCase().includes(filterProjectName.toLowerCase())
      )
    }
    
    // Sort projects
    if (sortFilter !== 'none') {
      filteredProjects = [...filteredProjects].sort((a, b) => {
        if (sortFilter === 'nameAsc') {
          return (a.name || '').localeCompare(b.name || '')
        } else if (sortFilter === 'nameDesc') {
          return (b.name || '').localeCompare(a.name || '')
        } else if (sortFilter === 'closestDueDate') {
          const aDate = a.endDate ? parseDateString(a.endDate).getTime() : Infinity
          const bDate = b.endDate ? parseDateString(b.endDate).getTime() : Infinity
          return aDate - bDate
        } else if (sortFilter === 'furthestDueDate') {
          const aDate = a.endDate ? parseDateString(a.endDate).getTime() : -Infinity
          const bDate = b.endDate ? parseDateString(b.endDate).getTime() : -Infinity
          return bDate - aDate
        } else if (sortFilter === 'earliestStartDate') {
          const aDate = a.startDate ? parseDateString(a.startDate).getTime() : Infinity
          const bDate = b.startDate ? parseDateString(b.startDate).getTime() : Infinity
          return aDate - bDate
        } else if (sortFilter === 'latestStartDate') {
          const aDate = a.startDate ? parseDateString(a.startDate).getTime() : -Infinity
          const bDate = b.startDate ? parseDateString(b.startDate).getTime() : -Infinity
          return bDate - aDate
        } else if (sortFilter === 'highestPriority') {
          const aRank = getProjectPriorityRank(a)
          const bRank = getProjectPriorityRank(b)
          return bRank - aRank
        } else if (sortFilter === 'lowestPriority') {
          const aRank = getProjectPriorityRank(a)
          const bRank = getProjectPriorityRank(b)
          return aRank - bRank
        } else if (sortFilter === 'status') {
          const aStatus = a.status || ''
          const bStatus = b.status || ''
          return aStatus.localeCompare(bStatus)
        } else if (sortFilter === 'category') {
          const aCat = a.category || ''
          const bCat = b.category || ''
          return aCat.localeCompare(bCat)
        } else if (sortFilter === 'progressDesc') {
          return calculateProgress(b) - calculateProgress(a)
        } else if (sortFilter === 'progressAsc') {
          return calculateProgress(a) - calculateProgress(b)
        }
        return 0
      })
    }
    
    filteredProjects.forEach((project, projectIndex) => {
      // Check if project matches filters
      const projectRow: TableRow = {
        id: project.id,
        type: 'project',
        data: project,
        level: 0,
        projectId: project.id,
      }
      
      if (!matchesFilters(projectRow) && filterShowOnly !== 'tasks' && filterShowOnly !== 'subtasks') {
        // If filtering for tasks/subtasks only, still process to check children
        if (filterShowOnly === 'all' || filterShowOnly === 'projects') {
          return
        }
      }
      
      // Add project row (if not filtering for tasks/subtasks only)
      if (filterShowOnly !== 'tasks' && filterShowOnly !== 'subtasks') {
        rows.push(projectRow)
      }

      // Add task rows if project is expanded
      if (expandedProjects.has(project.id)) {
        let projectTasks = [...(project.children || [])]

        // Sort tasks
        if (sortFilter !== 'none') {
          projectTasks.sort((a, b) => {
            if (sortFilter === 'nameAsc') {
              return (a.name || '').localeCompare(b.name || '')
            } else if (sortFilter === 'nameDesc') {
              return (b.name || '').localeCompare(a.name || '')
            } else if (sortFilter === 'closestDueDate') {
              const aDate = a.endDate ? parseDateString(a.endDate).getTime() : Infinity
              const bDate = b.endDate ? parseDateString(b.endDate).getTime() : Infinity
              return aDate - bDate
            } else if (sortFilter === 'furthestDueDate') {
              const aDate = a.endDate ? parseDateString(a.endDate).getTime() : -Infinity
              const bDate = b.endDate ? parseDateString(b.endDate).getTime() : -Infinity
              return bDate - aDate
            } else if (sortFilter === 'earliestStartDate') {
              const aDate = a.startDate ? parseDateString(a.startDate).getTime() : Infinity
              const bDate = b.startDate ? parseDateString(b.startDate).getTime() : Infinity
              return aDate - bDate
            } else if (sortFilter === 'latestStartDate') {
              const aDate = a.startDate ? parseDateString(a.startDate).getTime() : -Infinity
              const bDate = b.startDate ? parseDateString(b.startDate).getTime() : -Infinity
              return bDate - aDate
            } else if (sortFilter === 'highestPriority') {
              return getTaskPriorityRank(b) - getTaskPriorityRank(a)
        } else if (sortFilter === 'lowestPriority') {
              return getTaskPriorityRank(a) - getTaskPriorityRank(b)
        } else if (sortFilter === 'highestPoints') {
              return getTaskPoints(b) - getTaskPoints(a)
        } else if (sortFilter === 'lowestPoints') {
              return getTaskPoints(a) - getTaskPoints(b)
            } else if (sortFilter === 'status') {
              const aStatus = a.status || ''
              const bStatus = b.status || ''
              return aStatus.localeCompare(bStatus)
            } else if (sortFilter === 'category') {
              const aCat = a.category || ''
              const bCat = b.category || ''
              return aCat.localeCompare(bCat)
            } else if (sortFilter === 'progressDesc') {
              return calculateProgress(b) - calculateProgress(a)
            } else if (sortFilter === 'progressAsc') {
              return calculateProgress(a) - calculateProgress(b)
            }
            return 0
          })
        }

        projectTasks.forEach((task, taskIndex) => {
          const taskRow: TableRow = {
            id: task.id,
            type: 'task',
            data: task,
            parentId: project.id,
            level: 1,
            projectId: project.id,
            taskId: task.id,
            taskNumber: taskIndex + 1,
          }
          
          // Check if task matches filters
          if (!matchesFilters(taskRow) && filterShowOnly !== 'projects' && filterShowOnly !== 'subtasks') {
            // If filtering for subtasks only, still process to check children
            if (filterShowOnly === 'all' || filterShowOnly === 'tasks') {
              return
            }
          }
          
          // Add task row (if not filtering for projects/subtasks only)
          if (filterShowOnly !== 'projects' && filterShowOnly !== 'subtasks') {
            rows.push(taskRow)
          }

          // Add subtask rows if task is expanded and has subtasks
          if (expandedTasks.has(task.id) && task.children.length > 0) {
            let subtasks = [...task.children]

            // Sort subtasks
            if (sortFilter !== 'none') {
              subtasks.sort((a, b) => {
                if (sortFilter === 'nameAsc') {
                  return (a.name || '').localeCompare(b.name || '')
                } else if (sortFilter === 'nameDesc') {
                  return (b.name || '').localeCompare(a.name || '')
                } else if (sortFilter === 'closestDueDate') {
                  const aDate = a.endDate ? parseDateString(a.endDate).getTime() : Infinity
                  const bDate = b.endDate ? parseDateString(b.endDate).getTime() : Infinity
                  return aDate - bDate
                } else if (sortFilter === 'furthestDueDate') {
                  const aDate = a.endDate ? parseDateString(a.endDate).getTime() : -Infinity
                  const bDate = b.endDate ? parseDateString(b.endDate).getTime() : -Infinity
                  return bDate - aDate
                } else if (sortFilter === 'earliestStartDate') {
                  const aDate = a.startDate ? parseDateString(a.startDate).getTime() : Infinity
                  const bDate = b.startDate ? parseDateString(b.startDate).getTime() : Infinity
                  return aDate - bDate
                } else if (sortFilter === 'latestStartDate') {
                  const aDate = a.startDate ? parseDateString(a.startDate).getTime() : -Infinity
                  const bDate = b.startDate ? parseDateString(b.startDate).getTime() : -Infinity
                  return bDate - aDate
                } else if (sortFilter === 'highestPriority') {
                const rank = (p?: TaskPriority) =>
                  !p ? -1 : p === 'urgent' ? 3 : p === 'high' ? 2 : p === 'medium' ? 1 : 0
                return rank(b.priority) - rank(a.priority)
            } else if (sortFilter === 'lowestPriority') {
                const rank = (p?: TaskPriority) =>
                  !p ? -1 : p === 'urgent' ? 3 : p === 'high' ? 2 : p === 'medium' ? 1 : 0
                return rank(a.priority) - rank(b.priority)
            } else if (sortFilter === 'highestPoints') {
                  return Number(b.storyPoints || 0) - Number(a.storyPoints || 0)
            } else if (sortFilter === 'lowestPoints') {
                  return Number(a.storyPoints || 0) - Number(b.storyPoints || 0)
                } else if (sortFilter === 'status') {
                  const aStatus = a.status || ''
                  const bStatus = b.status || ''
                  return aStatus.localeCompare(bStatus)
                } else if (sortFilter === 'category') {
                  const aCat = a.category || ''
                  const bCat = b.category || ''
                  return aCat.localeCompare(bCat)
                } else if (sortFilter === 'progressDesc') {
                  return calculateProgress(b) - calculateProgress(a)
                } else if (sortFilter === 'progressAsc') {
                  return calculateProgress(a) - calculateProgress(b)
                }
                return 0
              })
            }

            subtasks.forEach((subtask) => {
              const subtaskRow: TableRow = {
                id: subtask.id,
                type: 'subtask',
                data: subtask,
                parentId: task.id,
                level: 2,
                projectId: project.id,
                taskId: task.id,
              }
              
              // Check if subtask matches filters
              if (matchesFilters(subtaskRow) || filterShowOnly === 'projects' || filterShowOnly === 'tasks') {
                rows.push(subtaskRow)
              }
            })
          }
        })
      }

      // Add spacer row after each project (except the last one)
      if (projectIndex < projects.length - 1) {
        rows.push({ type: 'spacer' })
      }
    })

    return rows
  }

  const rows = buildTableRows()

// Format date for input (YYYY-MM-DD)
const formatDateForInput = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString + 'T00:00:00')
  return date.toISOString().split('T')[0]
}

// Parse date from input
const parseDateFromInput = (inputValue: string): string => {
  if (!inputValue) return ''
  return inputValue
}

// Simple Date Picker Component
const DatePicker = ({ 
  value, 
  onChange, 
  onClose,
  triggerRef,
  minDate,
  maxDate
}: { 
  value: string
  onChange: (date: string) => void
  onClose: () => void
  triggerRef?: React.RefObject<HTMLDivElement>
  minDate?: string
  maxDate?: string
}) => {
  // Parse value safely - handle invalid dates
  const parseDateValue = (dateStr: string): Date => {
    if (!dateStr || dateStr.trim() === '') {
      return new Date() // Default to today
    }
    
    // Handle YYYY-MM-DD format - parse in local timezone
    let dateString = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim()
    dateString = dateString.split(' ')[0].trim()
    
    // Validate date string format (should be YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      console.warn('Invalid date format in DatePicker:', dateStr)
      return new Date() // Default to today
    }
    
    // Create date in local timezone
    const parts = dateString.split('-')
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)
    
    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      console.warn('Invalid date values in DatePicker:', { year, month, day, dateString })
      return new Date() // Default to today
    }
    
    const date = new Date(year, month - 1, day)
    date.setHours(0, 0, 0, 0)
    
    // Validate the date object
    if (isNaN(date.getTime())) {
      console.warn('Invalid date object created in DatePicker:', { year, month, day, dateString })
      return new Date() // Default to today
    }
    
    return date
  }
  
  const [currentMonth, setCurrentMonth] = useState(parseDateValue(value))
  const pickerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  
  // Update currentMonth when value changes (and is valid)
  useEffect(() => {
    const parsed = parseDateValue(value)
    if (!isNaN(parsed.getTime())) {
      setCurrentMonth(parsed)
    }
  }, [value])
  
  useEffect(() => {
    if (triggerRef?.current && pickerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const pickerRect = pickerRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      let top = triggerRect.bottom + 4
      let left = triggerRect.left
      
      // Adjust if would go off right edge
      if (left + pickerRect.width > viewportWidth) {
        left = viewportWidth - pickerRect.width - 10
      }
      
      // Adjust if would go off bottom edge
      if (top + pickerRect.height > viewportHeight) {
        top = triggerRect.top - pickerRect.height - 4
      }
      
      // Ensure it doesn't go off left edge
      if (left < 10) {
        left = 10
      }
      
      setPosition({ top, left })
    }
  }, [triggerRef, currentMonth])
  
  // Ensure currentMonth is valid
  const validCurrentMonth = isNaN(currentMonth.getTime()) ? new Date() : currentMonth
  const year = validCurrentMonth.getFullYear()
  const month = validCurrentMonth.getMonth()
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  
  // Generate calendar days
  const days: (number | null)[] = []
  
  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push(null)
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }
  
  // Next month days to fill the grid
  const remainingDays = 42 - days.length // 6 rows × 7 days
  for (let i = 1; i <= remainingDays; i++) {
    days.push(null)
  }
  
  const handleDateClick = (day: number) => {
    const selectedDate = new Date(year, month, day)
    // Format as YYYY-MM-DD in local timezone (not UTC) to avoid timezone conversion issues
    const yearStr = selectedDate.getFullYear()
    const monthStr = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(selectedDate.getDate()).padStart(2, '0')
    const dateString = `${yearStr}-${monthStr}-${dayStr}`
    onChange(dateString)
    onClose()
  }
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(new Date(year, month + (direction === 'next' ? 1 : -1), 1))
  }
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  const selectedDate = value ? parseDateValue(value) : null
  // Validate selectedDate - if invalid, set to null
  const validSelectedDate = selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return (
    <div 
      ref={pickerRef}
      className="fixed z-[9999] bg-white border border-slate-300 rounded-lg shadow-xl p-3" 
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-1 hover:bg-slate-100 rounded transition-colors"
          type="button"
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-sm font-semibold text-slate-700">
          {monthNames[month]} {year}
        </div>
        <button
          onClick={() => navigateMonth('next')}
          className="p-1 hover:bg-slate-100 rounded transition-colors"
          type="button"
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map(day => (
          <div key={day} className="text-xs font-semibold text-slate-500 text-center py-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={idx} className="h-7" />
          }
          
          const dayDate = new Date(year, month, day)
          dayDate.setHours(0, 0, 0, 0)
          const isSelected = validSelectedDate && dayDate.getTime() === validSelectedDate.getTime()
          const isToday = dayDate.getTime() === today.getTime()
          
          // Check if date is outside allowed range
          let isDisabled = false
          if (minDate) {
            // Parse minDate in local timezone to avoid UTC conversion issues
            const minParts = minDate.split('-')
            const minDateObj = new Date(parseInt(minParts[0], 10), parseInt(minParts[1], 10) - 1, parseInt(minParts[2], 10))
            minDateObj.setHours(0, 0, 0, 0)
            if (dayDate < minDateObj) {
              isDisabled = true
            }
          }
          if (maxDate) {
            // Parse maxDate in local timezone to avoid UTC conversion issues
            const maxParts = maxDate.split('-')
            const maxDateObj = new Date(parseInt(maxParts[0], 10), parseInt(maxParts[1], 10) - 1, parseInt(maxParts[2], 10))
            maxDateObj.setHours(0, 0, 0, 0)
            
            // Debug logging for first day of each month
            if (day === 1 && idx < 7) {
              console.log('📅 DatePicker date check:', {
                dayDate: dayDate.toISOString().split('T')[0],
                maxDate,
                maxDateObj: maxDateObj.toISOString().split('T')[0],
                comparison: dayDate > maxDateObj,
                willDisable: dayDate > maxDateObj
              })
            }
            
            if (dayDate > maxDateObj) {
              isDisabled = true
            }
          }
          
          return (
            <button
              key={idx}
              onClick={() => !isDisabled && handleDateClick(day)}
              disabled={isDisabled}
              className={`h-7 w-7 text-xs rounded transition-colors ${
                isDisabled
                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                  : isSelected
                  ? 'bg-blue-600 text-white font-semibold'
                  : isToday
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              type="button"
            >
              {day}
            </button>
          )
        })}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-200">
        <button
          onClick={() => {
            const todayStr = new Date().toISOString().split('T')[0]
            onChange(todayStr)
            onClose()
          }}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          type="button"
        >
          Today
        </button>
        <button
          onClick={() => {
            onChange('')
            onClose()
          }}
          className="text-xs text-slate-600 hover:text-slate-700 font-medium"
          type="button"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

  const handleDeleteConfirm = () => {
    if (!deleteModal) return
    
    if (deleteModal.type === 'project') {
      deleteProject(deleteModal.id)
    } else if (deleteModal.type === 'task') {
      deleteTask(deleteModal.projectId!, deleteModal.id)
    } else if (deleteModal.type === 'subtask') {
      deleteSubtask(deleteModal.projectId!, deleteModal.taskId!, deleteModal.id)
    }
    
    setDeleteModal(null)
  }

  const getDeleteMessage = () => {
    if (!deleteModal) return ''
    
    if (deleteModal.type === 'project') {
      return `This will permanently delete the project "${deleteModal.name}" and all its tasks and subtasks. This action cannot be undone.`
    } else if (deleteModal.type === 'task') {
      return `This will permanently delete the task "${deleteModal.name}" and all its subtasks. This action cannot be undone.`
    } else {
      return `This will permanently delete the subtask "${deleteModal.name}". This action cannot be undone.`
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setDeleteModal(null)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full transform transition-all">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Confirm Deletion</h3>
                  <p className="text-sm text-slate-500 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                {getDeleteMessage()}
              </p>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full">
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Projects</h1>
              <p className="text-xs text-slate-600 mt-1">Jira-style table view of projects, tasks, and subtasks</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // Prevent double-clicks / double-calls
                  if (isCreatingProjectRef.current) {
                    console.warn('⚠️ Project creation already in progress, ignoring duplicate call')
                    return
                  }
                  isCreatingProjectRef.current = true
                  
                  try {
                    const newProject = addProject()
                    setEditingItem({ type: 'project', id: newProject.id })
                    setEditingName(newProject.name)
                    setRowsWithEmptyDates(prev => new Set([...prev, newProject.id]))
                    // Auto-expand to show the new project
                    setExpandedProjects(prev => new Set([...prev, newProject.id]))
                  } finally {
                    // Reset after a short delay to allow state updates to complete
                    setTimeout(() => {
                      isCreatingProjectRef.current = false
                    }, 100)
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-5 py-2.5 text-[12px] font-semibold tracking-[0.16em] text-white shadow-sm transition-all hover:bg-black hover:border-black hover:shadow-md active:scale-[0.99]"
              >
                <span className="text-sm leading-none">+</span>
                <span className="uppercase leading-none">New Project</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters & Sort */}
        <div className="px-4 py-3 bg-white border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            {/* Expand/Collapse Controls */}
            <div className="flex items-center gap-1 border-r border-slate-300 pr-3 mr-1">
              <button
                onClick={handleExpandAll}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors"
                title="Expand All"
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={handleCollapseAll}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors"
                title="Collapse All"
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            <button
                onClick={() => {
                  // Expand all projects but collapse all tasks
                  setExpandedProjects(new Set(projects.map(p => p.id)))
                  setExpandedTasks(new Set())
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors"
                title="Expand Projects Only"
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {/* Double chevron down to indicate expanding one level */}
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8l5 5 5-5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13l5 5 5-5" />
                </svg>
              </button>
        </div>

            {/* Project Selector */}
            <div className="relative">
            <button
                onClick={() => setShowProjectSelector(!showProjectSelector)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span>Projects: {selectedProjects.size === projects.length ? 'All' : `${selectedProjects.size}/${projects.length}`}</span>
                <svg className={`w-3 h-3 transition-transform ${showProjectSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
              
              {showProjectSelector && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowProjectSelector(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-slate-300 rounded-md shadow-lg max-h-64 overflow-y-auto min-w-[200px]">
                    <div className="p-2 border-b border-slate-200 sticky top-0 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-700">Select Projects</span>
                        <div className="flex gap-1">
            <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedProjects(new Set(projects.map(p => p.id)))
                            }}
                            className="text-[10px] px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            All
            </button>
            <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedProjects(new Set())
                            }}
                            className="text-[10px] px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            None
            </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      {projects.map((project) => (
                        <label
                          key={project.id}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProjects.has(project.id)}
                            onChange={(e) => {
                              e.stopPropagation()
                              setSelectedProjects(prev => {
                                const next = new Set(prev)
                                if (e.target.checked) {
                                  next.add(project.id)
                                } else {
                                  next.delete(project.id)
                                }
                                return next
                              })
                            }}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-xs text-slate-700 flex-1 truncate">{project.name || '(Untitled)'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={filterProjectName}
                onChange={(e) => setFilterProjectName(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
              />
              {filterProjectName && (
            <button
                  onClick={() => setFilterProjectName('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ×
            </button>
              )}
            </div>
            
            {/* Sort Dropdown */}
            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value as SortFilter)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[160px]"
            >
              <option value="none">Sort: Default</option>
              <optgroup label="Name">
                <option value="nameAsc">Name (A-Z)</option>
                <option value="nameDesc">Name (Z-A)</option>
              </optgroup>
              <optgroup label="Dates">
                <option value="closestDueDate">Due Date (Soonest)</option>
                <option value="furthestDueDate">Due Date (Latest)</option>
                <option value="earliestStartDate">Start Date (Earliest)</option>
                <option value="latestStartDate">Start Date (Latest)</option>
              </optgroup>
              <optgroup label="Priority">
                <option value="highestPriority">Priority (Highest)</option>
                <option value="lowestPriority">Priority (Lowest)</option>
              </optgroup>
              <optgroup label="Points">
                <option value="highestPoints">Points (Highest)</option>
                <option value="lowestPoints">Points (Lowest)</option>
              </optgroup>
              <optgroup label="Other">
                <option value="status">Status</option>
                <option value="category">Category</option>
                <option value="progressDesc">Progress (Highest)</option>
                <option value="progressAsc">Progress (Lowest)</option>
              </optgroup>
            </select>
            
            {/* Filter Dropdowns - Compact */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as GanttStatus | 'all')}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">Status: All</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">Priority: All</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priorityLabels[priority]}
                </option>
              ))}
            </select>
            
            <select
              value={filterDueDate}
              onChange={(e) => setFilterDueDate(e.target.value as typeof filterDueDate)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">Date: All</option>
              <option value="today">Due Today</option>
              <option value="thisWeek">Due This Week</option>
              <option value="thisMonth">Due This Month</option>
              <option value="overdue">Overdue</option>
            </select>
            
            {/* Clear All Filters */}
            {(filterProjectName || filterStatus !== 'all' || filterPriority !== 'all' || filterDueDate !== 'all' || sortFilter !== 'none' || (selectedProjects.size > 0 && selectedProjects.size < projects.length)) && (
            <button
                onClick={() => {
                  setFilterProjectName('')
                  setFilterStatus('all')
                  setFilterPriority('all')
                  setFilterCategory('all')
                  setFilterDueDate('all')
                  setFilterShowOnly('all')
                  setSortFilter('none')
                  setSelectedProjects(new Set(projects.map(p => p.id)))
                }}
                className="ml-auto px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-md border border-slate-300 transition-colors"
              >
                Clear All
            </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 bg-white">
            {/* Sticky Header */}
            <thead className="bg-slate-50 border-b-2 border-slate-300 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-300 min-w-[300px]">
                  Summary
                </th>
                <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-300 w-32">
                  Start Date
                </th>
                <th className="px-2 py-1 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-300 w-16">
                  Flag
                </th>
                <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-300 w-32">
                  Due Date
                </th>
                <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-300 w-28">
                  Category
                </th>
                <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-300 w-24">
                  Priority
                </th>
                <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-300 w-32">
                  Status
                </th>
                <th className="px-2 py-1 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-300 w-12">
                  Verified
                </th>
                <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-300 w-28">
                  <div className="inline-flex items-center gap-1">
                    <span>Estimate hours</span>
                    <div className="relative group">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-[9px] font-semibold text-slate-500">
                        i
                      </span>
                      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-52 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-normal text-slate-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="font-semibold mb-1 text-[10px] text-slate-800">Story point guide</p>
                        <ul className="space-y-0.5">
                          <li>0.5 pt = 30 min</li>
                          <li>1 pt = 1 hr</li>
                          <li>2 pt = 4 hrs</li>
                          <li>3 pt = 1 day</li>
                          <li>5 pts = 3 days</li>
                          <li>8 pts = 1 week</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </th>
                <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-300 w-24">
                  Time Spent
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-6 text-center text-xs text-slate-500">
                    No projects found. Create your first project!
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  // Handle spacer rows
                  if (row.type === 'spacer') {
                    return (
                      <tr key={`spacer-${index}`} className="h-2 bg-transparent">
                        <td colSpan={12} className="p-0 border-0"></td>
                      </tr>
                    )
                  }

                  // TypeScript now knows row is TableRow (not spacer)
                  const tableRow = row as TableRow
                  const isExpanded = tableRow.type === 'project' 
                    ? expandedProjects.has(tableRow.id)
                    : tableRow.type === 'task'
                    ? expandedTasks.has(tableRow.id)
                    : false
                  
                  const canExpand = tableRow.type === 'project' 
                    ? (tableRow.data as GanttProject)?.children.length > 0
                    : tableRow.type === 'task'
                    ? (tableRow.data as GanttTask)?.children.length > 0
                    : false

                  const name = tableRow.data?.name || ''
                  const category =
                    tableRow.type === 'project'
                      ? (tableRow.data as GanttProject).category || ''
                      : tableRow.type === 'task'
                      ? (tableRow.data as GanttTask).category || ''
                      : tableRow.type === 'subtask'
                      ? (tableRow.data as GanttSubtask).category || ''
                      : ''
                  
                  // Calculate dates based on row type
                  let startDate = ''
                  let endDate = ''
                  
                  if (tableRow.data) {
                    if (tableRow.type === 'subtask') {
                      // Subtasks: use their own dates (editable)
                      const subtask = tableRow.data as GanttSubtask
                      startDate = validateAndCleanDate(subtask.startDate)
                      endDate = validateAndCleanDate(subtask.endDate)
                  } else if (tableRow.type === 'task') {
                    // Tasks: use stored dates (now editable)
                    const task = tableRow.data as GanttTask
                    startDate = validateAndCleanDate(task.startDate)
                    endDate = validateAndCleanDate(task.endDate)
                  } else if (tableRow.type === 'project') {
                    // Projects: use stored dates (now editable)
                    const project = tableRow.data as GanttProject
                    startDate = validateAndCleanDate(project.startDate)
                    endDate = validateAndCleanDate(project.endDate)
                  }
                  }

                  // For newly created rows in this session, show empty dates until user selects them
                  if (rowsWithEmptyDates.has(tableRow.id)) {
                    startDate = ''
                    endDate = ''
                  }
                  
                  // If dates were invalid and cleared, update them in the database
                  if (tableRow.data) {
                    if (tableRow.type === 'subtask') {
                      const subtask = tableRow.data as GanttSubtask
                      if ((subtask.startDate && startDate === '') || (subtask.endDate && endDate === '')) {
                        // Invalid date was cleared, update the database
                        if (subtask.startDate && startDate === '') {
                          updateSubtask(tableRow.projectId, tableRow.taskId!, tableRow.id, { startDate: '' })
                        }
                        if (subtask.endDate && endDate === '') {
                          updateSubtask(tableRow.projectId, tableRow.taskId!, tableRow.id, { endDate: '' })
                        }
                      }
                    } else if (tableRow.type === 'task') {
                      const task = tableRow.data as GanttTask
                      if ((task.startDate && startDate === '') || (task.endDate && endDate === '')) {
                        // Invalid date was cleared, update the database
                        if (task.startDate && startDate === '') {
                          updateTask(tableRow.projectId, tableRow.id, { startDate: '' })
                        }
                        if (task.endDate && endDate === '') {
                          updateTask(tableRow.projectId, tableRow.id, { endDate: '' })
                        }
                      }
                    } else if (tableRow.type === 'project') {
                      const project = tableRow.data as GanttProject
                      if ((project.startDate && startDate === '') || (project.endDate && endDate === '')) {
                        // Invalid date was cleared, update the database
                        if (project.startDate && startDate === '') {
                          updateProject(tableRow.id, { startDate: '' })
                        }
                        if (project.endDate && endDate === '') {
                          updateProject(tableRow.id, { endDate: '' })
                        }
                      }
                    }
                  }
                  
                  // Check if item is completed
                  const itemStatus = tableRow.data ? getStatus(tableRow.data) : null
                  const isCompleted = itemStatus?.value === 'completed'
                  
                  const priority: TaskPriority | undefined = tableRow.data && (tableRow.type === 'project'
                    ? (tableRow.data as GanttProject).priority
                    : tableRow.type === 'task' 
                    ? (tableRow.data as GanttTask).priority
                    : tableRow.type === 'subtask'
                    ? (tableRow.data as GanttSubtask).priority
                    : undefined)
                  const hasPriority = !!priority
                  
                  // Calculate story points based on row type
                  let storyPoints: number | StoryPoint | undefined = 0
                  let taskTotalPoints = 0
                  let taskOwnPoints: number | StoryPoint | undefined = undefined
                  let projectTotalPoints = 0
                  
                  if (tableRow.data) {
                    if (tableRow.type === 'subtask') {
                      // Subtasks use their own story points value
                      storyPoints = (tableRow.data as GanttSubtask).storyPoints
                    } else if (tableRow.type === 'task') {
                      const task = tableRow.data as GanttTask
                      if (task.children && task.children.length > 0) {
                        // Tasks with subtasks: convert each subtask's story points to hours, then sum
                        // Direct mapping: 1 story point = 1 hour
                        const pointToHours = (pt: number): number => {
                          return pt
                        }
                        const totalHours = task.children.reduce((total, subtask) => {
                          return total + pointToHours(subtask.storyPoints || 0)
                        }, 0)
                        // Convert total hours back to a "points" value for display (using hours as points for calculation)
                        taskTotalPoints = totalHours
                      } else {
                        // Tasks without subtasks: use their own totalPoints value
                        // (set via handleFieldChange when clicking the buttons)
                        // @ts-expect-error GanttTask may have totalPoints in runtime data
                        taskOwnPoints = (task.totalPoints as StoryPoint | undefined) ?? undefined
                      }
                    } else if (tableRow.type === 'project') {
                      // Projects: convert each task's points to hours, then sum
                      // Direct mapping: 1 story point = 1 hour
                      const pointToHours = (pt: number): number => {
                        return pt
                      }
                      const project = tableRow.data as GanttProject
                      const totalHours = project.children.reduce((total, task) => {
                        if (task.children && task.children.length > 0) {
                          // Task with subtasks: sum subtasks' hours
                          const taskHours = task.children.reduce((subtotal, subtask) => {
                            return subtotal + pointToHours(subtask.storyPoints || 0)
                          }, 0)
                          return total + taskHours
                        }
                        // Task without subtasks: convert its totalPoints to hours
                        // @ts-expect-error GanttTask may carry totalPoints at runtime
                        const ownPoints = (task.totalPoints as number | undefined) || 0
                        return total + pointToHours(ownPoints)
                      }, 0)
                      // Use total hours as the "points" value for display
                      projectTotalPoints = totalHours
                    }
                  }
                  
                  const status = tableRow.data ? getStatus(tableRow.data) : { label: 'TO DO', color: 'bg-slate-100 text-slate-700 border-slate-300' }
                  const isSelected = selectedRow === tableRow.id

                  // Check if this row is being edited
                  const isEditing = editingItem && 
                    editingItem.type === tableRow.type && 
                    editingItem.id === tableRow.id &&
                    (editingItem.type !== 'subtask' || editingItem.taskId === tableRow.taskId)

                  // Different styling for each row type - matching Gantt V2.0 summary style
                  const getRowStyle = () => {
                    if (isEditing) {
                      return {
                        borderLeft: '4px solid #fbbf24', // yellow border when editing
                        backgroundColor: '#fef3c7', // yellow-100
                        fontWeight: '600' as const,
                      }
                    }
                    if (tableRow.type === 'project') {
                      return {
                        borderLeft: '4px solid #6b7280', // gray border for projects
                        backgroundColor: hoveredRow === tableRow.id ? '#f3f4f6' : '#f9fafb', // light gray bg
                        fontWeight: '600' as const, // semibold
                      }
                    } else if (tableRow.type === 'task') {
                      return {
                        borderLeft: '4px solid #3b82f6', // blue border for tasks
                        backgroundColor: hoveredRow === tableRow.id ? '#eff6ff' : '#f8fafc', // light blue bg
                        fontWeight: '500' as const, // medium
                      }
                    } else {
                      // subtask
                      return {
                        borderLeft: '4px solid #8b5cf6', // purple border for subtasks
                        backgroundColor: hoveredRow === tableRow.id ? '#f5f3ff' : '#fafafa', // light purple bg
                        fontWeight: '400' as const, // normal
                      }
                    }
                  }

                  const rowStyle = getRowStyle()

                  const isDragging = draggedRowId === tableRow.id
                  const showDropZoneAbove = dropZoneRowId === tableRow.id && dropZonePosition === 'above'
                  const showDropZoneBelow = dropZoneRowId === tableRow.id && dropZonePosition === 'below'
                  
                  return (
                    <React.Fragment key={tableRow.id}>
                      {/* Drop zone indicator above */}
                      {showDropZoneAbove && (
                        <tr>
                          <td colSpan={9} className="p-0 h-0">
                            <div className="h-1 bg-blue-500 mx-2 rounded-full" />
                          </td>
                        </tr>
                      )}
                      
                      <tr
                        data-row-id={tableRow.id}
                        draggable={!isEditing && tableRow.type !== 'empty-subtask'}
                        onDragStart={(e) => handleDragStart(e, tableRow)}
                        onDragOver={(e) => handleDragOver(e, tableRow)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, tableRow)}
                        onDragEnd={handleDragEnd}
                        className={`transition-colors cursor-pointer border-b border-slate-100 ${tableRow.type === 'project' ? 'bg-slate-50' : ''} ${isDragging ? 'opacity-50 cursor-grabbing' : tableRow.type !== 'empty-subtask' ? 'cursor-grab' : 'cursor-default'} ${showDropZoneAbove || showDropZoneBelow ? 'ring-2 ring-blue-500' : ''} ${isCompleted ? 'line-through decoration-2 opacity-60' : ''} ${isEditing ? 'ring-2 ring-yellow-500' : ''}`}
                        style={rowStyle}
                        onClick={() => setSelectedRow(tableRow.id)}
                        onMouseEnter={() => setHoveredRow(tableRow.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                      {/* Summary */}
                      <td className="px-4 py-1.5 text-xs border border-slate-300" style={{ width: '300px', minWidth: '300px', maxWidth: '300px' }}>
                        <div className="flex items-center justify-between gap-1.5 relative">
                          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                            {/* Indentation with visual guide */}
                            <div 
                              className="flex items-center"
                              style={{ width: tableRow.level * 20 }}
                            >
                              {tableRow.level > 0 && (
                                <div 
                                  className="h-full border-l-2 border-dashed border-slate-300"
                                  style={{ width: '1px', marginRight: '8px' }}
                                />
                              )}
                            </div>
                            
                            {/* Type indicator icon - matching Gantt V2.0 style */}
                            <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                              {tableRow.type === 'project' && (
                                <div className="w-2 h-2 rounded-full bg-slate-500" />
                              )}
                              {tableRow.type === 'task' && (
                                <div className="w-2 h-2 rounded bg-blue-500" />
                              )}
                              {tableRow.type === 'subtask' && (
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                              )}
                            </div>

                            {/* Chevron for expandable items */}
                            {canExpand ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (tableRow.type === 'project') {
                                    toggleProject(tableRow.id)
                                  } else if (tableRow.type === 'task') {
                                    toggleTask(tableRow.id)
                                  }
                                }}
                                className="flex-shrink-0 p-0.5 hover:bg-slate-200 rounded transition-colors"
                              >
                                <svg
                                  className="w-4 h-4 text-slate-500 transition-transform"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            ) : (
                              <div className="w-5" /> // Spacer for alignment
                            )}

                            {/* Name with type label - matching Gantt V2.0 style */}
                            <div 
                              className="flex-1 min-w-0 text-sm flex items-center gap-2"
                              style={{ 
                                color: tableRow.type === 'project' ? '#1f2937' : tableRow.type === 'task' ? '#1e40af' : '#6b21a8',
                                fontWeight: rowStyle.fontWeight,
                              }}
                            >
                              <span className="text-xs font-bold uppercase tracking-wider opacity-60 flex-shrink-0">
                                {tableRow.type === 'project' ? 'PROJECT' : tableRow.type === 'task' ? 'TASK' : 'SUBTASK'}
                              </span>
                              {isEditing ? (
                                <input
                                  ref={nameInputRef}
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onBlur={handleSaveName}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      handleSaveName()
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault()
                                      handleCancelEdit()
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-slate-900 bg-white border-2 border-yellow-400 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 min-w-[150px] flex-1"
                                  style={{ fontWeight: rowStyle.fontWeight }}
                                />
                              ) : (
                                <span 
                                  className="truncate cursor-text hover:text-blue-600 transition-colors min-w-0"
                                  style={{ fontWeight: rowStyle.fontWeight }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation()
                                    setEditingItem({
                                      type: tableRow.type,
                                      id: tableRow.id,
                                      projectId: tableRow.projectId,
                                      taskId: tableRow.taskId,
                                    })
                                    setEditingName(name)
                                  }}
                                  title="Double-click to edit"
                                >
                                  {name || '(Untitled)'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Add Buttons - Only show on hover, positioned absolutely to not affect layout */}
                          {hoveredRow === tableRow.id && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-0.5 flex-shrink-0 bg-white pl-2" onClick={(e) => e.stopPropagation()}>
                              {/* Move Up/Down Buttons */}
                              <div className="flex items-center gap-0 border-r border-slate-300 pr-1 mr-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMoveUp(tableRow)
                                  }}
                                  disabled={!canMoveUp(tableRow)}
                                  className={`p-0.5 rounded transition-colors ${
                                    canMoveUp(tableRow)
                                      ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                      : 'text-slate-300 cursor-not-allowed'
                                  }`}
                                  title="Move Up"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMoveDown(tableRow)
                                  }}
                                  disabled={!canMoveDown(tableRow)}
                                  className={`p-0.5 rounded transition-colors ${
                                    canMoveDown(tableRow)
                                      ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                      : 'text-slate-300 cursor-not-allowed'
                                  }`}
                                  title="Move Down"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>

                              {tableRow.type === 'project' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const newTask = addTask(tableRow.id)
                                      setEditingItem({ type: 'task', id: newTask.id, projectId: tableRow.id })
                                      setEditingName(newTask.name)
                                      setRowsWithEmptyDates(prev => new Set([...prev, newTask.id]))
                                      // Auto-expand the project to show the new task
                                      if (!expandedProjects.has(tableRow.id)) {
                                        setExpandedProjects(prev => new Set([...prev, tableRow.id]))
                                      }
                                    }}
                                    className="text-[10px] text-slate-500 hover:text-blue-600 bg-white hover:bg-white px-1.5 py-0.5 rounded border border-dashed border-slate-300 hover:border-blue-400 transition-colors flex items-center gap-0.5"
                                    title="Add Task"
                                  >
                                    <span>+</span>
                                    <span>Add Task</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeleteModal({
                                        type: 'project',
                                        id: tableRow.id,
                                        name: name,
                                      })
                                    }}
                                    className="text-[10px] text-slate-500 hover:text-red-600 bg-white hover:bg-white px-1 py-0.5 rounded border border-slate-300 hover:border-red-400 transition-colors flex items-center gap-0.5"
                                    title="Delete Project"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                              {tableRow.type === 'task' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const newSubtask = addSubtask(tableRow.projectId, tableRow.id)
                                      setEditingItem({ type: 'subtask', id: newSubtask.id, projectId: tableRow.projectId, taskId: tableRow.id })
                                      setEditingName(newSubtask.name)
                                      setRowsWithEmptyDates(prev => new Set([...prev, newSubtask.id]))
                                      // Auto-expand the task to show the new subtask
                                      if (!expandedTasks.has(tableRow.id)) {
                                        setExpandedTasks(prev => new Set([...prev, tableRow.id]))
                                      }
                                      // Also ensure project is expanded
                                      if (!expandedProjects.has(tableRow.projectId)) {
                                        setExpandedProjects(prev => new Set([...prev, tableRow.projectId]))
                                      }
                                    }}
                                    className="text-[10px] text-slate-500 hover:text-purple-600 bg-white hover:bg-white px-1.5 py-0.5 rounded border border-dashed border-slate-300 hover:border-purple-400 transition-colors flex items-center gap-0.5"
                                    title="Add Subtask"
                                  >
                                    <span>+</span>
                                    <span>Add Subtask</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeleteModal({
                                        type: 'task',
                                        id: tableRow.id,
                                        name: name,
                                        projectId: tableRow.projectId,
                                      })
                                    }}
                                    className="text-[10px] text-slate-500 hover:text-red-600 bg-white hover:bg-white px-1 py-0.5 rounded border border-slate-300 hover:border-red-400 transition-colors flex items-center gap-0.5"
                                    title="Delete Task"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                              {tableRow.type === 'subtask' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteModal({
                                      type: 'subtask',
                                      id: tableRow.id,
                                      name: name,
                                      projectId: tableRow.projectId,
                                      taskId: tableRow.taskId,
                                    })
                                  }}
                                  className="text-[10px] text-slate-500 hover:text-red-600 bg-white hover:bg-white px-1 py-0.5 rounded border border-slate-300 hover:border-red-400 transition-colors flex items-center gap-0.5"
                                  title="Delete Subtask"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Start Date */}
                      <td 
                        className={`px-2 py-1 text-xs text-slate-700 border border-slate-300 ${tableRow.type === 'project' ? 'font-bold' : tableRow.type === 'task' ? 'font-bold' : ''} cursor-text hover:bg-blue-50 hover:border-blue-300 transition-colors group`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingDateField({ rowId: tableRow.id, field: 'startDate' })
                        }}
                      >
                        {editingDateField?.rowId === tableRow.id && editingDateField?.field === 'startDate' ? (
                          <div className="relative date-picker-container" data-date-picker>
                            <div 
                              ref={datePickerTriggerRef}
                              className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs border border-blue-400 rounded bg-white"
                            >
                              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-slate-700">
                                {startDate ? formatJiraDate(startDate) : 'Select date'}
                              </span>
                            </div>
                            {(() => {
                              // Get parent dates for min/max constraints
                              let minDate: string | undefined = undefined
                              let maxDate: string | undefined = undefined
                              
                              if (tableRow.type === 'task') {
                                // For tasks, use project dates
                                const parentProject = projects.find(p => p.id === tableRow.projectId)
                                if (parentProject?.startDate && parentProject?.endDate) {
                                  minDate = parentProject.startDate
                                  maxDate = parentProject.endDate
                                }
                              } else if (tableRow.type === 'subtask') {
                                // For subtasks, use task dates, but also respect project dates
                                const parentProject = projects.find(p => p.id === tableRow.projectId)
                                const parentTask = parentProject?.children?.find(t => t.id === tableRow.taskId)
                                
                                if (parentTask?.startDate && parentTask?.endDate) {
                                  minDate = parentTask.startDate
                                  // Use the earlier of task endDate or project endDate
                                  if (parentProject?.endDate) {
                                    maxDate = parentTask.endDate < parentProject.endDate ? parentTask.endDate : parentProject.endDate
                                  } else {
                                    maxDate = parentTask.endDate
                                  }
                                } else if (parentProject?.startDate && parentProject?.endDate) {
                                  // Fallback to project dates if task doesn't have dates
                                  minDate = parentProject.startDate
                                  maxDate = parentProject.endDate
                                }
                              }
                              
                              return (
                                <DatePicker
                                  value={startDate || ''}
                                  onChange={(date) => {
                                    if (date && date !== startDate) {
                                      handleFieldChange('startDate', date, tableRow)
                                    }
                                    setEditingDateField(null)
                                  }}
                                  onClose={() => setEditingDateField(null)}
                                  triggerRef={datePickerTriggerRef}
                                  minDate={minDate}
                                  maxDate={maxDate}
                                />
                              )
                            })()}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="group-hover:text-blue-700 transition-colors">
                              {startDate ? formatJiraDate(startDate) : '-'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Due Date Flag */}
                      <td className={`px-2 py-1 text-center border border-slate-300 ${tableRow.type === 'project' ? 'font-bold' : tableRow.type === 'task' ? 'font-bold' : ''}`}>
                        {(() => {
                          // Check if item is completed
                          const itemStatus = tableRow.data ? getStatus(tableRow.data) : null
                          const isCompleted = itemStatus?.value === 'completed'
                          const isRefinement = itemStatus?.value === 'refinement'
                          
                          // If refinement status, show blue flag
                          if (isRefinement) {
                            return (
                              <div className="flex items-center justify-center" title="Refinement">
                                <svg 
                                  className="w-5 h-5 text-blue-600" 
                                  fill="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M3 2v20h2V2H3zm3 0h15l-3 4 3 4H6V2z" />
                                </svg>
                              </div>
                            )
                          }
                          
                          // Ensure we have a valid endDate string
                          const validEndDate = endDate && endDate.trim() !== '' ? endDate : ''
                          const flag = getDueDateFlag(validEndDate)
                          
                          // If completed, show checkered flag (racing flag)
                          if (isCompleted) {
                            return (
                              <div className="flex items-center justify-center" title="Completed">
                                <svg 
                                  className="w-5 h-5 text-green-600" 
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  {/* Flag pole */}
                                  <rect x="2" y="2" width="1.5" height="20" fill="currentColor" className="text-slate-700"/>
                                  {/* Checkered flag - alternating black and white squares in a 4x5 grid */}
                                  {/* White background */}
                                  <rect x="4" y="2" width="18" height="20" fill="white"/>
                                  {/* Black squares - checkered pattern */}
                                  <g fill="black">
                                    {/* Row 1: squares at positions 0, 2 */}
                                    <rect x="4" y="2" width="4.5" height="4" fill="black"/>
                                    <rect x="13" y="2" width="4.5" height="4" fill="black"/>
                                    {/* Row 2: squares at positions 1, 3 */}
                                    <rect x="8.5" y="6" width="4.5" height="4" fill="black"/>
                                    <rect x="17.5" y="6" width="4.5" height="4" fill="black"/>
                                    {/* Row 3: squares at positions 0, 2 */}
                                    <rect x="4" y="10" width="4.5" height="4" fill="black"/>
                                    <rect x="13" y="10" width="4.5" height="4" fill="black"/>
                                    {/* Row 4: squares at positions 1, 3 */}
                                    <rect x="8.5" y="14" width="4.5" height="4" fill="black"/>
                                    <rect x="17.5" y="14" width="4.5" height="4" fill="black"/>
                                    {/* Row 5: squares at positions 0, 2 */}
                                    <rect x="4" y="18" width="4.5" height="4" fill="black"/>
                                    <rect x="13" y="18" width="4.5" height="4" fill="black"/>
                                  </g>
                                </svg>
                              </div>
                            )
                          }
                          
                          // If not completed and no flag, show dash
                          if (!flag) {
                            return <span className="text-slate-300">-</span>
                          }
                          
                          // Show regular flag for non-completed items
                          return (
                            <div className="flex items-center justify-center" title={flag.label}>
                              <svg 
                                className={`w-5 h-5 ${flag.color}`} 
                                fill="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path d="M3 2v20h2V2H3zm3 0h15l-3 4 3 4H6V2z" />
                              </svg>
                            </div>
                          )
                        })()}
                      </td>

                      {/* Due Date */}
                      <td 
                        className={`px-2 py-1 text-xs text-slate-700 border border-slate-300 ${tableRow.type === 'project' ? 'font-bold' : tableRow.type === 'task' ? 'font-bold' : ''} cursor-text hover:bg-blue-50 hover:border-blue-300 transition-colors group`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingDateField({ rowId: tableRow.id, field: 'endDate' })
                        }}
                      >
                        {editingDateField?.rowId === tableRow.id && editingDateField?.field === 'endDate' ? (
                          <div className="relative date-picker-container" data-date-picker>
                            <div 
                              ref={datePickerTriggerRef}
                              className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs border border-blue-400 rounded bg-white"
                            >
                              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-slate-700">
                                {endDate ? formatJiraDate(endDate) : 'Select date'}
                              </span>
                            </div>
                            {(() => {
                              // Get parent dates for min/max constraints
                              let minDate: string | undefined = undefined
                              let maxDate: string | undefined = undefined
                              
                              if (tableRow.type === 'task') {
                                // For tasks, use project dates
                                const parentProject = projects.find(p => p.id === tableRow.projectId)
                                if (parentProject?.startDate && parentProject?.endDate) {
                                  minDate = parentProject.startDate
                                  maxDate = parentProject.endDate
                                  console.log('📅 DatePicker for task endDate:', {
                                    taskId: tableRow.id,
                                    taskName: (tableRow.data as GanttTask)?.name,
                                    projectId: tableRow.projectId,
                                    projectName: parentProject?.name,
                                    projectStartDate: parentProject.startDate,
                                    projectEndDate: parentProject.endDate,
                                    currentEndDate: endDate,
                                    willUseMaxDate: maxDate
                                  })
                                } else {
                                  console.warn('⚠️ Parent project missing dates:', {
                                    projectId: tableRow.projectId,
                                    projectName: parentProject?.name,
                                    hasStartDate: !!parentProject?.startDate,
                                    hasEndDate: !!parentProject?.endDate
                                  })
                                }
                              } else if (tableRow.type === 'subtask') {
                                // For subtasks, use task dates, but also respect project dates
                                const parentProject = projects.find(p => p.id === tableRow.projectId)
                                const parentTask = parentProject?.children?.find(t => t.id === tableRow.taskId)
                                
                                if (parentTask?.startDate && parentTask?.endDate) {
                                  minDate = parentTask.startDate
                                  // Use the earlier of task endDate or project endDate
                                  if (parentProject?.endDate) {
                                    maxDate = parentTask.endDate < parentProject.endDate ? parentTask.endDate : parentProject.endDate
                                  } else {
                                    maxDate = parentTask.endDate
                                  }
                                } else if (parentProject?.startDate && parentProject?.endDate) {
                                  // Fallback to project dates if task doesn't have dates
                                  minDate = parentProject.startDate
                                  maxDate = parentProject.endDate
                                }
                              }
                              
                              return (
                                <DatePicker
                                  value={endDate || ''}
                                  onChange={(date) => {
                                    if (date && date !== endDate) {
                                      handleFieldChange('endDate', date, tableRow)
                                    }
                                    setEditingDateField(null)
                                  }}
                                  onClose={() => setEditingDateField(null)}
                                  triggerRef={datePickerTriggerRef}
                                  minDate={minDate}
                                  maxDate={maxDate}
                                />
                              )
                            })()}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="group-hover:text-blue-700 transition-colors">
                              {endDate ? formatJiraDate(endDate) : '-'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className={`px-2 py-1 text-xs text-slate-700 border border-slate-300 ${tableRow.type === 'project' ? 'font-bold' : tableRow.type === 'task' ? 'font-bold' : ''}`}>
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                          <div
                            className={`relative rounded-md border-2 min-w-[110px] ${
                              category
                                ? categoryColors[category] || 'bg-slate-100 text-slate-700 border-slate-300'
                                : 'bg-slate-50 text-slate-500 border-slate-300'
                            }`}
                          >
                            <select
                              value={category || ''}
                              onChange={(e) => {
                                e.stopPropagation()
                                const newCategory = e.target.value
                                if (tableRow.type === 'project') {
                                  updateProject(tableRow.id, { category: newCategory })
                                } else if (tableRow.type === 'task') {
                                  updateTask(tableRow.projectId, tableRow.id, { category: newCategory })
                                } else if (tableRow.type === 'subtask') {
                                  updateSubtask(tableRow.projectId, tableRow.taskId!, tableRow.id, { category: newCategory })
                                }
                              }}
                              className="text-xs font-semibold px-1.5 py-0.5 w-full hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition-all appearance-none bg-transparent border-0 pr-6"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="">-</option>
                              {CATEGORY_OPTIONS.map((opt) => (
                                <option key={opt} value={opt} className="bg-white text-slate-800">
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <div
                              className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
                              style={{ width: '12px', height: '12px' }}
                            >
                              <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 8l4 4 4-4" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className={`px-2 py-1 text-xs border border-slate-300 ${tableRow.type === 'task' ? 'font-bold' : ''}`}>
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                          <div
                            className={`relative rounded-md border-2 min-w-[80px] ${
                              hasPriority
                                ? priorityColors[priority!]
                                : 'bg-slate-50 text-slate-500 border-slate-300'
                            }`}
                          >
                            <select
                              value={priority || ''}
                              onChange={(e) => {
                                e.stopPropagation()
                                const value = e.target.value as TaskPriority | ''
                                if (!value) {
                                  // Do not set a priority when '-' is selected
                                  return
                                }
                                const newPriority = value as TaskPriority
                                if (tableRow.type === 'project') {
                                  updateProject(tableRow.id, { priority: newPriority })
                                } else if (tableRow.type === 'task') {
                                  updateTask(tableRow.projectId, tableRow.id, { priority: newPriority })
                                } else if (tableRow.type === 'subtask') {
                                  updateSubtask(tableRow.projectId, tableRow.taskId!, tableRow.id, { priority: newPriority })
                                }
                              }}
                              className="text-xs font-semibold px-1.5 py-0.5 w-full hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition-all appearance-none bg-transparent border-0 pr-6"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="" disabled>
                                -
                              </option>
                              {PRIORITIES.map((p) => (
                                <option key={p} value={p} className="bg-white">
                                  {priorityLabels[p]}
                                </option>
                              ))}
                            </select>
                            <div
                              className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
                              style={{
                                width: '12px',
                                height: '12px',
                              }}
                            >
                              <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 8l4 4 4-4" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className={`px-2 py-1 text-xs border border-slate-300 ${tableRow.type === 'project' ? 'font-bold' : tableRow.type === 'task' ? 'font-bold' : ''}`}>
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                          <div
                            className={`relative rounded-md border-2 min-w-[80px] ${status.color}`}
                          >
                            <select
                              value={status.value}
                              onChange={(e) => {
                                e.stopPropagation()
                                handleFieldChange('status', e.target.value, tableRow)
                              }}
                              className="text-xs font-semibold px-1.5 py-0.5 w-full hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition-all appearance-none bg-transparent border-0 pr-6"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} className="bg-white">
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <div
                              className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
                              style={{ width: '12px', height: '12px' }}
                            >
                              <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 8l4 4 4-4" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Verified Checkbox */}
                      <td className={`px-2 py-1 text-xs border border-slate-300 text-center ${tableRow.type === 'project' ? 'font-bold' : tableRow.type === 'task' ? 'font-bold' : ''}`}>
                        {(() => {
                          // Calculate verified status based on row type
                          let isVerified = false
                          let isEditable = true
                          
                          if (tableRow.type === 'project') {
                            // Projects: verified if ALL tasks are verified
                            const project = tableRow.data as GanttProject
                            const tasks = project.children || []
                            if (tasks.length > 0) {
                              isVerified = tasks.every(task => {
                                // For tasks with subtasks, check if all subtasks are verified
                                if (task.children && task.children.length > 0) {
                                  return task.children.every(subtask => subtask.verified === true)
                                }
                                // For tasks without subtasks, check task's verified status
                                return task.verified === true
                              })
                            }
                            isEditable = false // Projects are never editable
                          } else if (tableRow.type === 'task') {
                            const task = tableRow.data as GanttTask
                            // Check if task has subtasks
                            const hasSubtasks = task.children && task.children.length > 0
                            
                            if (hasSubtasks) {
                              // Task with subtasks: verified if ALL subtasks are verified
                              isVerified = task.children!.every(subtask => subtask.verified === true)
                              isEditable = false // Not editable if has subtasks
                            } else {
                              // Task without subtasks: use task's own verified status
                              isVerified = task.verified === true
                              isEditable = true // Editable if no subtasks
                            }
                          } else if (tableRow.type === 'subtask') {
                            // Subtasks: always editable, use their own verified status
                            const subtask = tableRow.data as GanttSubtask
                            isVerified = subtask.verified === true
                            isEditable = true
                          }
                          
                          return (
                            <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isVerified}
                                disabled={!isEditable}
                                onChange={(e) => {
                                  if (isEditable) {
                                    e.stopPropagation()
                                    handleFieldChange('verified', e.target.checked, tableRow)
                                  }
                                }}
                                className={`w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 ${
                                  isEditable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!isEditable) {
                                    e.preventDefault()
                                  }
                                }}
                                title={!isEditable ? (tableRow.type === 'project' ? 'Auto-verified when all tasks are verified' : 'Auto-verified when all subtasks are verified') : ''}
                              />
                            </div>
                          )
                        })()}
                      </td>

                      {/* Estimate hours */}
                      <td className={`px-2 py-1 text-xs border border-slate-300 ${tableRow.type === 'project' ? 'font-bold' : tableRow.type === 'task' ? 'font-bold' : ''}`}>
                        {(() => {
                          const itemStatus = tableRow.data ? getStatus(tableRow.data) : null
                          const isRefinement = itemStatus?.value === 'refinement'
                          
                          if (isRefinement) {
                            // Show disabled state for refinement items
                            return (
                              <div className="flex items-center justify-center">
                                <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-bold bg-slate-200 text-slate-400 border-2 border-slate-300 cursor-not-allowed">
                                  -
                                </span>
                              </div>
                            )
                          }
                          
                          return tableRow.type === 'subtask' ? (
                          // Show hour dropdown for subtasks
                          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={storyPointsToHours(storyPoints) || ''}
                              onChange={(e) => {
                                e.stopPropagation()
                                const selectedHours = e.target.value ? parseFloat(e.target.value) : undefined
                                if (selectedHours !== undefined) {
                                  const newPoints = hoursToStoryPoints(selectedHours)
                                  if (newPoints !== storyPoints) {
                                    handleFieldChange('storyPoints', newPoints, tableRow)
                                  }
                                } else {
                                  handleFieldChange('storyPoints', undefined, tableRow)
                                }
                              }}
                              className="text-xs px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="">-</option>
                              {HOUR_OPTIONS.map((option) => (
                                <option key={option.hours} value={option.hours}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : tableRow.type === 'task' ? (
                          (() => {
                            const task = tableRow.data as GanttTask
                            const hasSubtasks = task.children && task.children.length > 0

                            if (!hasSubtasks) {
                              // Tasks without subtasks: allow direct hour selection (dropdown)
                              // taskOwnPoints is already stored as hours (1:1 mapping)
                              const currentHours = taskOwnPoints ? taskOwnPoints : undefined
                              return (
                                <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={currentHours || ''}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      const selectedHours = e.target.value ? parseFloat(e.target.value) : undefined
                                      if (selectedHours !== undefined) {
                                        const newPoints = hoursToStoryPoints(selectedHours)
                                        if (newPoints !== taskOwnPoints) {
                                          handleFieldChange('storyPoints', newPoints, tableRow)
                                        }
                                      } else {
                                        handleFieldChange('storyPoints', undefined, tableRow)
                                      }
                                    }}
                                    className="text-xs px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="">-</option>
                                    {HOUR_OPTIONS.map((option) => (
                                      <option key={option.hours} value={option.hours}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )
                            }

                            // Tasks with subtasks: show total points in a circle
                            return (
                              <div className="flex items-center justify-center">
                                <span
                                  className={`inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-bold ${
                                    taskTotalPoints > 0
                                      ? 'bg-blue-600 text-white border-2 border-blue-700'
                                      : 'bg-slate-200 text-slate-500 border-2 border-slate-300'
                                  }`}
                                >
                                  {taskTotalPoints > 0 ? taskTotalPoints : '-'}
                                </span>
                              </div>
                            )
                          })()
                        ) : (
                          // Show total points in a circle for projects
                          <div className="flex items-center justify-center">
                            <span className={`inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-bold ${
                              projectTotalPoints > 0 
                                ? 'bg-slate-700 text-white border-2 border-slate-800' 
                                : 'bg-slate-200 text-slate-500 border-2 border-slate-300'
                            }`}>
                              {projectTotalPoints > 0 ? projectTotalPoints : '-'}
                            </span>
                          </div>
                        )
                        })()}
                      </td>

                      {/* Time Spent */}
                      <td className={`px-2 py-1 text-xs text-slate-700 border border-slate-300 ${tableRow.type === 'project' ? 'font-bold' : tableRow.type === 'task' ? 'font-bold' : ''}`}>
                        -
                      </td>
                    </tr>
                    
                    {/* Drop zone indicator below */}
                    {showDropZoneBelow && (
                      <tr>
                        <td colSpan={10} className="p-0 h-0">
                          <div className="h-1 bg-blue-500 mx-2 rounded-full" />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}









