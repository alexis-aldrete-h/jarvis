'use client'

import React, { useMemo } from 'react'
import { Task, TaskPriority, TaskStatus, GanttProject, GanttTask, GanttSubtask, GanttStatus } from '@jarvis/shared'
import { formatDate, getWeekStart, getWeekEnd } from '@jarvis/shared'
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts'

type ViewType = "dashboard" | "board" | "weeklyplan" | "focus" | "projects2" | "ganttv2"

interface TasksDashboardProps {
  tasks: Task[]
  projects: GanttProject[]
  onNavigateToView: (view: ViewType) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  updateGanttTask?: (projectId: string, taskId: string, updates: Partial<GanttTask>) => void
}

const POMODORO_DURATION_MINUTES = 30

const priorityColors: Record<TaskPriority, { bg: string; text: string; border: string; dot: string }> = {
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  medium: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  urgent: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
}

export default function TasksDashboard({
  tasks,
  projects,
  onNavigateToView,
  updateTask,
  updateGanttTask,
}: TasksDashboardProps) {
  const today = new Date()
  const todayString = today.toISOString().split('T')[0]
  const weekStart = getWeekStart(today)
  const weekEnd = getWeekEnd(today)

  // Calculate metrics
  const metrics = useMemo(() => {
    // Task metrics
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length
    const todoTasks = tasks.filter(t => t.status === 'todo').length
    const sprintTasks = tasks.filter(t => (t as any).status === 'sprint').length
    const todayTasks = tasks.filter(t => t.dueDate === todayString && t.status !== 'completed').length

    // Project metrics
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => {
      const hasActiveTasks = p.children?.some(t => 
        t.status === 'active' || t.status === 'sprint' || t.status === 'today'
      )
      return hasActiveTasks
    }).length
    const completedProjects = projects.filter(p => p.status === 'completed').length

    // Gantt task metrics
    let totalGanttTasks = 0
    let completedGanttTasks = 0
    let activeGanttTasks = 0
    let overdueGanttTasks = 0

    projects.forEach(project => {
      project.children?.forEach(task => {
        totalGanttTasks++
        if (task.status === 'completed') {
          completedGanttTasks++
        } else if (task.status === 'active' || task.status === 'sprint' || task.status === 'today') {
          activeGanttTasks++
        }
        if (task.endDate && task.endDate < todayString && task.status !== 'completed') {
          overdueGanttTasks++
        }
      })
    })

    // Time tracking
    const totalPomodoros = tasks.reduce((sum, t) => sum + ((t as any).pomodorosCompleted || 0), 0)
    const totalTimeWorked = totalPomodoros * POMODORO_DURATION_MINUTES
    const hoursWorked = Math.floor(totalTimeWorked / 60)
    const minutesWorked = totalTimeWorked % 60

    // Upcoming deadlines (next 7 days)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    const nextWeekString = nextWeek.toISOString().split('T')[0]

    const upcomingDeadlines = tasks.filter(t => {
      if (!t.dueDate || t.status === 'completed') return false
      return t.dueDate >= todayString && t.dueDate <= nextWeekString
    }).sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0
      return a.dueDate.localeCompare(b.dueDate)
    }).slice(0, 5)

    const upcomingGanttDeadlines = projects.flatMap(project =>
      (project.children || []).filter(task => {
        if (!task.endDate || task.status === 'completed') return false
        return task.endDate >= todayString && task.endDate <= nextWeekString
      }).map(task => ({ project, task }))
    ).sort((a, b) => {
      if (!a.task.endDate || !b.task.endDate) return 0
      return a.task.endDate.localeCompare(b.task.endDate)
    }).slice(0, 5)

    // High priority items
    const highPriorityTasks = tasks
      .filter(t => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'completed')
      .sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      .slice(0, 5)

    // Weekly progress
    const weekTasks = tasks.filter(t => {
      if (!t.dueDate) return false
      const taskDate = new Date(t.dueDate)
      return taskDate >= weekStart && taskDate <= weekEnd
    })
    const weekCompleted = weekTasks.filter(t => t.status === 'completed').length
    const weekProgress = weekTasks.length > 0 ? (weekCompleted / weekTasks.length) * 100 : 0

    // Category mapping: map actual category names (including Spanish) to standardized names
    const categoryMapping: Record<string, string> = {
      // Spanish variations
      'marca personal': 'Personal Brand',
      'piloto': 'Pilot',
      'silke': 'Wife',
      'pendientes': 'Finances', // Assuming Pendientes is financial tasks
      // English variations
      'personal brand': 'Personal Brand',
      'pilot': 'Pilot',
      'wife': 'Wife',
      'personal': 'Personal',
      'health - body': 'Health - Body',
      'health - mind': 'Health - Mind',
      'marketing business': 'Marketing Business',
      'fun': 'Fun',
      'finances': 'Finances',
      'relations': 'Relations',
      'chores': 'Chores',
    }
    
    // Standardized category list for the radar chart
    const allCategories = [
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
    ]
    
    // Helper function to normalize category name
    const normalizeCategory = (category: string | undefined): string | undefined => {
      if (!category) return undefined
      const normalized = category.trim().toLowerCase()
      return categoryMapping[normalized] || category.trim() // Return original if no mapping found
    }

    // Helper function to determine if a task is completed
    // ONLY count tasks that are explicitly marked as completed - no date-based guessing
    const isTaskCompleted = (
      status: string | undefined, 
      verified: boolean | undefined
    ): boolean => {
      // Only count as completed if explicitly marked
      if (status === 'completed') return true
      if (verified === true) return true
      
      // Don't use date-based completion - only explicit completion counts
      return false
    }

    // Collect all tasks from both sources with proper completion detection and normalized categories
    // IMPORTANT: Only count top-level tasks, not subtasks (subtasks are part of their parent task)
    const allTasks: Array<{ category?: string; originalCategory?: string; status: string; isCompleted: boolean; source: string; id: string }> = [
      // Regular tasks (these are top-level)
      ...tasks.map(t => {
        const normalized = normalizeCategory(t.category)
        return { 
          id: t.id,
          category: normalized, 
          originalCategory: t.category,
          status: t.status,
          isCompleted: t.status === 'completed',
          source: 'regular'
        }
      }),
      // Gantt tasks from projects (these are top-level tasks, not subtasks)
      ...projects.flatMap(p => (p.children || []).map(t => {
        const status = t.status || ''
        // Only count as completed if explicitly marked as completed or verified
        const isCompleted = isTaskCompleted(t.status, t.verified)
        const taskCategory = t.category || p.category
        const normalized = normalizeCategory(taskCategory)
        return { 
          id: t.id,
          category: normalized,
          originalCategory: taskCategory,
          status,
          isCompleted,
          source: 'gantt-task'
        }
      })),
      // NOTE: We're NOT counting subtasks separately - they're part of their parent task
      // If you want to count subtasks, uncomment below, but typically subtasks shouldn't be counted separately
      // ...projects.flatMap(p => 
      //   (p.children || []).flatMap(t => 
      //     (t.children || []).map(st => {
      //       const status = st.status || t.status || ''
      //       const isCompleted = isTaskCompleted(st.status, st.verified, st.endDate)
      //       const subtaskCategory = st.category || t.category || p.category
      //       const normalized = normalizeCategory(subtaskCategory)
      //       return { 
      //         id: st.id,
      //         category: normalized,
      //         originalCategory: subtaskCategory,
      //         status,
      //         isCompleted,
      //         source: 'gantt-subtask'
      //       }
      //     })
      //   )
      // ),
    ]
    
    // Remove duplicates based on task ID (in case same task appears in both regular and gantt)
    const uniqueTasks = allTasks.reduce((acc, task) => {
      // Use source + id as unique key
      const key = `${task.source}-${task.id}`
      if (!acc.has(key)) {
        acc.set(key, task)
      }
      return acc
    }, new Map<string, typeof allTasks[0]>())
    
    const deduplicatedTasks = Array.from(uniqueTasks.values())
    
    // Debug: Log all completed tasks by category (both normalized and original)
    const completedTasksByCategory = deduplicatedTasks
      .filter(t => t.isCompleted && (t.category || t.originalCategory))
      .reduce((acc, task) => {
        const cat = task.category || task.originalCategory || 'uncategorized'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(task)
        return acc
      }, {} as Record<string, typeof deduplicatedTasks>)
    
    console.log('=== TASK COMPLETION DEBUG ===')
    console.log('Completed tasks by normalized category:', completedTasksByCategory)
    console.log('All completed tasks with details:', deduplicatedTasks
      .filter(t => t.isCompleted)
      .map(t => ({ 
        id: t.id,
        original: t.originalCategory, 
        normalized: t.category, 
        source: t.source,
        status: t.status
      }))
    )
    console.log('Total completed tasks (deduplicated):', deduplicatedTasks.filter(t => t.isCompleted).length)
    console.log('Total tasks (deduplicated):', deduplicatedTasks.length)
    console.log('============================')

    // Calculate task completion metrics per exact category
    const categoryMetrics = allCategories.map(categoryName => {
      // Filter tasks that belong to this exact category (case-insensitive exact match)
      const groupTasks = deduplicatedTasks.filter(task => {
        const taskCategory = (task.category || '').trim()
        // Exact match (case-insensitive)
        return taskCategory.toLowerCase() === categoryName.toLowerCase()
      })
      
      const totalTasks = groupTasks.length
      const completedTasks = groupTasks.filter(t => t.isCompleted).length
      
      // Debug logging for each category
      if (totalTasks > 0) {
        const completedDetails = groupTasks
          .filter(t => t.isCompleted)
          .map(t => ({ 
            id: t.id,
            status: t.status, 
            source: t.source, 
            category: t.category,
            originalCategory: t.originalCategory
          }))
        console.log(`Category "${categoryName}": ${completedTasks}/${totalTasks} completed`, completedDetails)
      }
      
      const inProgressTasks = groupTasks.filter(t => 
        t.status === 'in-progress' || 
        t.status === 'active' || 
        t.status === 'sprint' || 
        t.status === 'today'
      ).length
      
      // Calculate completion rate (0-100%)
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      
      // Normalize to 0-16 scale (matching the reference image)
      // 100% completion = 16, 0% completion = 0
      const score = Math.round((completionRate / 100) * 16)
      
      return {
        category: categoryName,
        value: score,
        completionRate: Math.round(completionRate),
        tasks: totalTasks,
        completedTasks,
        inProgressTasks,
      }
    }).filter(cat => cat.tasks > 0) // Only show categories that have tasks

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      sprintTasks,
      todayTasks,
      totalProjects,
      activeProjects,
      completedProjects,
      totalGanttTasks,
      completedGanttTasks,
      activeGanttTasks,
      overdueGanttTasks,
      totalPomodoros,
      hoursWorked,
      minutesWorked,
      upcomingDeadlines,
      upcomingGanttDeadlines,
      highPriorityTasks,
      weekTasks,
      weekCompleted,
      weekProgress,
      categoryMetrics,
    }
  }, [tasks, projects, todayString, weekStart, weekEnd])

  // Prepare radar chart data
  const radarData = useMemo(() => {
    return metrics.categoryMetrics.map(cat => ({
      category: cat.category,
      value: cat.value,
      fullMark: 16,
    }))
  }, [metrics.categoryMetrics])

  // Calculate average score
  const averageScore = useMemo(() => {
    if (radarData.length === 0) return 0
    const sum = radarData.reduce((acc, item) => acc + item.value, 0)
    return (sum / radarData.length).toFixed(1)
  }, [radarData])

  const completionRate = metrics.totalTasks > 0 
    ? (metrics.completedTasks / metrics.totalTasks) * 100 
    : 0

  const projectProgress = metrics.totalGanttTasks > 0
    ? (metrics.completedGanttTasks / metrics.totalGanttTasks) * 100
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-600 mt-2 text-lg">Your productivity overview at a glance</p>
          </div>
          <button
            onClick={() => onNavigateToView('board')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View All Tasks
          </button>
        </div>

        {/* Radar Chart - Primary Hero Element */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-slate-700 p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center bg-slate-700/50">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-slate-200">Task Completion by Category</h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Average Completion</p>
              <p className="text-3xl font-bold text-slate-100">{averageScore}/16</p>
              <p className="text-xs text-slate-400 mt-1">
                {((parseFloat(averageScore) / 16) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#475569" strokeWidth={1} />
                <PolarAngleAxis 
                  dataKey="category" 
                  tick={{ fill: '#cbd5e1', fontSize: 14, fontWeight: 'bold' }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 16]} 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickCount={9}
                />
                <Radar
                  name="Activity"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '2px solid #475569',
                    borderRadius: '12px',
                    color: '#cbd5e1',
                    padding: '12px',
                  }}
                  labelStyle={{ color: '#f1f5f9', fontWeight: 'bold', fontSize: '14px' }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                  formatter={(value: number, name: string, props: any) => {
                    const category = metrics.categoryMetrics.find(c => c.category === props.payload.category)
                    if (!category) return [value, '']
                    const completionPercent = category.completionRate
                    return [
                      `${value}/16 (${completionPercent}%)`,
                      `${category.completedTasks}/${category.tasks} tasks completed`
                    ]
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Task completion rate</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {metrics.categoryMetrics.map(cat => (
                <div key={cat.category} className="flex items-center gap-1.5">
                  <span className="text-slate-500">{cat.category}:</span>
                  <span className="font-semibold text-slate-300">
                    {cat.value}/16 ({cat.completionRate}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics - Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Tasks Card */}
          <div className="group relative bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/50 to-blue-50/50 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600">Total Tasks</p>
                <p className="text-4xl font-bold text-slate-900">{metrics.totalTasks}</p>
                <div className="flex items-center gap-2 pt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-slate-600">
                      {metrics.completedTasks} done
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-emerald-600">
                    {completionRate.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Tasks Card */}
          <div className="group relative bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100/50 to-amber-50/50 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600">Today's Focus</p>
                <p className="text-4xl font-bold text-slate-900">{metrics.todayTasks}</p>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-slate-500">Due today</span>
                  {metrics.todayTasks > 0 && (
                    <>
                      <span className="text-xs text-slate-400">•</span>
                      <button
                        onClick={() => onNavigateToView('focus')}
                        className="text-xs font-medium text-amber-600 hover:text-amber-700"
                      >
                        View →
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active Projects Card */}
          <div className="group relative bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100/50 to-purple-50/50 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600">Active Projects</p>
                <p className="text-4xl font-bold text-slate-900">{metrics.activeProjects}</p>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-slate-500">
                    of {metrics.totalProjects} total
                  </span>
                  {metrics.activeProjects > 0 && (
                    <>
                      <span className="text-xs text-slate-400">•</span>
                      <button
                        onClick={() => onNavigateToView('projects2')}
                        className="text-xs font-medium text-purple-600 hover:text-purple-700"
                      >
                        View →
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Time Worked Card */}
          <div className="group relative bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100/50 to-emerald-50/50 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600">Time Worked</p>
                <p className="text-4xl font-bold text-slate-900">
                  {metrics.hoursWorked > 0 ? `${metrics.hoursWorked}h ` : ''}{metrics.minutesWorked}m
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-slate-500">
                    {metrics.totalPomodoros} sessions
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Progress Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Task Progress</h3>
                <p className="text-sm text-slate-500 mt-1">Overall completion status</p>
              </div>
              <button
                onClick={() => onNavigateToView('board')}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                View All →
              </button>
            </div>
            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">Completion Rate</span>
                  <span className="text-lg font-bold text-slate-900">{completionRate.toFixed(1)}%</span>
                </div>
                <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-600">{metrics.completedTasks}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1.5 uppercase tracking-wide">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{metrics.inProgressTasks}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1.5 uppercase tracking-wide">In Progress</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-400">{metrics.todoTasks}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1.5 uppercase tracking-wide">To Do</p>
                </div>
              </div>
            </div>
          </div>

          {/* Project Progress Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Project Progress</h3>
                <p className="text-sm text-slate-500 mt-1">Project task completion</p>
              </div>
              <button
                onClick={() => onNavigateToView('projects2')}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                View Projects →
              </button>
            </div>
            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">Overall Progress</span>
                  <span className="text-lg font-bold text-slate-900">{projectProgress.toFixed(1)}%</span>
                </div>
                <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${projectProgress}%` }}
                  />
                </div>
              </div>
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900">{metrics.totalGanttTasks}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1.5 uppercase tracking-wide">Total Tasks</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">{metrics.activeGanttTasks}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1.5 uppercase tracking-wide">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-600">{metrics.completedGanttTasks}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1.5 uppercase tracking-wide">Completed</p>
                </div>
              </div>
              {/* Overdue Alert */}
              {metrics.overdueGanttTasks > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/60 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-red-900">
                        {metrics.overdueGanttTasks} Overdue Task{metrics.overdueGanttTasks !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-red-700 mt-0.5">Requires immediate attention</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Weekly Progress & Quick Actions Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Progress */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Weekly Progress</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {formatDate(weekStart)} - {formatDate(weekEnd)}
                </p>
              </div>
              <button
                onClick={() => onNavigateToView('weeklyplan')}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                View Plan →
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">Week Completion</span>
                  <span className="text-lg font-bold text-slate-900">
                    {metrics.weekCompleted} / {metrics.weekTasks.length}
                  </span>
                </div>
                <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${metrics.weekProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => onNavigateToView('focus')}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-50/50 border border-blue-200/60 rounded-xl hover:from-blue-100 hover:to-blue-50 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-900">Today's Plan</span>
              </button>
              <button
                onClick={() => onNavigateToView('weeklyplan')}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-50/50 border border-purple-200/60 rounded-xl hover:from-purple-100 hover:to-purple-50 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-900">Weekly Plan</span>
              </button>
              <button
                onClick={() => onNavigateToView('ganttv2')}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200/60 rounded-xl hover:from-emerald-100 hover:to-emerald-50 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-900">Gantt Chart</span>
              </button>
              <button
                onClick={() => onNavigateToView('projects2')}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-amber-50/50 border border-amber-200/60 rounded-xl hover:from-amber-100 hover:to-amber-50 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-900">Projects Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Alerts and Priorities Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Upcoming Deadlines</h3>
                <p className="text-sm text-slate-500 mt-1">Next 7 days</p>
              </div>
            </div>
            <div className="space-y-3">
              {metrics.upcomingDeadlines.length === 0 && metrics.upcomingGanttDeadlines.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600">All clear!</p>
                  <p className="text-xs text-slate-500 mt-1">No upcoming deadlines</p>
                </div>
              ) : (
                <>
                  {metrics.upcomingDeadlines.map((task) => {
                    const priority = priorityColors[task.priority]
                    return (
                      <div
                        key={task.id}
                        className="group flex items-center gap-4 p-4 bg-slate-50/50 border border-slate-200/60 rounded-xl hover:bg-slate-100/50 hover:border-slate-300/60 transition-all duration-200 cursor-pointer"
                        onClick={() => onNavigateToView('board')}
                      >
                        <div className={`w-2 h-2 rounded-full ${priority.dot} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${priority.bg} ${priority.text} ${priority.border} border`}>
                              {task.priority}
                            </span>
                            <span className="text-xs text-slate-500">
                              {task.dueDate ? formatDate(new Date(task.dueDate)) : 'No date'}
                            </span>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )
                  })}
                  {metrics.upcomingGanttDeadlines.map(({ project, task }) => (
                    <div
                      key={`${project.id}-${task.id}`}
                      className="group flex items-center gap-4 p-4 bg-slate-50/50 border border-slate-200/60 rounded-xl hover:bg-slate-100/50 hover:border-slate-300/60 transition-all duration-200 cursor-pointer"
                      onClick={() => onNavigateToView('projects2')}
                    >
                      <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{task.name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-slate-500">{project.name}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">
                            {task.endDate ? formatDate(new Date(task.endDate)) : 'No date'}
                          </span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* High Priority Tasks */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">High Priority</h3>
                <p className="text-sm text-slate-500 mt-1">Urgent & important tasks</p>
              </div>
              <button
                onClick={() => onNavigateToView('board')}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3">
              {metrics.highPriorityTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600">All good!</p>
                  <p className="text-xs text-slate-500 mt-1">No high priority tasks</p>
                </div>
              ) : (
                metrics.highPriorityTasks.map((task) => {
                  const priority = priorityColors[task.priority]
                  return (
                    <div
                      key={task.id}
                      className="group flex items-center gap-4 p-4 bg-slate-50/50 border border-slate-200/60 rounded-xl hover:bg-slate-100/50 hover:border-slate-300/60 transition-all duration-200 cursor-pointer"
                      onClick={() => onNavigateToView('board')}
                    >
                      <div className={`w-2 h-2 rounded-full ${priority.dot} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${priority.bg} ${priority.text} ${priority.border} border`}>
                            {task.priority}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                            {task.status}
                          </span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
